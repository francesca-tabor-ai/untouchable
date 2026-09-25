import type {
  LabAdherenceRecord,
  LabCheckInRecord,
  LabExperimentRecord,
  Scores,
} from "@/lib/lab";

/** Fictional data only. Nobody real is in these numbers. */

export const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function isoPlus(start: string, days: number): string {
  return new Date(day(start).getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

let counter = 0;

export function checkIn(date: string, scores: Scores, extra: Partial<LabCheckInRecord> = {}): LabCheckInRecord {
  counter += 1;
  return {
    id: `c${counter}`,
    date: day(date),
    scores,
    tags: [],
    newSymptoms: [],
    note: null,
    ...extra,
  };
}

export function experiment(extra: Partial<LabExperimentRecord> = {}): LabExperimentRecord {
  counter += 1;
  return {
    id: `e${counter}`,
    libraryKey: "magnesium",
    title: "Magnesium in the evening",
    variableType: "add",
    variableDetail: null,
    hypothesis: "I might fall asleep sooner.",
    outcomes: ["sleepLatencyMin", "racingMind"],
    baselineStart: day("2026-09-01"),
    interventionStart: day("2026-09-08"),
    interventionEnd: day("2026-09-21"),
    washoutDays: 0,
    status: "intervention",
    confounded: false,
    conclusion: null,
    conclusionNote: null,
    concludedAt: null,
    sourcePaperIds: [],
    ...extra,
  };
}

/**
 * Seven baseline nights and fourteen intervention nights, with latency values given per night.
 */
export function run(
  baseline: number[],
  intervention: number[],
  start = "2026-09-01",
): LabCheckInRecord[] {
  return [
    ...baseline.map((value, index) =>
      checkIn(isoPlus(start, index), { sleepLatencyMin: value, racingMind: 6 }),
    ),
    ...intervention.map((value, index) =>
      checkIn(isoPlus(start, baseline.length + index), { sleepLatencyMin: value, racingMind: 5 }),
    ),
  ];
}

export function doneEvery(experimentId: string, start: string, days: number, doneDays = days): LabAdherenceRecord[] {
  return Array.from({ length: days }, (_, index) => ({
    experimentId,
    date: day(isoPlus(start, index)),
    done: index < doneDays,
    timeDone: index < doneDays ? "21:30" : null,
  }));
}
