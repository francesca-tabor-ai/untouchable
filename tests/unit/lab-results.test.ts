import { describe, expect, it } from "vitest";

import {
  analyseExperiment,
  cohensD,
  completionMessage,
  effectBand,
  labLanguageProblem,
  stats,
} from "@/lib/lab";

import { checkIn, doneEvery, experiment, isoPlus, run } from "./lab-fixtures";

describe("the arithmetic", () => {
  it("uses the sample standard deviation", () => {
    const result = stats([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result.mean).toBe(5);
    expect(result.sd).toBeCloseTo(2.138, 3);
  });

  it("computes Cohen's d with a pooled deviation, signed intervention minus baseline", () => {
    expect(cohensD(stats([40, 50, 60]), stats([30, 40, 50]))).toBeCloseTo(-1, 5);
  });

  it("has no effect size without variation or with a single night", () => {
    expect(cohensD(stats([5, 5, 5]), stats([5, 5]))).toBeNull();
    expect(cohensD(stats([5]), stats([4, 6]))).toBeNull();
  });

  it("bands the size conventionally", () => {
    expect(effectBand(0.1)).toBe("negligible");
    expect(effectBand(-0.3)).toBe("small");
    expect(effectBand(0.6)).toBe("medium");
    expect(effectBand(-1.2)).toBe("large");
  });
});

describe("an experiment's result", () => {
  const mag = experiment({ id: "mag" });
  const nights = run(
    [50, 60, 45, 55, 65, 50, 55],
    [40, 35, 45, 30, 40, 35, 45, 30, 40, 35, 40, 45, 30, 35],
  );

  const result = analyseExperiment({
    experiment: mag,
    checkIns: nights,
    adherence: doneEvery("mag", "2026-09-08", 14),
  });
  const latency = result.comparisons.find((comparison) => comparison.key === "sleepLatencyMin");

  it("compares the two periods", () => {
    expect(latency?.baseline.n).toBe(7);
    expect(latency?.intervention.n).toBe(14);
    expect(latency?.difference).toBeCloseTo(37.5 - 54.29, 1);
    expect(latency?.band).toBe("large");
    expect(latency?.inWantedDirection).toBe(true);
  });

  it("says it in plain words, framed as the person's own data", () => {
    expect(latency?.sentence).toMatch(/^In your data so far, time to sleep averaged 54\.3 min before and 37\.5 min during: 16\.8 min lower/);
    for (const comparison of result.comparisons) {
      expect(labLanguageProblem(comparison.sentence)).toBeNull();
    }
  });

  it("knows which direction is wanted for each scale", () => {
    const more = analyseExperiment({
      experiment: experiment({ id: "q", outcomes: ["sleepQuality"] }),
      checkIns: [
        ...[3, 4, 3, 4].map((value, index) => checkIn(isoPlus("2026-09-01", index), { sleepQuality: value })),
        ...[6, 7, 6, 7].map((value, index) => checkIn(isoPlus("2026-09-08", index), { sleepQuality: value })),
      ],
      adherence: [],
    });
    expect(more.comparisons[0].inWantedDirection).toBe(true);
  });

  it("shades the chart: every point carries its phase", () => {
    expect(result.series[0].phase).toBe("baseline");
    expect(result.series.at(-1)?.phase).toBe("intervention");
    expect(result.series).toHaveLength(21);
  });

  it("always ends with the not-proof caveat", () => {
    expect(result.caveats.at(-1)).toMatch(/not medical proof/);
  });

  it("names a clean run's caveats and nothing else", () => {
    expect(result.caveats).toHaveLength(1);
    expect(result.adherence.rate).toBe(1);
    expect(result.adherence.times[0]).toBe("21:30");
  });
});

describe("the honest caveats", () => {
  it("says when the sample is small", () => {
    const small = analyseExperiment({
      experiment: experiment({ id: "s" }),
      checkIns: run([50, 60, 55], [40, 45, 30], "2026-09-05"),
      adherence: doneEvery("s", "2026-09-08", 3),
    });
    expect(small.caveats.join(" ")).toMatch(/small sample: 3 check-ins before and 3 during/);
  });

  it("gives the adherence percentage when it was patchy", () => {
    const patchy = analyseExperiment({
      experiment: experiment({ id: "p" }),
      checkIns: run([50, 50, 50, 50, 50, 50, 50], Array(14).fill(40)),
      adherence: doneEvery("p", "2026-09-08", 14, 7),
    });
    expect(patchy.caveats.join(" ")).toMatch(/7 of 14 days \(50%\)/);
  });

  it("carries the confounded label into the result", () => {
    const muddied = analyseExperiment({
      experiment: experiment({ id: "m", confounded: true }),
      checkIns: run([50, 50, 50, 50, 50, 50, 50], Array(14).fill(40)),
      adherence: doneEvery("m", "2026-09-08", 14),
    });
    expect(muddied.caveats[0]).toMatch(/cannot be told apart/);
  });

  it("counts confounder tags in each period", () => {
    const nights = run([50, 50, 50, 50, 50, 50, 50], Array(14).fill(40));
    nights[1].tags = ["alcohol"];
    nights[10].tags = ["alcohol", "travel"];
    nights[11].tags = ["alcohol"];
    const tagged = analyseExperiment({
      experiment: experiment({ id: "t" }),
      checkIns: nights,
      adherence: doneEvery("t", "2026-09-08", 14),
    });
    expect(tagged.confounders[0]).toMatchObject({ tag: "alcohol", baseline: 1, intervention: 2 });
    expect(tagged.caveats.join(" ")).toMatch(/had alcohol \(1 before, 2 during\)/);
  });

  it("says when a library experiment ran shorter than a fair go", () => {
    const short = analyseExperiment({
      experiment: experiment({ id: "sh", libraryKey: "meditation", interventionEnd: new Date("2026-09-14T00:00:00Z") }),
      checkIns: run([50, 50, 50, 50, 50, 50, 50], Array(7).fill(40)),
      adherence: doneEvery("sh", "2026-09-08", 7),
    });
    expect(short.caveats.join(" ")).toMatch(/ran for 7 days.*at least 21 days/);
  });

  it("every caveat passes the language check", () => {
    const muddied = analyseExperiment({
      experiment: experiment({ id: "all", confounded: true, libraryKey: "meditation" }),
      checkIns: run([50], [40]),
      adherence: doneEvery("all", "2026-09-08", 1, 0),
    });
    for (const caveat of muddied.caveats) expect(labLanguageProblem(caveat)).toBeNull();
  });
});

it("celebrates a finished experiment whatever it found", () => {
  const message = completionMessage({ title: "Stop caffeine" }, 21);
  expect(message).toMatch(/you now know something/);
  expect(labLanguageProblem(message)).toBeNull();
});
