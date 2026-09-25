import { describe, expect, it } from "vitest";

import { evaluateLabRedFlags, RED_FLAG_QUESTIONS } from "@/lib/lab";

import { checkIn, isoPlus } from "./lab-fixtures";

/**
 * The cases that worried us. A new ear symptom must not be filed as "a bad night" and carried
 * through the rest of a fourteen-day experiment.
 */

const NOW = new Date("2026-09-20T07:30:00Z");

const evaluate = (
  current: { newSymptoms?: string[]; note?: string | null; dizziness?: number | null },
  history: ReturnType<typeof checkIn>[] = [],
) =>
  evaluateLabRedFlags({
    checkIn: {
      newSymptoms: current.newSymptoms ?? [],
      note: current.note ?? null,
      scores: { dizziness: current.dizziness ?? null },
    },
    history,
    now: NOW,
  });

describe("the tick boxes", () => {
  it.each(RED_FLAG_QUESTIONS.map((question) => question.value))("%s raises a flag", (value) => {
    expect(evaluate({ newSymptoms: [value] })?.flags.map((flag) => flag.key)).toContain(value);
  });

  it("sends sudden hearing loss for help today, not to the GP next week", () => {
    const result = evaluate({ newSymptoms: ["sudden_hearing_loss"] });
    expect(result?.tier).toBe("urgent");
    expect(result?.action).toMatch(/111/);
    expect(result?.action).toMatch(/do not wait/i);
  });

  it("puts 999 first for facial weakness", () => {
    const result = evaluate({ newSymptoms: ["one_sided_tinnitus", "facial_weakness"] });
    expect(result?.tier).toBe("emergency");
    expect(result?.callNow).toBe(true);
    expect(result?.flags[0].key).toBe("facial_weakness");
    expect(result?.action).toMatch(/999/);
  });

  it("sends one-sided or pulsing tinnitus to the GP", () => {
    expect(evaluate({ newSymptoms: ["pulsing_tinnitus"] })?.tier).toBe("prompt");
    expect(evaluate({ newSymptoms: ["one_sided_tinnitus"] })?.action).toMatch(/GP/);
  });
});

describe("the note, in the person's own words", () => {
  it.each([
    "left ear has gone whooshy, like it's pulsing",
    "the tinnitus is throbbing in time with my heart tonight",
    "noticed a heartbeat sound in my right ear",
  ])("hears pulsing tinnitus in %j", (note) => {
    expect(evaluate({ note })?.flags.map((flag) => flag.key)).toContain("pulsing_tinnitus");
  });

  it("hears tinnitus moving to one side", () => {
    expect(evaluate({ note: "the ringing is only in my left ear now" })?.flags[0].key).toBe(
      "one_sided_tinnitus",
    );
  });

  it("uses the timeline's own rules too, with the ear and headache overlays", () => {
    const result = evaluate({ note: "my face is drooping on one side and the ear is sore" });
    expect(result?.tier).toBe("emergency");
  });

  it("is switched off by a plain negation", () => {
    expect(evaluate({ note: "no pulsing in my ear, just the usual ring" })).toBeNull();
  });

  it("stays quiet about an ordinary bad night", () => {
    expect(evaluate({ note: "Brain would not switch off again. Tinnitus same as ever." })).toBeNull();
  });
});

describe("dizziness against the person's own usual", () => {
  const usual = [1, 2, 1, 2, 1].map((value, index) =>
    checkIn(isoPlus("2026-09-14", index), { dizziness: value }),
  );

  it("flags a jump from their usual to severe", () => {
    const result = evaluate({ dizziness: 8 }, usual);
    expect(result?.flags[0].key).toBe("dizziness_jump");
    expect(result?.flags[0].noticed).toMatch(/usually around 1/);
  });

  it("does not flag severe dizziness that is their usual", () => {
    const high = [7, 8, 7, 8].map((value, index) =>
      checkIn(isoPlus("2026-09-14", index), { dizziness: value }),
    );
    expect(evaluate({ dizziness: 8 }, high)).toBeNull();
  });

  it("does not guess a usual from too few days", () => {
    expect(evaluate({ dizziness: 9 }, usual.slice(0, 2))).toBeNull();
  });

  it("does not double up with the tick box", () => {
    const result = evaluate({ dizziness: 9, newSymptoms: ["severe_dizziness"] }, usual);
    expect(result?.flags.map((flag) => flag.key)).toEqual(["severe_dizziness"]);
  });
});

it("never names a condition", () => {
  const all = evaluate(
    { newSymptoms: RED_FLAG_QUESTIONS.map((question) => question.value), note: null },
    [],
  );
  const text = [all?.action, ...(all?.flags.map((flag) => flag.noticed) ?? [])].join(" ");
  expect(text).not.toMatch(/stroke|tumour|neuroma|Ménière|meniere|labyrinthitis|diagnos/i);
});
