import { describe, expect, it } from "vitest";

import {
  decideBuild,
  draftFromLibrary,
  experimentSchema,
  findOverlaps,
  phaseOn,
  planDates,
  statusOn,
  type ExperimentInput,
} from "@/lib/lab";

import { day, experiment } from "./lab-fixtures";

const input = (extra: Partial<ExperimentInput> = {}): ExperimentInput => ({
  libraryKey: "meditation",
  title: "Meditation",
  variableType: "add",
  variableDetail: null,
  hypothesis: "My mind might quieten down at bedtime.",
  outcomes: ["racingMind"],
  baselineStart: day("2026-09-10"),
  baselineDays: 7,
  interventionDays: 14,
  washoutDays: 0,
  acceptConfounding: false,
  ...extra,
});

describe("dates", () => {
  it("lays out baseline then intervention, end inclusive", () => {
    const plan = planDates({ baselineStart: day("2026-09-01"), baselineDays: 7, interventionDays: 14, washoutDays: 3 });
    expect(plan.interventionStart).toEqual(day("2026-09-08"));
    expect(plan.interventionEnd).toEqual(day("2026-09-21"));
    expect(phaseOn(plan, day("2026-08-31"))).toBe("before");
    expect(phaseOn(plan, day("2026-09-07"))).toBe("baseline");
    expect(phaseOn(plan, day("2026-09-08"))).toBe("intervention");
    expect(phaseOn(plan, day("2026-09-21"))).toBe("intervention");
    expect(phaseOn(plan, day("2026-09-24"))).toBe("washout");
    expect(phaseOn(plan, day("2026-09-25"))).toBe("after");
  });

  it("moves status by the calendar, but never overrides a decision the person made", () => {
    const running = experiment({ status: "planned" });
    expect(statusOn(running, day("2026-09-10"))).toBe("intervention");
    expect(statusOn(running, day("2026-10-01"))).toBe("ready_to_conclude");
    expect(statusOn(experiment({ status: "abandoned" }), day("2026-09-10"))).toBe("abandoned");
  });
});

describe("one change at a time", () => {
  const running = experiment({ id: "mag", outcomes: ["sleepLatencyMin", "racingMind"] });

  it("warns about an experiment that shares days and an outcome", () => {
    const overlaps = findOverlaps({ ...planDates(input()), outcomes: ["racingMind"] }, [running]);
    expect(overlaps).toEqual([
      expect.objectContaining({ experimentId: "mag", sharedOutcomes: ["racingMind"], sharedDays: 12 }),
    ]);
  });

  it("does not warn when the outcomes are separate", () => {
    expect(findOverlaps({ ...planDates(input()), outcomes: ["mood"] }, [running])).toEqual([]);
  });

  it("does not warn when the days are separate, washout included", () => {
    const later = planDates({ ...input(), baselineStart: day("2026-09-22") });
    expect(findOverlaps({ ...later, outcomes: ["racingMind"] }, [running])).toEqual([]);

    const withWashout = experiment({ outcomes: ["racingMind"], washoutDays: 5 });
    expect(findOverlaps({ ...later, outcomes: ["racingMind"] }, [withWashout])).toHaveLength(1);
  });

  it("ignores an abandoned experiment", () => {
    expect(
      findOverlaps({ ...planDates(input()), outcomes: ["racingMind"] }, [
        experiment({ status: "abandoned" }),
      ]),
    ).toEqual([]);
  });

  it("stops the first submission, then saves it labelled confounded", () => {
    const first = decideBuild(input(), [running]);
    expect(first.ok).toBe(false);

    const second = decideBuild(input({ acceptConfounding: true }), [running]);
    expect(second).toMatchObject({ ok: true, confounded: true });
  });

  it("does not label a clean experiment", () => {
    expect(decideBuild(input(), [])).toMatchObject({ ok: true, confounded: false });
  });
});

describe("the builder", () => {
  it("needs a hypothesis in the person's own words", () => {
    expect(experimentSchema.safeParse(input({ hypothesis: "  " })).success).toBe(false);
  });

  it("refuses an outcome it does not know or a library key that is not there", () => {
    expect(experimentSchema.safeParse({ ...input(), outcomes: ["happiness"] }).success).toBe(false);
    expect(experimentSchema.safeParse(input({ libraryKey: "melatonin" })).success).toBe(false);
  });

  it("allows a custom variable", () => {
    expect(experimentSchema.safeParse(input({ libraryKey: null, title: "No podcasts in bed" })).success).toBe(true);
  });

  it("defaults to a 7-day baseline and at least the library's fair-go length", () => {
    expect(draftFromLibrary("meditation", day("2026-09-01"))).toMatchObject({
      baselineDays: 7,
      interventionDays: 21,
      variableType: "add",
    });
    expect(draftFromLibrary("caffeine_removal", day("2026-09-01"))?.interventionDays).toBe(14);
  });
});
