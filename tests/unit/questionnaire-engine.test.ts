// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  evaluateRedFlags,
  parseDefinition,
  readDefinition,
  scoreAnswers,
  validateAnswers,
  type Answers,
  type RawDefinition,
  type Scoring,
} from "@/lib/questionnaires";

import { EVERY_ITEM_TYPE, MAPPED_SCORING, SEEDED_WELLBEING } from "./questionnaire-fixtures";

/**
 * The engine, with no database anywhere near it.
 *
 * Everything under test here is pure: a definition goes in, a shape or a number or a list of
 * matched rules comes out. That is deliberate — these are the rules that must not be wrong,
 * and a rule that needs a browser to test is a rule nobody tests.
 */

const wellbeing = parseDefinition(SEEDED_WELLBEING);
const everyType = parseDefinition(EVERY_ITEM_TYPE);
const mapped = parseDefinition(MAPPED_SCORING);

describe("reading a questionnaire version", () => {
  it("reads the seeded placeholder questionnaire exactly as it is seeded", () => {
    expect(wellbeing.items.map((item) => item.key)).toEqual([
      "overall_health",
      "daily_activities",
      "sleep_quality",
      "mood",
      "coping",
      "anything_else",
    ]);
    expect(wellbeing.scoring).toMatchObject({ method: "mean" });
    expect(wellbeing.redFlags).toHaveLength(3);
    expect(wellbeing.schedule).toEqual({
      baseline: true,
      afterTreatmentDays: [14, 90, 180],
      thenEveryDays: 180,
      generalEveryDays: 28,
    });
  });

  it("supports every item type the brief asks for", () => {
    expect(everyType.items.map((item) => item.type)).toEqual([
      "likert",
      "scale_0_10",
      "single_choice",
      "multi_choice",
      "yes_no",
      "date",
      "text",
    ]);
  });

  it("fills in the parts of a schedule a version does not mention", () => {
    expect(mapped.schedule).toEqual({
      baseline: false,
      afterTreatmentDays: [],
      thenEveryDays: null,
      generalEveryDays: null,
    });
  });

  function problemsOf(raw: RawDefinition) {
    const read = readDefinition(raw);
    if (read.ok) throw new Error("expected this definition to be refused");
    return read.problems;
  }

  it("refuses two questions with the same key", () => {
    const problems = problemsOf({
      itemsJson: [
        { key: "mood", type: "yes_no", label: "One" },
        { key: "mood", type: "yes_no", label: "Two" },
      ],
      scoringJson: { method: "none" },
    });
    expect(problems.items).toContain("unique");
  });

  it("refuses a score built from a question that does not exist", () => {
    const problems = problemsOf({
      itemsJson: [{ key: "mood", type: "scale_0_10", label: "Mood" }],
      scoringJson: { method: "mean", items: ["sleep"] },
    });
    expect(problems.scoring).toContain("not one of the questions");
  });

  it("refuses an average taken over a question that is not answered with a number", () => {
    const problems = problemsOf({
      itemsJson: [
        { key: "coping", type: "single_choice", label: "Coping", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
      ],
      scoringJson: { method: "mean", items: ["coping"] },
    });
    expect(problems.scoring).toContain("map method");
  });

  it("refuses a red flag rule pointed at somebody's free text", () => {
    const problems = problemsOf({
      itemsJson: [{ key: "notes", type: "text", label: "Notes" }],
      scoringJson: { method: "none" },
      redFlagRulesJson: [{ key: "sad", itemKey: "notes", operator: "equals", value: "sad", message: "…" }],
    });
    expect(problems.redFlags).toContain("only ever seen by the person who wrote it");
  });

  it("refuses a red flag rule that looks for an answer the question does not offer", () => {
    const problems = problemsOf({
      itemsJson: [
        { key: "coping", type: "single_choice", label: "Coping", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
      ],
      scoringJson: { method: "none" },
      redFlagRulesJson: [{ key: "x", itemKey: "coping", operator: "equals", value: "z", message: "…" }],
    });
    expect(problems.redFlags).toContain("not one of the answers");
  });

  it("refuses a mapping that mentions an answer the question does not offer", () => {
    const problems = problemsOf({
      itemsJson: [
        { key: "coping", type: "single_choice", label: "Coping", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] },
      ],
      scoringJson: { method: "map", items: ["coping"], mapping: { coping: { a: 1, z: 2 } } },
    });
    expect(problems.scoring).toContain('"z"');
  });
});

describe("checking answers against the version they claim to answer", () => {
  it("accepts a complete set", () => {
    const result = validateAnswers(wellbeing.items, {
      overall_health: "7",
      daily_activities: "6",
      sleep_quality: "4",
      mood: "5",
      coping: "mostly",
      anything_else: "  Tired this week.  ",
    });
    expect(result).toEqual({
      ok: true,
      answers: {
        overall_health: 7,
        daily_activities: 6,
        sleep_quality: 4,
        mood: 5,
        coping: "mostly",
        anything_else: "Tired this week.",
      },
    });
  });

  it("rejects an answer to a question this version does not contain", () => {
    const result = validateAnswers(wellbeing.items, {
      overall_health: 7,
      daily_activities: 6,
      sleep_quality: 4,
      mood: 5,
      coping: "well",
      pain_score: 9,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.pain_score).toContain("not one of the questions");
  });

  it("rejects an answer outside the bounds of its scale", () => {
    const result = validateAnswers(wellbeing.items, { overall_health: 11 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.overall_health).toContain("between 0 and 10");
  });

  it("accepts both ends of a scale", () => {
    for (const value of [0, 10]) {
      const result = validateAnswers([wellbeing.items[0]], { overall_health: value });
      expect(result).toEqual({ ok: true, answers: { overall_health: value } });
    }
  });

  it("rejects a choice that is not on the list", () => {
    const result = validateAnswers(wellbeing.items, { coping: "fine, thanks" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.coping).toContain("one of the answers listed");
  });

  it("says which required questions have not been answered, and does not stop at the first", () => {
    const result = validateAnswers(wellbeing.items, { overall_health: 5 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.problems).sort()).toEqual(["coping", "daily_activities", "mood", "sleep_quality"]);
  });

  it("leaves an unanswered optional question out altogether rather than storing a blank", () => {
    const result = validateAnswers(wellbeing.items, {
      overall_health: 5,
      daily_activities: 5,
      sleep_quality: 5,
      mood: 5,
      coping: "well",
      anything_else: "   ",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect("anything_else" in result.answers).toBe(false);
  });

  it("keeps a half-finished set when it is only a draft", () => {
    const result = validateAnswers(wellbeing.items, { overall_health: 5 }, { partial: true });
    expect(result).toEqual({ ok: true, answers: { overall_health: 5 } });
  });

  it("still rejects nonsense in a draft", () => {
    const result = validateAnswers(wellbeing.items, { overall_health: 99 }, { partial: true });
    expect(result.ok).toBe(false);
  });

  it("handles every item type", () => {
    const result = validateAnswers(everyType.items, {
      effort: "3",
      overall: "8",
      who_helps: "friends",
      changes: ["sleep", "sleep", "work"],
      seen_gp: "true",
      last_seen: "2026-02-29",
      notes: "Nothing much",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    // 2026 is not a leap year.
    expect(result.problems.last_seen).toContain("not a date that exists");

    const good = validateAnswers(everyType.items, {
      effort: "3",
      overall: "8",
      who_helps: "friends",
      changes: ["sleep", "sleep", "work"],
      seen_gp: "true",
      last_seen: "2026-02-28",
      notes: "Nothing much",
    });
    expect(good).toEqual({
      ok: true,
      answers: {
        effort: 3,
        overall: 8,
        who_helps: "friends",
        // Duplicates are folded away rather than counted twice.
        changes: ["sleep", "work"],
        seen_gp: true,
        last_seen: "2026-02-28",
        notes: "Nothing much",
      },
    });
  });

  it("holds a multiple choice question to the number of answers it allows", () => {
    const result = validateAnswers(everyType.items, { changes: ["sleep", "appetite", "work"] }, { partial: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.changes).toContain("no more than 2");
  });

  it("holds free text to its length", () => {
    const result = validateAnswers(everyType.items, { notes: "x".repeat(41) }, { partial: true });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problems.notes).toContain("40 characters");
  });
});

describe("scoring", () => {
  const complete: Answers = {
    overall_health: 7,
    daily_activities: 6,
    sleep_quality: 4,
    mood: 5,
    coping: "mostly",
  };

  it("takes a mean over the questions the version names", () => {
    expect(scoreAnswers(wellbeing.scoring, complete)).toEqual({
      value: 5.5,
      answered: 4,
      total: 4,
      method: "mean",
      scale: { min: 0, max: 10 },
    });
  });

  it("does not treat a missing optional answer as zero", () => {
    const withGap = { ...complete };
    delete withGap.sleep_quality;

    const score = scoreAnswers(wellbeing.scoring, withGap);
    // (7 + 6 + 5) / 3 = 6, not (7 + 6 + 0 + 5) / 4 = 4.5.
    expect(score.value).toBe(6);
    expect(score.answered).toBe(3);
    expect(score.total).toBe(4);
  });

  it("sums only the answers that are there", () => {
    const scoring: Scoring = {
      method: "sum",
      items: ["overall_health", "daily_activities", "sleep_quality", "mood"],
    };
    expect(scoreAnswers(scoring, complete).value).toBe(22);
    expect(scoreAnswers(scoring, { overall_health: 7 }).value).toBe(7);
  });

  it("distinguishes a score of zero from no score at all", () => {
    const allZero = scoreAnswers(wellbeing.scoring, {
      overall_health: 0,
      daily_activities: 0,
      sleep_quality: 0,
      mood: 0,
    });
    expect(allZero.value).toBe(0);
    expect(allZero.answered).toBe(4);

    const nothing = scoreAnswers(wellbeing.scoring, { coping: "well" });
    expect(nothing.value).toBeNull();
    expect(nothing.answered).toBe(0);
  });

  it("rounds a mean rather than showing floating point noise", () => {
    expect(scoreAnswers(wellbeing.scoring, { overall_health: 1, daily_activities: 2, mood: 2 }).value).toBe(1.67);
  });

  it("scores a custom mapping, and sums it by default", () => {
    expect(scoreAnswers(mapped.scoring, { coping: "struggling", rested: false }).value).toBe(3);
    expect(scoreAnswers(mapped.scoring, { coping: "well", rested: true }).value).toBe(0);
  });

  it("leaves a mapped question out when the mapping says nothing about its answer", () => {
    const scoring: Scoring = {
      method: "map",
      items: ["coping", "rested"],
      aggregate: "mean",
      mapping: { coping: { struggling: 2 }, rested: { true: 0, false: 1 } },
    };
    // "well" is not in the mapping, so the mean is over `rested` alone — not over a zero.
    const score = scoreAnswers(scoring, { coping: "well", rested: false });
    expect(score.value).toBe(1);
    expect(score.answered).toBe(1);
    expect(score.total).toBe(2);
  });

  it("gives no score at all when the version asks for none", () => {
    expect(scoreAnswers({ method: "none" }, complete).value).toBeNull();
  });
});

describe("evaluateRedFlags", () => {
  const version = { redFlagRulesJson: SEEDED_WELLBEING.redFlagRulesJson };

  it("reports nothing when nothing matches", () => {
    expect(evaluateRedFlags(version, { mood: 8, overall_health: 7, coping: "well" })).toEqual([]);
  });

  it("reports every rule that matches, and only those", () => {
    const hits = evaluateRedFlags(version, { mood: 1, overall_health: 5, coping: "not_coping" });
    expect(hits.map((hit) => hit.key)).toEqual(["not_coping", "very_low_mood"]);
    expect(hits[0]).toEqual({
      key: "not_coping",
      itemKey: "coping",
      operator: "equals",
      value: "not_coping",
      answer: "not_coping",
      message: "You have said you are not coping at all.",
    });
  });

  it("keeps the order the version lists the rules in", () => {
    const hits = evaluateRedFlags(version, { mood: 0, overall_health: 0, coping: "not_coping" });
    expect(hits.map((hit) => hit.key)).toEqual(["not_coping", "very_low_mood", "very_poor_health"]);
  });

  it("treats a threshold as inclusive exactly where the version says", () => {
    expect(evaluateRedFlags(version, { mood: 2 }).map((hit) => hit.key)).toEqual(["very_low_mood"]);
    expect(evaluateRedFlags(version, { mood: 3 })).toEqual([]);
  });

  it("does not match a rule whose question was not answered", () => {
    expect(evaluateRedFlags(version, {})).toEqual([]);
  });

  const everyOperator = { redFlagRulesJson: EVERY_ITEM_TYPE.redFlagRulesJson };

  it("handles every operator it offers", () => {
    const hits = evaluateRedFlags(everyOperator, {
      effort: 4,
      overall: 0,
      who_helps: "nobody",
      changes: ["sleep", "work"],
      seen_gp: true,
    }).map((hit) => hit.key);

    expect(hits).toEqual([
      "nobody_helps", // equals
      "great_effort", // gte
      "some_effort", // gt
      "low_overall", // lt
      "very_low_overall", // lte
      "sleep_changed", // includes
      "gp_answered", // answered
      "no_date", // not_answered
    ]);
    // not_equals is the one that must NOT match when the answer is "nobody".
    expect(hits).not.toContain("someone_helps");
  });

  it("matches not_equals when the answer is something else", () => {
    const hits = evaluateRedFlags(everyOperator, { who_helps: "family" }).map((hit) => hit.key);
    expect(hits).toContain("someone_helps");
    expect(hits).not.toContain("nobody_helps");
  });

  it("does not treat an unanswered question as not_equals", () => {
    const hits = evaluateRedFlags(everyOperator, {}).map((hit) => hit.key);
    expect(hits).not.toContain("someone_helps");
    expect(hits).toEqual(["no_date"]);
  });

  it("refuses to run at all rather than quietly finding nothing when the rules are broken", () => {
    expect(() => evaluateRedFlags({ redFlagRulesJson: [{ nonsense: true }] }, { mood: 0 })).toThrow(
      /cannot be read/,
    );
  });

  it("takes a whole version row, so the safety milestone can pass one straight in", () => {
    const row = {
      id: "v1",
      questionnaireId: "q1",
      version: 1,
      itemsJson: SEEDED_WELLBEING.itemsJson,
      scoringJson: SEEDED_WELLBEING.scoringJson,
      redFlagRulesJson: SEEDED_WELLBEING.redFlagRulesJson,
      scheduleJson: SEEDED_WELLBEING.scheduleJson,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(evaluateRedFlags(row, { mood: 0 }).map((hit) => hit.key)).toEqual(["very_low_mood"]);
  });
});
