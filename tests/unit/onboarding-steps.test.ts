// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ConsentPurpose } from "@/generated/prisma";
import { nextHrefAfter, ONBOARDING_STEPS, onboardingProgress, READY_STEPS } from "@/lib/onboarding";
import { saveUserConditions } from "@/lib/onboarding/conditions";
import { activeSymptomIds, saveUserSymptoms, symptomsForUser } from "@/lib/onboarding/symptoms";
import { saveProfile } from "@/lib/profile";
import { recordConsentDecisions } from "@/lib/profile/consent";

import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * Fictional conditions and symptoms. Nothing here names a real person, and the test data
 * deliberately does not lean on the seed script — the seed is someone else's file and this
 * suite has to be able to run against an empty database.
 */
async function seedPicklists() {
  const [alpha, beta] = await Promise.all([
    testDb.condition.create({
      data: { name: "Condition Alpha", slug: "condition-alpha", summary: "A fictional condition." },
    }),
    testDb.condition.create({
      data: { name: "Condition Beta", slug: "condition-beta", summary: "Another fictional one." },
    }),
  ]);

  const tiredness = await testDb.symptom.create({
    data: {
      name: "Tiredness",
      slug: "tiredness",
      conditions: { create: [{ conditionId: alpha.id }, { conditionId: beta.id }] },
    },
  });
  const aches = await testDb.symptom.create({
    data: { name: "Aches", slug: "aches", conditions: { create: [{ conditionId: alpha.id }] } },
  });
  const dizziness = await testDb.symptom.create({
    data: { name: "Dizziness", slug: "dizziness", conditions: { create: [{ conditionId: beta.id }] } },
  });

  return { alpha, beta, tiredness, aches, dizziness };
}

async function giveTrackingConsent(userId: string) {
  await recordConsentDecisions(userId, { [ConsentPurpose.core_tracking]: true });
}

describe("the onboarding step registry", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("is the flow the brief asks for, in order", () => {
    expect(ONBOARDING_STEPS.map((step) => step.key)).toEqual([
      "welcome",
      "consent",
      "conditions",
      "symptoms",
      "treatments",
      "baseline",
    ]);
  });

  it("registers a step that is not built yet rather than leaving it out", () => {
    // Which steps are built changes as milestones land — treatments and baseline both have
    // now — so this asserts the rule, not a snapshot of who has finished what. Every step is
    // registered with a real screen whether or not it is built.
    for (const step of ONBOARDING_STEPS) {
      expect(step.href).toMatch(/^\/onboarding\//);
      expect(["ready", "coming_soon"]).toContain(step.status);
    }
    expect(READY_STEPS.length).toBeGreaterThan(0);
  });

  it("starts a brand new person at the beginning, with nothing assumed", async () => {
    const user = await makeUser();
    const progress = await onboardingProgress(user.id);

    expect(progress.steps.every((state) => !state.complete)).toBe(true);
    expect(progress.completedCount).toBe(0);
    expect(progress.readyCount).toBe(READY_STEPS.length);
    expect(progress.finished).toBe(false);
    expect(progress.nextHref).toBe("/onboarding/welcome");
  });
});

describe("working through onboarding", () => {
  beforeEach(resetDatabase);

  it("saves each step as it is finished, and resumes from what was saved", async () => {
    const user = await makeUser();
    const { alpha, tiredness } = await seedPicklists();

    await saveProfile(user.id, {
      displayName: "Sam",
      yearOfBirth: 1974,
      sex: null,
      region: "North West",
    });
    expect((await onboardingProgress(user.id)).nextHref).toBe("/onboarding/consent");

    await giveTrackingConsent(user.id);
    expect((await onboardingProgress(user.id)).nextHref).toBe("/onboarding/conditions");

    await saveUserConditions(user.id, [
      { conditionId: alpha.id, diagnosedYear: 2019, selfReported: false },
    ]);
    expect((await onboardingProgress(user.id)).nextHref).toBe("/onboarding/symptoms");

    await saveUserSymptoms(user.id, [tiredness.id]);

    // Nothing was held in a session: this is a fresh read of what is in the database, which
    // is what closing the tab and coming back next week actually looks like.
    const progress = await onboardingProgress(user.id);
    expect(progress.completedCount).toBe(4);
    expect(progress.finished).toBe(false);

    // Whatever remains is the next step in the flow that has not been done, never one that
    // has. The later steps are covered by the milestones that own them.
    const remaining = progress.steps.filter((state) => state.step.status === "ready" && !state.complete);
    expect(progress.nextHref).toBe(remaining[0]?.step.href ?? null);
    expect(remaining.map((state) => state.step.key)).not.toContain("symptoms");
  });

  it("sends somebody on to the next step they have not done", async () => {
    const user = await makeUser();
    const { alpha, tiredness } = await seedPicklists();

    await saveProfile(user.id, { displayName: "Sam", yearOfBirth: null, sex: null, region: null });
    await giveTrackingConsent(user.id);
    await saveUserConditions(user.id, [
      { conditionId: alpha.id, diagnosedYear: null, selfReported: true },
    ]);
    await saveUserSymptoms(user.id, [tiredness.id]);

    expect(await nextHrefAfter(user.id, "symptoms")).toBe("/onboarding/treatments");
    expect(await nextHrefAfter(user.id, "treatments")).toBe("/onboarding/baseline");

    // Reaching the end without having done the last step sends somebody back to the first
    // thing still outstanding rather than round in a loop or nowhere at all.
    expect(await nextHrefAfter(user.id, "baseline")).toBe("/onboarding/treatments");
  });

  it("does not count a step as done because a later one is", async () => {
    const user = await makeUser();
    const { alpha } = await seedPicklists();

    await giveTrackingConsent(user.id);
    await saveUserConditions(user.id, [
      { conditionId: alpha.id, diagnosedYear: null, selfReported: true },
    ]);

    const progress = await onboardingProgress(user.id);
    expect(progress.steps.find((state) => state.step.key === "welcome")?.complete).toBe(false);
    expect(progress.nextHref).toBe("/onboarding/welcome");
  });

  it("reopens the consent step if tracking consent is withdrawn later", async () => {
    const user = await makeUser();
    await saveProfile(user.id, { displayName: "Sam", yearOfBirth: null, sex: null, region: null });
    await giveTrackingConsent(user.id);

    await recordConsentDecisions(user.id, { [ConsentPurpose.core_tracking]: false });

    const progress = await onboardingProgress(user.id);
    expect(progress.steps.find((state) => state.step.key === "consent")?.complete).toBe(false);
    expect(progress.nextHref).toBe("/onboarding/consent");
  });
});

describe("conditions and symptoms", () => {
  beforeEach(resetDatabase);

  it("records the year of diagnosis and whether it was self-reported", async () => {
    const user = await makeUser();
    const { alpha, beta } = await seedPicklists();

    await saveUserConditions(user.id, [
      { conditionId: alpha.id, diagnosedYear: 2019, selfReported: false },
      { conditionId: beta.id, diagnosedYear: null, selfReported: true },
    ]);

    const rows = await testDb.userCondition.findMany({
      where: { userId: user.id },
      orderBy: { conditionId: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.conditionId === alpha.id)).toMatchObject({
      diagnosedYear: 2019,
      selfReported: false,
    });
    expect(rows.find((row) => row.conditionId === beta.id)).toMatchObject({
      diagnosedYear: null,
      selfReported: true,
    });
  });

  it("offers only the symptoms that belong to the conditions someone chose", async () => {
    const user = await makeUser();
    const { beta } = await seedPicklists();

    await saveUserConditions(user.id, [
      { conditionId: beta.id, diagnosedYear: null, selfReported: true },
    ]);

    const offered = (await symptomsForUser(user.id)).map((symptom) => symptom.name);
    expect(offered.sort()).toEqual(["Dizziness", "Tiredness"]);
  });

  it("stops tracking a symptom without deleting what was recorded against it", async () => {
    const user = await makeUser();
    const { alpha, tiredness, aches } = await seedPicklists();

    await saveUserConditions(user.id, [
      { conditionId: alpha.id, diagnosedYear: null, selfReported: true },
    ]);
    await saveUserSymptoms(user.id, [tiredness.id, aches.id]);
    await saveUserSymptoms(user.id, [tiredness.id]);

    expect(await activeSymptomIds(user.id)).toEqual([tiredness.id]);

    // The row survives. Somebody's own history is not ours to quietly delete.
    const dropped = await testDb.userSymptom.findFirstOrThrow({
      where: { userId: user.id, symptomId: aches.id },
    });
    expect(dropped.active).toBe(false);
  });

  it("stops asking about a symptom when the condition it belonged to is removed", async () => {
    const user = await makeUser();
    const { alpha, beta, tiredness, dizziness } = await seedPicklists();

    await saveUserConditions(user.id, [
      { conditionId: alpha.id, diagnosedYear: null, selfReported: true },
      { conditionId: beta.id, diagnosedYear: null, selfReported: true },
    ]);
    await saveUserSymptoms(user.id, [tiredness.id, dizziness.id]);

    await saveUserConditions(user.id, [
      { conditionId: alpha.id, diagnosedYear: null, selfReported: true },
    ]);

    // Dizziness only belonged to Beta, so it goes quiet. Tiredness belongs to both and stays.
    expect(await activeSymptomIds(user.id)).toEqual([tiredness.id]);
    expect(await testDb.userCondition.count({ where: { userId: user.id } })).toBe(1);
  });
});
