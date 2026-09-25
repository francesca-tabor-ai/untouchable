import { z } from "zod";

import { toDateOnly } from "@/lib/tracking/dates";

import { libraryEntry } from "./library";
import { isOutcomeKey, type OutcomeKey } from "./scales";
import type { ExperimentStatus, LabExperimentRecord, VariableType } from "./types";

/**
 * Experiments: one variable, a baseline, an intervention, and an optional washout.
 *
 * The one rule this module exists to hold is **one change at a time**. Two experiments that
 * run over the same days and are aimed at the same outcome cannot be told apart in the data,
 * however carefully each was logged. The builder warns, the person may go ahead anyway (it is
 * their body and their life, and a holiday does not wait for an experiment to finish), and if
 * they do, the result is marked `confounded` for good.
 */

export const DEFAULT_BASELINE_DAYS = 7;
export const DEFAULT_INTERVENTION_DAYS = 14;
export const MAX_PHASE_DAYS = 90;
export const MAX_WASHOUT_DAYS = 30;

const DAY = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(toDateOnly(date).getTime() + days * DAY);
}

/** Whole days from `a` to `b`. */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((toDateOnly(b).getTime() - toDateOnly(a).getTime()) / DAY);
}

export const experimentSchema = z
  .object({
    libraryKey: z.string().nullable(),
    title: z.string().trim().min(1, "Give the experiment a name.").max(120),
    variableType: z.enum(["remove", "add", "shift"]),
    variableDetail: z.string().trim().max(300).nullable(),
    hypothesis: z
      .string()
      .trim()
      .min(1, "Write what you think might happen, in your own words.")
      .max(500),
    outcomes: z
      .array(z.string())
      .min(1, "Choose at least one thing to watch.")
      .refine((keys) => keys.every(isOutcomeKey), "Unknown outcome."),
    baselineStart: z.date(),
    baselineDays: z.number().int().min(0).max(MAX_PHASE_DAYS),
    interventionDays: z.number().int().min(1).max(MAX_PHASE_DAYS),
    washoutDays: z.number().int().min(0).max(MAX_WASHOUT_DAYS),
    /** Ticked on the overlap warning. Without it, an overlapping experiment is not saved. */
    acceptConfounding: z.boolean(),
  })
  .refine((value) => value.libraryKey === null || libraryEntry(value.libraryKey) !== null, {
    message: "That is not in the library.",
    path: ["libraryKey"],
  });

export type ExperimentInput = z.infer<typeof experimentSchema>;

export interface ExperimentPlan {
  baselineStart: Date;
  interventionStart: Date;
  interventionEnd: Date;
  washoutDays: number;
}

/** Dates for a new experiment. `interventionEnd` is the last day of the intervention, inclusive. */
export function planDates(input: {
  baselineStart: Date;
  baselineDays: number;
  interventionDays: number;
  washoutDays: number;
}): ExperimentPlan {
  const baselineStart = toDateOnly(input.baselineStart);
  const interventionStart = addDays(baselineStart, input.baselineDays);
  return {
    baselineStart,
    interventionStart,
    interventionEnd: addDays(interventionStart, input.interventionDays - 1),
    washoutDays: input.washoutDays,
  };
}

export type Phase = "before" | "baseline" | "intervention" | "washout" | "after";

export function phaseOn(plan: ExperimentPlan, date: Date): Phase {
  const day = toDateOnly(date).getTime();
  if (day < plan.baselineStart.getTime()) return "before";
  if (day < plan.interventionStart.getTime()) return "baseline";
  if (day <= plan.interventionEnd.getTime()) return "intervention";
  if (day <= addDays(plan.interventionEnd, plan.washoutDays).getTime()) return "washout";
  return "after";
}

/**
 * The status an experiment should have today. Abandoned and complete are decisions the person
 * made, and a date never overrides them. Otherwise the calendar decides — nobody should have
 * to press "start intervention" at midnight.
 */
export type DerivedStatus = ExperimentStatus | "ready_to_conclude";

export function statusOn(
  experiment: Pick<LabExperimentRecord, "status"> & ExperimentPlan,
  today: Date,
): DerivedStatus {
  if (experiment.status === "abandoned" || experiment.status === "complete") {
    return experiment.status;
  }
  switch (phaseOn(experiment, today)) {
    case "before":
      return "planned";
    case "baseline":
      return "baseline";
    case "intervention":
      return "intervention";
    case "washout":
      return "washout";
    case "after":
      // Finished running, waiting for the person to write a conclusion. Not stored: the
      // stored status only moves to `complete` when they do.
      return "ready_to_conclude";
  }
}

/** The stored status to write back, which never includes the derived "ready" state. */
export function storedStatusOn(
  experiment: Pick<LabExperimentRecord, "status"> & ExperimentPlan,
  today: Date,
): ExperimentStatus {
  const derived = statusOn(experiment, today);
  return derived === "ready_to_conclude" ? "washout" : derived;
}

export const STATUS_LABELS: Record<DerivedStatus, string> = {
  planned: "Not started",
  baseline: "Measuring your usual",
  intervention: "Trying the change",
  washout: "Washout",
  ready_to_conclude: "Finished: ready for your conclusion",
  complete: "Complete",
  abandoned: "Stopped early",
};

/** Running means the variable is in play: did-I-do-it boxes appear on the check-in. */
export function isInIntervention(experiment: ExperimentPlan & Pick<LabExperimentRecord, "status">, today: Date): boolean {
  return statusOn(experiment, today) === "intervention";
}

/**
 * Still being measured: its check-in days count towards a result. Baseline days count too —
 * starting a second change during someone else's baseline spoils the baseline.
 */
function footprint(plan: ExperimentPlan): { start: number; end: number } {
  return {
    start: plan.baselineStart.getTime(),
    end: addDays(plan.interventionEnd, plan.washoutDays).getTime(),
  };
}

export interface Overlap {
  experimentId: string;
  title: string;
  sharedOutcomes: OutcomeKey[];
  /** Days both are being measured. */
  sharedDays: number;
}

/**
 * Every other live experiment that shares days *and* an outcome with this plan. Sharing days
 * alone is fine — a sleep experiment and a separate mood one do not muddy each other.
 */
export function findOverlaps(
  plan: ExperimentPlan & { outcomes: readonly OutcomeKey[] },
  others: readonly LabExperimentRecord[],
  excludeId?: string,
): Overlap[] {
  const mine = footprint(plan);
  const overlaps: Overlap[] = [];

  for (const other of others) {
    if (other.id === excludeId || other.status === "abandoned") continue;
    const theirs = footprint(other);
    const start = Math.max(mine.start, theirs.start);
    const end = Math.min(mine.end, theirs.end);
    if (start > end) continue;

    const sharedOutcomes = plan.outcomes.filter((key) => other.outcomes.includes(key));
    if (sharedOutcomes.length === 0) continue;

    overlaps.push({
      experimentId: other.id,
      title: other.title,
      sharedOutcomes,
      sharedDays: Math.round((end - start) / DAY) + 1,
    });
  }

  return overlaps;
}

export type BuildDecision =
  | { ok: true; plan: ExperimentPlan; confounded: boolean; overlaps: Overlap[] }
  | { ok: false; reason: "needs_confirmation"; overlaps: Overlap[] };

/**
 * Decide whether an experiment can be saved as submitted.
 *
 * An overlap blocks the first submission and returns the overlaps for the warning. The second
 * submission, with `acceptConfounding` ticked, is saved and labelled confounded. The label is
 * decided here, not in the form, so there is no path that saves an overlapping experiment
 * without it.
 */
export function decideBuild(
  input: ExperimentInput,
  existing: readonly LabExperimentRecord[],
): BuildDecision {
  const plan = planDates(input);
  const overlaps = findOverlaps(
    { ...plan, outcomes: input.outcomes as OutcomeKey[] },
    existing,
  );
  if (overlaps.length > 0 && !input.acceptConfounding) {
    return { ok: false, reason: "needs_confirmation", overlaps };
  }
  return { ok: true, plan, confounded: overlaps.length > 0, overlaps };
}

/**
 * Starting a new experiment can confound one that is already running. Those get the label
 * too — the muddying works in both directions.
 */
export function experimentsToMarkConfounded(overlaps: readonly Overlap[]): string[] {
  return overlaps.map((overlap) => overlap.experimentId);
}

/** Defaults for the builder when the person picks something from the library. */
export function draftFromLibrary(key: string, today: Date) {
  const entry = libraryEntry(key);
  if (!entry) return null;
  return {
    libraryKey: entry.key,
    title: entry.name,
    variableType: entry.type as VariableType,
    outcomes: [...entry.outcomes],
    baselineStart: toDateOnly(today),
    baselineDays: DEFAULT_BASELINE_DAYS,
    interventionDays: Math.max(DEFAULT_INTERVENTION_DAYS, entry.minInterventionDays),
    washoutDays: 0,
  };
}

/** Every experiment ever run, oldest first — the timeline. */
export function chronological<T extends Pick<LabExperimentRecord, "baselineStart" | "title">>(
  experiments: readonly T[],
): T[] {
  return [...experiments].sort(
    (a, b) =>
      a.baselineStart.getTime() - b.baselineStart.getTime() || a.title.localeCompare(b.title),
  );
}
