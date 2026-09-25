import type { OutcomeKey } from "./scales";

/**
 * The Habit Lab's records, as plain shapes.
 *
 * These mirror `docs/habit-lab/schema-proposal.prisma` field for field. They are written out
 * here rather than imported from `@/generated/prisma` so that every rule in `src/lib/lab/` is
 * a pure function over plain data: testable without a database, and unchanged by whichever way
 * the rows are eventually loaded.
 */

export type VariableType = "remove" | "add" | "shift";

export type ExperimentStatus =
  | "planned"
  | "baseline"
  | "intervention"
  | "washout"
  | "complete"
  | "abandoned";

export type Conclusion = "keep" | "drop" | "retest";

export type Scores = Partial<Record<OutcomeKey, number | null>>;

export interface LabCheckInRecord {
  id: string;
  /** Midnight UTC for the UK calendar day, as `tracking/dates.ts` defines it. */
  date: Date;
  scores: Scores;
  tags: string[];
  newSymptoms: string[];
  /** FREE TEXT — never exported for research. */
  note: string | null;
}

export interface LabExperimentRecord {
  id: string;
  libraryKey: string | null;
  title: string;
  variableType: VariableType;
  variableDetail: string | null;
  hypothesis: string;
  outcomes: OutcomeKey[];
  baselineStart: Date;
  interventionStart: Date;
  interventionEnd: Date;
  washoutDays: number;
  status: ExperimentStatus;
  confounded: boolean;
  conclusion: Conclusion | null;
  conclusionNote: string | null;
  concludedAt: Date | null;
  sourcePaperIds: string[];
}

export interface LabAdherenceRecord {
  experimentId: string;
  /** The check-in's date, denormalised so results never need a join. */
  date: Date;
  done: boolean;
  /** "HH:MM", or null. */
  timeDone: string | null;
}
