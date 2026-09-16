// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ONBOARDING_STEPS, onboardingProgress, READY_STEPS } from "@/lib/onboarding";
import { saveProfile } from "@/lib/profile";
import { recordConsentDecisions } from "@/lib/profile/consent";
import { saveUserConditions } from "@/lib/onboarding/conditions";
import { saveUserSymptoms } from "@/lib/onboarding/symptoms";
import {
  baselineVersion,
  createDraftVersion,
  createQuestionnaire,
  publishVersion,
  saveResponse,
} from "@/lib/questionnaires";
import { hasBaselineResponse, saveBaselineResponse } from "@/lib/questionnaires/baseline";
import { BASELINE_STEP_STATUS, hasCompletedBaseline } from "@/lib/questionnaires/onboarding-step";

import { makeUser, resetDatabase, testDb } from "../helpers/db";
import { SEEDED_WELLBEING } from "./questionnaire-fixtures";

/**
 * The baseline onboarding step.
 *
 * The rule under test is acceptance criterion 6: completion is scoped to the version used
 * for baselines, and a general check-in answered later — against the very same version —
 * must not retroactively satisfy it.
 */

const LICENCE = "Placeholder written for UnTouchable. Not a validated clinical instrument.";

const COMPLETE = {
  overall_health: "7",
  daily_activities: "6",
  sleep_quality: "4",
  mood: "5",
  coping: "mostly",
};

async function publishBaseline(key = "general-wellbeing", baseline = true) {
  const questionnaire = await createQuestionnaire({ key, title: "How you have been getting on", licenceNote: LICENCE });
  const draft = await createDraftVersion(questionnaire.id, {
    items: SEEDED_WELLBEING.itemsJson,
    scoring: SEEDED_WELLBEING.scoringJson,
    redFlags: SEEDED_WELLBEING.redFlagRulesJson,
    schedule: { ...(SEEDED_WELLBEING.scheduleJson as object), baseline },
  });
  const published = await publishVersion(draft.id);
  if (!published.ok) throw new Error("could not publish the baseline");
  return { questionnaire, version: published.version };
}

describe("finding the baseline version", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("is whichever published version declares itself the baseline — no key is hard coded", async () => {
    await publishBaseline("some-other-questionnaire", false);
    const { version } = await publishBaseline("the-one-we-use", true);

    expect((await baselineVersion())?.id).toBe(version.id);
  });

  it("is null when nothing published claims the baseline", async () => {
    await publishBaseline("general-wellbeing", false);
    expect(await baselineVersion()).toBeNull();
  });

  it("never picks a draft", async () => {
    const questionnaire = await createQuestionnaire({ key: "draft-only", title: "Draft", licenceNote: LICENCE });
    await createDraftVersion(questionnaire.id, {
      items: SEEDED_WELLBEING.itemsJson,
      scoring: SEEDED_WELLBEING.scoringJson,
      redFlags: [],
      schedule: { baseline: true },
    });
    expect(await baselineVersion()).toBeNull();
  });
});

describe("completing the baseline step", () => {
  beforeEach(resetDatabase);

  it("is a step that is built", () => {
    expect(BASELINE_STEP_STATUS).toBe("ready");
    expect(ONBOARDING_STEPS.at(-1)?.key).toBe("baseline");
  });

  it("is not complete before it is answered, and is complete after", async () => {
    const user = await makeUser();
    await publishBaseline();

    expect(await hasCompletedBaseline(user.id)).toBe(false);

    const saved = await saveBaselineResponse(user.id, COMPLETE);
    expect(saved.ok).toBe(true);

    expect(await hasCompletedBaseline(user.id)).toBe(true);
  });

  it("is honestly incomplete when nothing is published to answer", async () => {
    const user = await makeUser();
    expect(await hasCompletedBaseline(user.id)).toBe(false);
  });

  it("is NOT satisfied by a general check-in answered later against the same version", async () => {
    const user = await makeUser();
    const { version } = await publishBaseline();

    const checkIn = await testDb.scheduledCheckIn.create({
      data: { userId: user.id, questionnaireVersionId: version.id, dueAt: new Date() },
    });
    const answered = await saveResponse({
      userId: user.id,
      versionId: version.id,
      answers: COMPLETE,
      checkInId: checkIn.id,
    });
    expect(answered.ok).toBe(true);

    // A response exists, against exactly the baseline version — and the baseline is still
    // not done, because it was a scheduled check-in and not the onboarding answer.
    expect(await testDb.response.count({ where: { userId: user.id } })).toBe(1);
    expect(await hasCompletedBaseline(user.id)).toBe(false);
  });

  it("does not count somebody else's baseline", async () => {
    const [user, other] = await Promise.all([makeUser(), makeUser()]);
    await publishBaseline();
    await saveBaselineResponse(other.id, COMPLETE);

    expect(await hasBaselineResponse(user.id)).toBe(false);
    expect(await hasBaselineResponse(other.id)).toBe(true);
  });

  it("reopens when the baseline questions are replaced with a new version", async () => {
    const user = await makeUser();
    const { questionnaire } = await publishBaseline();
    await saveBaselineResponse(user.id, COMPLETE);
    expect(await hasCompletedBaseline(user.id)).toBe(true);

    const next = await createDraftVersion(questionnaire.id, {
      items: [{ key: "overall_health", type: "scale_0_10", label: "How has your health been?", required: true }],
      scoring: { method: "sum", items: ["overall_health"] },
      redFlags: [],
      schedule: { baseline: true },
    });
    await publishVersion(next.id);

    // Different questions, so the honest answer is that this person has not answered them.
    expect(await hasCompletedBaseline(user.id)).toBe(false);
  });

  it("finishes onboarding once the baseline is done", async () => {
    const user = await makeUser();
    await publishBaseline();

    const condition = await testDb.condition.create({
      data: { name: "Condition Alpha", slug: "condition-alpha", summary: "A fictional condition." },
    });
    const symptom = await testDb.symptom.create({
      data: { name: "Tiredness", slug: "tiredness", conditions: { create: [{ conditionId: condition.id }] } },
    });

    await saveProfile(user.id, { displayName: "Sam", yearOfBirth: null, sex: null, region: null });
    await recordConsentDecisions(user.id, { core_tracking: true });
    await saveUserConditions(user.id, [{ conditionId: condition.id, diagnosedYear: null, selfReported: true }]);
    await saveUserSymptoms(user.id, [symptom.id]);
    // The treatments step belongs to another milestone. Mark it done the way that milestone
    // does, so this test is about the baseline and not about how far they have got.
    await testDb.profile.update({
      where: { userId: user.id },
      data: { treatmentsConfirmedAt: new Date() },
    });

    const before = await onboardingProgress(user.id);
    expect(before.finished).toBe(false);
    expect(before.nextHref).toBe("/onboarding/baseline");

    await saveBaselineResponse(user.id, COMPLETE);

    const after = await onboardingProgress(user.id);
    expect(after.finished).toBe(true);
    expect(after.nextHref).toBeNull();
    expect(after.completedCount).toBe(READY_STEPS.length);
  });
});
