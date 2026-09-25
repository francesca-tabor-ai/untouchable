import { describe, expect, it } from "vitest";

import { parseCheckInForm } from "@/lib/lab";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("the Habit Lab check-in", () => {
  it("saves an empty check-in: nothing is required", () => {
    const parsed = parseCheckInForm(form([]), []);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.scores.sleepLatencyMin).toBeNull();
    expect(parsed.data?.note).toBeNull();
  });

  it("keeps an unanswered score as null, never zero", () => {
    const parsed = parseCheckInForm(
      form([
        ["score-sleepLatencyMin", "45"],
        ["score-racingMind", ""],
        ["score-sleepHours", "6.5"],
      ]),
      [],
    );
    expect(parsed.data?.scores.sleepLatencyMin).toBe(45);
    expect(parsed.data?.scores.racingMind).toBeNull();
    expect(parsed.data?.scores.sleepHours).toBe(6.5);
  });

  it("refuses a score outside its scale", () => {
    expect(parseCheckInForm(form([["score-sleepQuality", "0"]]), []).success).toBe(false);
    expect(parseCheckInForm(form([["score-racingMind", "11"]]), []).success).toBe(false);
    expect(parseCheckInForm(form([["score-mood", "lots"]]), []).success).toBe(false);
  });

  it("keeps only known tags and red-flag answers", () => {
    const parsed = parseCheckInForm(
      form([
        ["tag", "alcohol"],
        ["tag", "made_up"],
        ["new", "pulsing_tinnitus"],
        ["new", "anything"],
      ]),
      [],
    );
    expect(parsed.data?.tags).toEqual(["alcohol"]);
    expect(parsed.data?.newSymptoms).toEqual(["pulsing_tinnitus"]);
  });

  it("reads did-I-do-it only for experiments the server says are running", () => {
    const parsed = parseCheckInForm(
      form([
        ["done-mine", "on"],
        ["time-mine", "07:15"],
        ["done-someone-elses", "on"],
      ]),
      ["mine", "not-ticked"],
    );
    expect(parsed.data?.adherence).toEqual([
      { experimentId: "mine", done: true, timeDone: "07:15" },
      { experimentId: "not-ticked", done: false, timeDone: null },
    ]);
  });

  it("refuses a time that is not a 24-hour clock time", () => {
    const parsed = parseCheckInForm(form([["done-x", "on"], ["time-x", "7pm"]]), ["x"]);
    expect(parsed.success).toBe(false);
  });
});
