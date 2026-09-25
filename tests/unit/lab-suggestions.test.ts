import { describe, expect, it } from "vitest";

import {
  analyseExperiment,
  LAB_LIBRARY,
  labLanguageProblem,
  suggestNext,
  type HistoryItem,
} from "@/lib/lab";

import { checkIn, doneEvery, experiment, isoPlus, run } from "./lab-fixtures";

const done = (key: string, extra = {}) =>
  experiment({ libraryKey: key, title: key, status: "complete", conclusion: "drop", ...extra });

describe("what to try next", () => {
  it("says to finish the running experiment first", () => {
    const suggestion = suggestNext({
      history: [{ experiment: experiment({ status: "intervention", title: "Magnesium" }) }],
      recentCheckIns: [],
    });
    expect(suggestion.kind).toBe("wait");
  });

  it("waits for a planned one too", () => {
    expect(
      suggestNext({ history: [{ experiment: experiment({ status: "planned" }) }], recentCheckIns: [] }).kind,
    ).toBe("wait");
  });

  it("offers a rerun of something marked retest before anything new", () => {
    const suggestion = suggestNext({
      history: [{ experiment: done("breathwork", { conclusion: "retest" }) }],
      recentCheckIns: [],
    });
    expect(suggestion).toMatchObject({ kind: "retest" });
  });

  it("stops offering the rerun once it has been rerun", () => {
    const first = done("breathwork", { id: "b1", conclusion: "retest" });
    const second = done("breathwork", {
      id: "b2",
      baselineStart: new Date("2026-10-01T00:00:00Z"),
      interventionStart: new Date("2026-10-08T00:00:00Z"),
      interventionEnd: new Date("2026-10-21T00:00:00Z"),
    });
    const suggestion = suggestNext({ history: [{ experiment: first }, { experiment: second }], recentCheckIns: [] });
    expect(suggestion.kind).toBe("try");
  });

  it("suggests exactly one thing, never something already tried", () => {
    const tried = ["caffeine_removal", "sugar_removal", "fixed_wake_time"];
    const suggestion = suggestNext({
      history: tried.map((key) => ({ experiment: done(key) })),
      recentCheckIns: [],
    });
    expect(suggestion.kind).toBe("try");
    if (suggestion.kind !== "try") return;
    expect(tried).not.toContain(suggestion.entry.key);
    expect(suggestion.entry).not.toBeInstanceOf(Array);
  });

  it("starts from what the person is here to change, then research", () => {
    const suggestion = suggestNext({ history: [], recentCheckIns: [] });
    expect(suggestion).toMatchObject({ kind: "try", entry: { key: "caffeine_removal" } });
  });

  it("leans towards what has shifted things in their own data", () => {
    const kept = experiment({
      id: "med",
      libraryKey: "meditation",
      title: "Meditation",
      status: "complete",
      conclusion: "keep",
      outcomes: ["stress"],
    });
    const nights = [
      ...[8, 8, 7, 8, 7, 8, 8].map((value, index) => checkIn(isoPlus("2026-09-01", index), { stress: value })),
      ...Array.from({ length: 14 }, (_, index) => checkIn(isoPlus("2026-09-08", index), { stress: index % 2 ? 3 : 4 })),
    ];
    const history: HistoryItem[] = [
      { experiment: kept, result: analyseExperiment({ experiment: kept, checkIns: nights, adherence: doneEvery("med", "2026-09-08", 14) }) },
      ...["caffeine_removal", "fixed_wake_time", "get_up_if_awake", "alcohol_removal", "magnesium"].map((key) => ({ experiment: done(key) })),
    ];
    const suggestion = suggestNext({ history, recentCheckIns: [] });
    expect(suggestion.kind).toBe("try");
    if (suggestion.kind !== "try") return;
    expect(suggestion.entry.outcomes).toContain("stress");
    expect(suggestion.reasons.join(" ")).toMatch(/"Meditation" moved stress the way you wanted/);
  });

  it("ignores a kept experiment that was confounded", () => {
    const kept = experiment({ status: "complete", conclusion: "keep", confounded: true, outcomes: ["stress"] });
    const result = analyseExperiment({ experiment: kept, checkIns: run([50, 60, 70], [20, 30, 25]), adherence: [] });
    const suggestion = suggestNext({ history: [{ experiment: kept, result }], recentCheckIns: [] });
    if (suggestion.kind !== "try") throw new Error("expected a suggestion");
    expect(suggestion.reasons.join(" ")).not.toMatch(/moved/);
  });

  it("brings the tinnitus entries forward when the tinnitus has been bothersome", () => {
    const tried = ["caffeine_removal", "fixed_wake_time", "get_up_if_awake", "alcohol_removal"];
    const loud = Array.from({ length: 7 }, (_, index) =>
      checkIn(isoPlus("2026-09-14", index), { tinnitusIntrusiveness: 7 }),
    );
    const suggestion = suggestNext({ history: tried.map((key) => ({ experiment: done(key) })), recentCheckIns: loud });
    if (suggestion.kind !== "try") throw new Error("expected a suggestion");
    expect(suggestion.entry.outcomes).toContain("tinnitusIntrusiveness");
  });

  it("says so when everything has been tried", () => {
    const suggestion = suggestNext({
      history: LAB_LIBRARY.map((entry) => ({ experiment: done(entry.key) })),
      recentCheckIns: [],
    });
    expect(suggestion.kind).toBe("exhausted");
  });

  it("counts an abandoned experiment as not yet tried", () => {
    const suggestion = suggestNext({
      history: [{ experiment: done("caffeine_removal", { status: "abandoned", conclusion: null }) }],
      recentCheckIns: [],
    });
    expect(suggestion).toMatchObject({ kind: "try", entry: { key: "caffeine_removal" } });
  });

  it("gives its reasons in words that pass the language check", () => {
    const suggestion = suggestNext({ history: [], recentCheckIns: [] });
    if (suggestion.kind !== "try") throw new Error("expected a suggestion");
    for (const reason of suggestion.reasons) expect(labLanguageProblem(reason)).toBeNull();
  });
});
