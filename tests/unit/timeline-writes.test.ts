// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ConsentPurpose } from "@/generated/prisma";
import { recordConsentDecisions } from "@/lib/profile/consent";
import {
  addObservation,
  addStandingFact,
  addTimelineEvent,
  ruleDownCandidate,
  supersedeRecord,
} from "@/lib/timeline/mutations";
import { timelineMarkdown } from "@/lib/timeline/export";
import { deleteTimeline, exportTimeline, loadTimeline } from "@/lib/timeline/queries";

import { makeUser, resetDatabase, testDb } from "../helpers/db";

/** Everybody here is invented, and so is everything that happens to them. */

async function trackedPerson() {
  const user = await makeUser();
  await recordConsentDecisions(user.id, { [ConsentPurpose.core_tracking]: true });
  return user;
}

async function symptomFor(userId: string, name = "Dizziness") {
  const symptom = await testDb.symptom.create({
    data: { name, slug: `${name.toLowerCase()}-${Date.now()}-${Math.random()}` },
  });
  return testDb.userSymptom.create({ data: { userId, symptomId: symptom.id } });
}

const observation = (userSymptomId: string, overrides: Record<string, unknown> = {}) => ({
  userSymptomId,
  occurredAt: new Date(),
  severity: 4,
  character: "A swimmy feeling when I stand up",
  duration: null,
  triggers: null,
  relievingFactors: null,
  source: "contemporaneous_note" as const,
  confidence: "confirmed" as const,
  ...overrides,
});

const event = (overrides: Record<string, unknown> = {}) => ({
  occurredAt: new Date(),
  type: "other" as const,
  description: "Felt odd after standing up too fast",
  provider: null,
  outcome: null,
  documentRef: null,
  source: "contemporaneous_note" as const,
  confidence: "confirmed" as const,
  ...overrides,
});

describe("a red flag never costs somebody their entry", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("writes the row and reports the flag", async () => {
    // Somebody sent to 999, told by 111 to keep a record, coming back to find the entry
    // gone is the failure this ordering exists to prevent.
    const user = await trackedPerson();
    const result = await addTimelineEvent(
      user.id,
      event({ description: "I collapsed in the kitchen" }),
      ["general"],
    );

    expect(result.urgent?.rule.key).toBe("collapse");

    const saved = await testDb.timelineEvent.findUnique({ where: { id: result.id } });
    expect(saved?.description).toBe("I collapsed in the kitchen");
  });

  it("records the tier on the row, so the next handover can carry it", async () => {
    const user = await trackedPerson();
    const result = await addTimelineEvent(
      user.id,
      event({ description: "My face drooped and my speech was slurred" }),
      ["general"],
    );

    const saved = await testDb.timelineEvent.findUnique({ where: { id: result.id } });
    expect(saved?.flaggedTier).toBe("emergency");
  });

  it("keeps a past episode flagged without calling it an emergency now", async () => {
    const user = await trackedPerson();
    const threeWeeksAgo = new Date(Date.now() - 21 * 86_400_000);

    const result = await addTimelineEvent(
      user.id,
      event({ description: "I blacked out at work", occurredAt: threeWeeksAgo }),
      ["general"],
    );

    expect(result.flags).toHaveLength(1);
    expect(result.urgent).toBeNull();

    const saved = await testDb.timelineEvent.findUnique({ where: { id: result.id } });
    expect(saved?.flaggedTier).toBe("same_day");
  });

  it("reads free text on an observation too, not only structured fields", async () => {
    const user = await trackedPerson();
    const symptom = await symptomFor(user.id);

    const result = await addObservation(
      user.id,
      observation(symptom.id, { character: "my legs gave way and I went down" }),
      ["general"],
    );

    expect(result.urgent?.rule.key).toBe("collapse");
  });
});

describe("writing against somebody else's record", () => {
  beforeEach(resetDatabase);

  it("is refused", async () => {
    const mine = await trackedPerson();
    const theirs = await trackedPerson();
    const theirSymptom = await symptomFor(theirs.id);

    await expect(addObservation(mine.id, observation(theirSymptom.id), [])).rejects.toThrow(
      /not one of yours/i,
    );

    expect(await testDb.observation.count()).toBe(0);
  });
});

describe("contradictions are surfaced on the write", () => {
  beforeEach(resetDatabase);

  it("come back with the result rather than waiting for a scan", async () => {
    const user = await trackedPerson();
    const symptom = await symptomFor(user.id);
    await testDb.userSymptom.update({
      where: { id: symptom.id },
      data: { firstOnset: new Date("2026-03-03") },
    });

    const result = await addObservation(
      user.id,
      observation(symptom.id, { occurredAt: new Date("2026-02-01") }),
      [],
    );

    expect(result.contradictions[0].kind).toBe("observation_before_onset");
  });

  it("change nothing on their own", async () => {
    const user = await trackedPerson();
    const symptom = await symptomFor(user.id);
    await testDb.userSymptom.update({
      where: { id: symptom.id },
      data: { firstOnset: new Date("2026-03-03") },
    });

    const result = await addObservation(
      user.id,
      observation(symptom.id, { occurredAt: new Date("2026-02-01") }),
      [],
    );

    const saved = await testDb.observation.findUnique({ where: { id: result.id } });
    expect(saved?.supersededAt).toBeNull();

    const after = await testDb.userSymptom.findUnique({ where: { id: symptom.id } });
    expect(after?.firstOnset).toEqual(new Date("2026-03-03"));
  });
});

describe("superseding", () => {
  beforeEach(resetDatabase);

  it("marks the losing record and keeps it", async () => {
    const user = await trackedPerson();
    const symptom = await symptomFor(user.id);

    const keep = await addObservation(user.id, observation(symptom.id), []);
    const drop = await addObservation(
      user.id,
      observation(symptom.id, { source: "recollection" }),
      [],
    );

    await supersedeRecord(user.id, {
      field: "observation",
      supersedeId: drop.id,
      keepId: keep.id,
      reason: "The note written on the day says otherwise.",
    });

    const superseded = await testDb.observation.findUnique({ where: { id: drop.id } });
    expect(superseded).not.toBeNull();
    expect(superseded?.supersededAt).toBeInstanceOf(Date);
    expect(superseded?.supersededById).toBe(keep.id);
    expect(superseded?.supersededReason).toMatch(/written on the day/);
  });

  it("leaves the superseded row readable on the timeline", async () => {
    const user = await trackedPerson();
    const symptom = await symptomFor(user.id);
    const drop = await addObservation(user.id, observation(symptom.id), []);

    await supersedeRecord(user.id, {
      field: "observation",
      supersedeId: drop.id,
      keepId: null,
      reason: "Changed my mind.",
    });

    const timeline = await loadTimeline(user.id);
    expect(timeline.observations).toHaveLength(1);
  });

  it("cannot be used on somebody else's record", async () => {
    const mine = await trackedPerson();
    const theirs = await trackedPerson();
    const theirSymptom = await symptomFor(theirs.id);
    const record = await addObservation(theirs.id, observation(theirSymptom.id), []);

    await supersedeRecord(mine.id, {
      field: "observation",
      supersedeId: record.id,
      keepId: null,
      reason: "Not mine to touch.",
    });

    const untouched = await testDb.observation.findUnique({ where: { id: record.id } });
    expect(untouched?.supersededAt).toBeNull();
  });
});

describe("a candidate set aside", () => {
  beforeEach(resetDatabase);

  it("keeps the reason and stays in the record", async () => {
    const user = await trackedPerson();
    const candidate = await testDb.candidate.create({
      data: {
        userId: user.id,
        name: "Something to do with my ears",
        discriminatingFeatures: "Worse turning over in bed",
        testsThatWouldSettleIt: "Someone looking in both ears",
      },
    });

    await ruleDownCandidate(user.id, candidate.id, {
      status: "ruled_down",
      excludedBy: "Ears looked at in June. I would come back to it if the dizziness returned.",
    });

    const after = await testDb.candidate.findUnique({ where: { id: candidate.id } });
    expect(after?.status).toBe("ruled_down");
    expect(after?.excludedBy).toMatch(/come back to it/);
  });
});

describe("getting it all back, and getting rid of it", () => {
  beforeEach(resetDatabase);

  async function somebodyWithARecord() {
    const user = await trackedPerson();
    const symptom = await symptomFor(user.id);
    await addObservation(user.id, observation(symptom.id), []);
    await addTimelineEvent(user.id, event(), []);
    await addStandingFact(user.id, {
      category: "allergy",
      value: "Penicillin",
      dateEstablished: null,
    });
    await testDb.candidate.create({
      data: {
        userId: user.id,
        name: "A thing I wondered about",
        discriminatingFeatures: "x",
        testsThatWouldSettleIt: "y",
      },
    });
    return user;
  }

  it("gives the person their own free text back", async () => {
    // The opposite case from a research export, where free text never leaves at all.
    const user = await somebodyWithARecord();
    const dump = await exportTimeline(user.id);

    expect(dump.observations[0].character).toBe("A swimmy feeling when I stand up");
    expect(dump.standingFacts[0].value).toBe("Penicillin");
  });

  it("deletes completely, superseded rows included", async () => {
    const user = await somebodyWithARecord();
    const [first] = (await loadTimeline(user.id)).observations;
    await supersedeRecord(user.id, {
      field: "observation",
      supersedeId: first.id,
      keepId: null,
      reason: "Replaced.",
    });

    await deleteTimeline(user.id);

    const left = await loadTimeline(user.id);
    expect(left.observations).toHaveLength(0);
    expect(left.events).toHaveLength(0);
    expect(left.standingFacts).toHaveLength(0);
    expect(left.candidates).toHaveLength(0);
    expect(left.assessments).toHaveLength(0);
  });

  it("leaves other people's records alone", async () => {
    const mine = await somebodyWithARecord();
    const theirs = await somebodyWithARecord();

    await deleteTimeline(mine.id);

    expect((await loadTimeline(theirs.id)).observations).toHaveLength(1);
  });
});

describe("the document somebody downloads", () => {
  beforeEach(resetDatabase);

  it("keeps their own words, and marks what was replaced", async () => {
    const user = await trackedPerson();
    const symptom = await symptomFor(user.id);
    const first = await addObservation(user.id, observation(symptom.id), []);
    await addObservation(
      user.id,
      observation(symptom.id, { character: "The same thing again on the stairs" }),
      [],
    );

    await supersedeRecord(user.id, {
      field: "observation",
      supersedeId: first.id,
      keepId: null,
      reason: "I had the day wrong.",
    });

    const markdown = timelineMarkdown(await loadTimeline(user.id), new Date("2026-09-20"));

    expect(markdown).toContain("A swimmy feeling when I stand up");
    expect(markdown).toContain("The same thing again on the stairs");
    expect(markdown).toContain("I had the day wrong.");
    expect(markdown).toMatch(/Replaced on/);
  });

  it("says plainly that it is not a medical record", async () => {
    const user = await trackedPerson();
    const markdown = timelineMarkdown(await loadTimeline(user.id), new Date("2026-09-20"));

    expect(markdown).toMatch(/not a medical record/);
    expect(markdown).toMatch(/nothing in it has been checked by a clinician/);
  });
});
