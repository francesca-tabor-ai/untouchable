// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  createDraftVersion,
  createQuestionnaire,
  loadVersion,
  publishedVersionOf,
  publishVersion,
  PublishedVersionError,
  responseHistory,
  saveResponse,
  updateDraftVersion,
} from "@/lib/questionnaires";
import {
  createNextVersionDraft,
  createQuestionnaireDraft,
  publishVersionDraft,
  saveVersionDraft,
  type VersionFormValues,
} from "@/lib/questionnaires/admin";

import { makeUser, resetDatabase, testDb } from "../helpers/db";
import { EVERY_ITEM_TYPE, SEEDED_WELLBEING } from "./questionnaire-fixtures";

/**
 * Versions, publication and responses, against a real database.
 *
 * The two rules being proved here are the ones that make a longitudinal record worth
 * anything: a published version never changes, and every response names the exact version it
 * answers.
 */

const LICENCE =
  "Placeholder written for UnTouchable. Not a validated clinical instrument and not comparable to one.";

async function makeQuestionnaire(key = "wellbeing", raw = SEEDED_WELLBEING) {
  const questionnaire = await createQuestionnaire({ key, title: "How you have been getting on", licenceNote: LICENCE });
  const draft = await createDraftVersion(questionnaire.id, {
    items: raw.itemsJson,
    scoring: raw.scoringJson,
    redFlags: raw.redFlagRulesJson,
    schedule: raw.scheduleJson,
  });
  return { questionnaire, draft };
}

async function publishedQuestionnaire(key = "wellbeing", raw = SEEDED_WELLBEING) {
  const { questionnaire, draft } = await makeQuestionnaire(key, raw);
  const published = await publishVersion(draft.id);
  if (!published.ok) throw new Error(`could not publish: ${JSON.stringify(published.problems)}`);
  return { questionnaire, version: published.version };
}

const COMPLETE = {
  overall_health: "7",
  daily_activities: "6",
  sleep_quality: "4",
  mood: "5",
  coping: "mostly",
};

describe("publishing a version", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("numbers each new version one above the last, and never reuses a row", async () => {
    const { questionnaire, draft } = await makeQuestionnaire();
    await publishVersion(draft.id);
    const second = await createDraftVersion(questionnaire.id, {
      items: SEEDED_WELLBEING.itemsJson,
      scoring: SEEDED_WELLBEING.scoringJson,
      redFlags: [],
      schedule: {},
    });

    expect(second.version).toBe(2);
    expect(second.id).not.toBe(draft.id);
    expect(await testDb.questionnaireVersion.count({ where: { questionnaireId: questionnaire.id } })).toBe(2);
  });

  it("refuses to change a version once it is published", async () => {
    const { version } = await publishedQuestionnaire();

    await expect(
      updateDraftVersion(version.id, { items: [], scoring: { method: "none" }, redFlags: [], schedule: {} }),
    ).rejects.toBeInstanceOf(PublishedVersionError);

    const after = await loadVersion(version.id);
    expect(after?.definition.items).toHaveLength(6);
  });

  it("refuses to publish the same version twice", async () => {
    const { version } = await publishedQuestionnaire();
    const again = await publishVersion(version.id);
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.problems.version).toContain("already published");
  });

  it("refuses to publish a questionnaire with no licence note recorded", async () => {
    const questionnaire = await testDb.questionnaire.create({
      data: { key: "eq-5d-lookalike", title: "A licensed instrument", licenceNote: null },
    });
    const draft = await createDraftVersion(questionnaire.id, {
      items: SEEDED_WELLBEING.itemsJson,
      scoring: SEEDED_WELLBEING.scoringJson,
      redFlags: [],
      schedule: {},
    });

    const result = await publishVersion(draft.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.licence).toContain("may not be loaded here without one");
    expect((await loadVersion(draft.id))?.publishedAt).toBeNull();
  });

  it("refuses to publish a definition it cannot make sense of", async () => {
    const questionnaire = await createQuestionnaire({ key: "broken", title: "Broken", licenceNote: LICENCE });
    const draft = await createDraftVersion(questionnaire.id, {
      items: [{ key: "mood", type: "scale_0_10", label: "Mood" }],
      scoring: { method: "mean", items: ["sleep"] },
      redFlags: [],
      schedule: {},
    });

    const result = await publishVersion(draft.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.scoring).toContain("not one of the questions");
  });

  it("serves the newest published version, never a draft", async () => {
    const { questionnaire, version } = await publishedQuestionnaire();
    await createDraftVersion(questionnaire.id, {
      items: SEEDED_WELLBEING.itemsJson,
      scoring: SEEDED_WELLBEING.scoringJson,
      redFlags: [],
      schedule: {},
    });

    expect((await publishedVersionOf("wellbeing"))?.id).toBe(version.id);
  });
});

describe("an admin creating a version with no code change", () => {
  beforeEach(resetDatabase);

  const values: VersionFormValues = {
    key: "waiting-room",
    title: "How today has been",
    licenceNote: "Written for UnTouchable. Not a validated instrument.",
    items: JSON.stringify(EVERY_ITEM_TYPE.itemsJson),
    scoring: JSON.stringify(EVERY_ITEM_TYPE.scoringJson),
    redFlags: JSON.stringify(EVERY_ITEM_TYPE.redFlagRulesJson),
    schedule: JSON.stringify(EVERY_ITEM_TYPE.scheduleJson),
  };

  it("creates, publishes, and can be answered straight away", async () => {
    const created = await createQuestionnaireDraft(values);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const published = await publishVersionDraft(created.versionId);
    expect(published.ok).toBe(true);

    const user = await makeUser();
    const version = await publishedVersionOf("waiting-room");
    expect(version).not.toBeNull();

    const result = await saveResponse({
      userId: user.id,
      versionId: version!.id,
      answers: { effort: "4", overall: "2", seen_gp: "false", changes: ["sleep"] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.score.value).toBe(6);
    expect(result.redFlags.map((hit) => hit.key)).toEqual([
      "great_effort",
      "some_effort",
      "low_overall",
      "sleep_changed",
      "gp_answered",
      "no_date",
    ]);
  });

  it("will not create a second questionnaire with the same key", async () => {
    await createQuestionnaireDraft(values);
    const again = await createQuestionnaireDraft(values);
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.problems.key).toContain("already uses that key");
  });

  it("says which box the stray comma is in", async () => {
    const result = await createQuestionnaireDraft({ ...values, key: "broken-json", scoring: "{ oops" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.scoring).toContain("not valid JSON");
  });

  it("insists on a licence note before anything is created", async () => {
    const result = await createQuestionnaireDraft({ ...values, key: "unlicensed", licenceNote: "  " });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.licenceNote).toContain("EQ-5D");
    expect(await testDb.questionnaire.count({ where: { key: "unlicensed" } })).toBe(0);
  });

  it("adds a new version rather than editing the published one", async () => {
    const created = await createQuestionnaireDraft(values);
    if (!created.ok) throw new Error("setup failed");
    await publishVersionDraft(created.versionId);

    const next = await createNextVersionDraft("waiting-room", {
      ...values,
      items: JSON.stringify([{ key: "overall", type: "scale_0_10", label: "How are things?", required: true }]),
      scoring: JSON.stringify({ method: "sum", items: ["overall"] }),
      redFlags: "[]",
    });
    expect(next.ok).toBe(true);
    if (!next.ok) return;
    expect(next.version).toBe(2);

    // Version 1 is untouched, and still the one being served until version 2 is published.
    const first = await loadVersion(created.versionId);
    expect(first?.definition.items).toHaveLength(7);
    expect((await publishedVersionOf("waiting-room"))?.version).toBe(1);
  });

  it("refuses to save over a published version through the admin path too", async () => {
    const created = await createQuestionnaireDraft(values);
    if (!created.ok) throw new Error("setup failed");
    await publishVersionDraft(created.versionId);

    const result = await saveVersionDraft(created.versionId, values);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.form).toContain("cannot be changed");
  });
});

describe("recording a response", () => {
  beforeEach(resetDatabase);

  it("ties the response to the exact version answered, with its score", async () => {
    const user = await makeUser();
    const { version } = await publishedQuestionnaire();

    const result = await saveResponse({ userId: user.id, versionId: version.id, answers: COMPLETE });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stored = await testDb.response.findUniqueOrThrow({ where: { id: result.responseId } });
    expect(stored.questionnaireVersionId).toBe(version.id);
    expect(stored.score).toBe(5.5);
    expect(stored.answersJson).toEqual({
      overall_health: 7,
      daily_activities: 6,
      sleep_quality: 4,
      mood: 5,
      coping: "mostly",
    });
  });

  it("rejects an answer set that does not match the version, and stores nothing", async () => {
    const user = await makeUser();
    const { version } = await publishedQuestionnaire();

    const result = await saveResponse({
      userId: user.id,
      versionId: version.id,
      answers: { ...COMPLETE, pain_score: "9" },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.pain_score).toContain("not one of the questions");
    expect(await testDb.response.count()).toBe(0);
  });

  it("rejects answers to a version that has not been published", async () => {
    const user = await makeUser();
    const { draft } = await makeQuestionnaire();

    const result = await saveResponse({ userId: user.id, versionId: draft.id, answers: COMPLETE });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.form).toContain("not in use");
    expect(await testDb.response.count()).toBe(0);
  });

  it("keeps an old response pointing at the old version after a new one is published", async () => {
    const user = await makeUser();
    const { questionnaire, version } = await publishedQuestionnaire();

    const first = await saveResponse({ userId: user.id, versionId: version.id, answers: COMPLETE });
    if (!first.ok) throw new Error("setup failed");

    const second = await createDraftVersion(questionnaire.id, {
      items: [{ key: "overall_health", type: "scale_0_10", label: "How has your health been?", required: true }],
      scoring: { method: "sum", items: ["overall_health"] },
      redFlags: [],
      schedule: { baseline: true },
    });
    await publishVersion(second.id);

    const stored = await testDb.response.findUniqueOrThrow({ where: { id: first.responseId } });
    expect(stored.questionnaireVersionId).toBe(version.id);

    const history = await responseHistory(user.id);
    expect(history[0].version).toBe(1);
  });

  it("completes the scheduled check-in it was answering, and refuses somebody else's", async () => {
    const [user, other] = await Promise.all([makeUser(), makeUser()]);
    const { version } = await publishedQuestionnaire();

    const checkIn = await testDb.scheduledCheckIn.create({
      data: { userId: user.id, questionnaireVersionId: version.id, dueAt: new Date() },
    });

    const wrongPerson = await saveResponse({
      userId: other.id,
      versionId: version.id,
      answers: COMPLETE,
      checkInId: checkIn.id,
    });
    expect(wrongPerson.ok).toBe(false);

    const result = await saveResponse({
      userId: user.id,
      versionId: version.id,
      answers: COMPLETE,
      checkInId: checkIn.id,
    });
    expect(result.ok).toBe(true);

    const after = await testDb.scheduledCheckIn.findUniqueOrThrow({ where: { id: checkIn.id } });
    expect(after.status).toBe("completed");
    // Only one response exists: the one from the person the check-in belongs to.
    expect(await testDb.response.count()).toBe(1);
  });

  it("reports red flags without showing anybody anything or recording a safety event", async () => {
    const user = await makeUser();
    const { version } = await publishedQuestionnaire();

    const result = await saveResponse({
      userId: user.id,
      versionId: version.id,
      answers: { ...COMPLETE, mood: "0", coping: "not_coping" },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.redFlags.map((hit) => hit.key)).toEqual(["not_coping", "very_low_mood"]);
    // The signposting screen is milestone 8's. This milestone reports, it does not act.
    expect(await testDb.safetyEvent.count()).toBe(0);
  });
});
