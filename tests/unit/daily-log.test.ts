// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { ConsentPurpose } from "@/generated/prisma";
import {
  dailyLogScreen,
  getDailyLog,
  NEUTRAL_SCORE,
  parseDailyLogForm,
  recentLogs,
  saveDailyLog,
} from "@/lib/tracking/daily-log";
import { addDays, fromDateInputValue, toDateInputValue, ukToday } from "@/lib/tracking/dates";
import { recordConsentDecisions } from "@/lib/profile/consent";

import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * The daily quick log — brief 7.5.
 *
 * Everything here is fictional. The suite does not lean on the seed script: it has to run
 * against an empty database.
 */

async function trackedPerson(symptomNames = ["Fatigue", "Pain"]) {
  const user = await makeUser();
  await recordConsentDecisions(user.id, { [ConsentPurpose.core_tracking]: true });

  const condition = await testDb.condition.create({
    data: {
      name: `Condition ${Math.random().toString(36).slice(2, 8)}`,
      slug: `condition-${Math.random().toString(36).slice(2, 10)}`,
      summary: "A fictional condition.",
    },
  });

  const userSymptoms = [];
  for (const name of symptomNames) {
    const slug = `${name.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
    const symptom = await testDb.symptom.create({
      data: { name, slug, conditions: { create: [{ conditionId: condition.id }] } },
    });
    userSymptoms.push(
      await testDb.userSymptom.create({
        data: { userId: user.id, symptomId: symptom.id, active: true },
      }),
    );
  }

  return { user, userSymptoms };
}

describe("logging today", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("opens with every slider already holding a value, so a log is one press away", async () => {
    const { user } = await trackedPerson();
    const screen = await dailyLogScreen(user.id);

    expect(screen.symptoms).toHaveLength(2);
    for (const symptom of screen.symptoms) {
      expect(symptom.score).toBe(NEUTRAL_SCORE);
      expect(symptom.source).toBe("neutral");
    }
    expect(screen.alreadyLogged).toBe(false);
  });

  it("saves today's entry and shows it back immediately", async () => {
    const { user, userSymptoms } = await trackedPerson();

    await saveDailyLog(user.id, {
      scores: { [userSymptoms[0].id]: 7, [userSymptoms[1].id]: 2 },
      tags: ["poor_sleep"],
      note: "Slept badly, nothing else out of the ordinary.",
    });

    const screen = await dailyLogScreen(user.id);
    expect(screen.alreadyLogged).toBe(true);
    expect(screen.symptoms.map((symptom) => symptom.score).sort()).toEqual([2, 7]);
    expect(screen.symptoms.every((symptom) => symptom.source === "today")).toBe(true);
    expect(screen.tags).toEqual(["poor_sleep"]);
    expect(screen.note).toBe("Slept badly, nothing else out of the ordinary.");

    const history = await recentLogs(user.id);
    expect(history).toHaveLength(1);
    expect(history[0].scores.map((entry) => entry.score).sort()).toEqual([2, 7]);
  });

  it("treats logging again on the same day as an edit, not an error", async () => {
    const { user, userSymptoms } = await trackedPerson();

    await saveDailyLog(user.id, {
      scores: { [userSymptoms[0].id]: 7, [userSymptoms[1].id]: 2 },
      tags: ["stress"],
      note: "First go.",
    });

    // The unique constraint on (userId, date) means a second insert would throw. It upserts.
    await saveDailyLog(user.id, {
      scores: { [userSymptoms[0].id]: 4, [userSymptoms[1].id]: 2 },
      tags: [],
      note: null,
    });

    const logs = await testDb.dailyLog.findMany({ where: { userId: user.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].tags).toEqual([]);
    expect(logs[0].note).toBeNull();

    const screen = await dailyLogScreen(user.id);
    expect(screen.symptoms.find((s) => s.userSymptomId === userSymptoms[0].id)?.score).toBe(4);
  });

  it("starts the sliders where the person left them, and says which day that was", async () => {
    const { user, userSymptoms } = await trackedPerson();
    const threeDaysAgo = addDays(ukToday(), -3);

    await saveDailyLog(
      user.id,
      { scores: { [userSymptoms[0].id]: 8, [userSymptoms[1].id]: 1 }, tags: [], note: null },
      threeDaysAgo,
    );

    const screen = await dailyLogScreen(user.id);
    expect(screen.alreadyLogged).toBe(false);
    expect(screen.carriedFrom?.toISOString()).toBe(threeDaysAgo.toISOString());
    expect(screen.symptoms.every((symptom) => symptom.source === "carried")).toBe(true);
    expect(screen.symptoms.map((symptom) => symptom.score).sort()).toEqual([1, 8]);
  });

  it("never writes a score against a symptom the person is not tracking", async () => {
    const { user, userSymptoms } = await trackedPerson();
    const stranger = await trackedPerson(["Nausea"]);

    await saveDailyLog(user.id, {
      // The second key is somebody else's row, as a tampered form would send.
      scores: { [userSymptoms[0].id]: 5, [stranger.userSymptoms[0].id]: 9 },
      tags: [],
      note: null,
    });

    const log = await getDailyLog(user.id, ukToday());
    expect(Object.keys(log!.symptomScoresJson as Record<string, number>)).toEqual([
      userSymptoms[0].id,
    ]);
  });

  it("drops a tag it does not recognise rather than storing it", async () => {
    const { user, userSymptoms } = await trackedPerson();

    await saveDailyLog(user.id, {
      scores: { [userSymptoms[0].id]: 5 },
      tags: ["poor_sleep", "made_up_tag"],
      note: null,
    });

    const log = await getDailyLog(user.id, ukToday());
    expect(log!.tags).toEqual(["poor_sleep"]);
  });

  it("stores an empty note as nothing at all", async () => {
    const { user, userSymptoms } = await trackedPerson();
    await saveDailyLog(user.id, {
      scores: { [userSymptoms[0].id]: 5 },
      tags: [],
      note: "   ",
    });

    const log = await getDailyLog(user.id, ukToday());
    expect(log!.note).toBeNull();
  });
});

describe("reading a submitted log", () => {
  it("accepts a form with only sliders on it", () => {
    const form = new FormData();
    form.set("score-abc", "6");
    form.set("score-def", "0");

    const parsed = parseDailyLogForm(form);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.scores).toEqual({ abc: 6, def: 0 });
    expect(parsed.data.tags).toEqual([]);
    expect(parsed.data.note).toBeNull();
  });

  it("refuses a score outside 0 to 10", () => {
    const form = new FormData();
    form.set("score-abc", "11");
    expect(parseDailyLogForm(form).success).toBe(false);
  });

  it("refuses a note longer than we store", () => {
    const form = new FormData();
    form.set("score-abc", "5");
    form.set("note", "x".repeat(1001));
    expect(parseDailyLogForm(form).success).toBe(false);
  });
});

describe("what today means", () => {
  it("reads and writes an ISO date without shifting it", () => {
    const date = fromDateInputValue("2026-09-16");
    expect(date).not.toBeNull();
    expect(toDateInputValue(date!)).toBe("2026-09-16");
  });

  it("refuses a date that does not exist", () => {
    expect(fromDateInputValue("2026-02-31")).toBeNull();
    expect(fromDateInputValue("not a date")).toBeNull();
  });

  it("uses the UK calendar day, not the server's", () => {
    // 11pm on a June evening in London is still that day, even though UTC has moved on.
    const lateJuneEvening = new Date("2026-06-15T22:30:00Z");
    expect(toDateInputValue(ukToday(lateJuneEvening))).toBe("2026-06-15");

    // And just after midnight in London during BST is already the next day.
    const justAfterMidnight = new Date("2026-06-15T23:10:00Z");
    expect(toDateInputValue(ukToday(justAfterMidnight))).toBe("2026-06-16");
  });
});
