/**
 * What a Habit Lab check-in measures.
 *
 * One list, so the check-in form, the results table, the chart and the export can never
 * disagree about a label, a range, or which way a scale runs.
 *
 * `lowerIs` says what the low end of a scale *means* — "fewer minutes lying awake", "quieter"
 * — because a difference of −1.4 is meaningless until you know whether the scale counts
 * something you want more of or less of. It is a definition of the scale, which a number needs
 * in order to mean anything. The results view uses it to say which way a difference points,
 * and the suggestion engine uses it to tell a change you wanted from one you did not
 * (DECISIONS.md HL-01).
 */

export type OutcomeKey =
  | "sleepLatencyMin"
  | "wakeups"
  | "sleepHours"
  | "sleepQuality"
  | "racingMind"
  | "tinnitusLoudness"
  | "tinnitusIntrusiveness"
  | "dizziness"
  | "energy"
  | "mood"
  | "stress";

export type OutcomeGroup = "sleep" | "ears" | "day";

export interface Outcome {
  key: OutcomeKey;
  group: OutcomeGroup;
  label: string;
  /** A short form for chart legends and CSV headers. */
  short: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Words at each end of the scale, so a number is never unanchored. */
  anchors?: [string, string];
  /** True when a lower number is the direction people running this want. */
  lowerIsWanted: boolean;
}

export const OUTCOMES: readonly Outcome[] = [
  {
    key: "sleepLatencyMin",
    group: "sleep",
    label: "Minutes to fall asleep",
    short: "Time to sleep",
    min: 0,
    max: 300,
    step: 5,
    unit: "min",
    lowerIsWanted: true,
  },
  {
    key: "wakeups",
    group: "sleep",
    label: "Times you woke in the night",
    short: "Wake-ups",
    min: 0,
    max: 20,
    step: 1,
    lowerIsWanted: true,
  },
  {
    key: "sleepHours",
    group: "sleep",
    label: "Hours of sleep, roughly",
    short: "Sleep hours",
    min: 0,
    max: 14,
    step: 0.5,
    unit: "h",
    lowerIsWanted: false,
  },
  {
    key: "sleepQuality",
    group: "sleep",
    label: "How the sleep felt",
    short: "Sleep quality",
    min: 1,
    max: 10,
    step: 1,
    anchors: ["Awful", "Deep and restful"],
    lowerIsWanted: false,
  },
  {
    key: "racingMind",
    group: "sleep",
    label: "Racing mind at bedtime",
    short: "Racing mind",
    min: 0,
    max: 10,
    step: 1,
    anchors: ["Quiet", "Would not switch off"],
    lowerIsWanted: true,
  },
  {
    key: "tinnitusLoudness",
    group: "ears",
    label: "Tinnitus loudness",
    short: "Tinnitus loudness",
    min: 0,
    max: 10,
    step: 1,
    anchors: ["Silent", "As loud as it gets"],
    lowerIsWanted: true,
  },
  {
    key: "tinnitusIntrusiveness",
    group: "ears",
    label: "How much the tinnitus got in the way",
    short: "Tinnitus intrusiveness",
    min: 0,
    max: 10,
    step: 1,
    anchors: ["Not at all", "Could think of nothing else"],
    lowerIsWanted: true,
  },
  {
    key: "dizziness",
    group: "ears",
    label: "Dizziness",
    short: "Dizziness",
    min: 0,
    max: 10,
    step: 1,
    anchors: ["None", "Could not stand"],
    lowerIsWanted: true,
  },
  {
    key: "energy",
    group: "day",
    label: "Energy",
    short: "Energy",
    min: 1,
    max: 10,
    step: 1,
    anchors: ["Empty", "Plenty"],
    lowerIsWanted: false,
  },
  {
    key: "mood",
    group: "day",
    label: "Mood",
    short: "Mood",
    min: 1,
    max: 10,
    step: 1,
    anchors: ["Very low", "Very good"],
    lowerIsWanted: false,
  },
  {
    key: "stress",
    group: "day",
    label: "Stress",
    short: "Stress",
    min: 1,
    max: 10,
    step: 1,
    anchors: ["Calm", "Overwhelmed"],
    lowerIsWanted: true,
  },
];

export const OUTCOME_KEYS: readonly OutcomeKey[] = OUTCOMES.map((outcome) => outcome.key);

const BY_KEY = new Map(OUTCOMES.map((outcome) => [outcome.key, outcome]));

export function outcome(key: OutcomeKey): Outcome {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`Unknown outcome: ${key}`);
  return found;
}

export function isOutcomeKey(value: string): value is OutcomeKey {
  return BY_KEY.has(value as OutcomeKey);
}

/** The two the whole lab exists for. Suggestions start here. */
export const PRIMARY_OUTCOMES: readonly OutcomeKey[] = ["sleepLatencyMin", "racingMind"];
