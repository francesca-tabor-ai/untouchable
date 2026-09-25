import { labTagLabel } from "./checkin";
import { daysBetween, phaseOn, type Phase } from "./experiments";
import { libraryEntry } from "./library";
import { outcome as outcomeFor, type OutcomeKey } from "./scales";
import type { LabAdherenceRecord, LabCheckInRecord, LabExperimentRecord } from "./types";

/**
 * Baseline against intervention, for one experiment.
 *
 * This is a product-owner exception to AGENTS.md rule 9 (DECISIONS.md HL-01): it compares
 * two periods and says which way the difference points and how big it is. What keeps it
 * honest is that the caveats are computed here, alongside the numbers, and returned as part
 * of the same object — a page cannot show the difference without also being handed every
 * reason to doubt it. Every sentence says "in your data so far".
 *
 * The effect size is Cohen's d: the difference in averages divided by how much your nights
 * normally vary. It is the simplest measure that answers "is this bigger than an ordinary
 * swing?", which is the question a raw difference cannot answer on its own.
 */

export const SMALL_SAMPLE_NIGHTS = 7;
export const LOW_ADHERENCE = 0.8;

export interface PeriodStats {
  n: number;
  mean: number | null;
  sd: number | null;
}

export type EffectBand = "negligible" | "small" | "medium" | "large";

export const EFFECT_LABELS: Record<EffectBand, string> = {
  negligible: "hardly any difference",
  small: "a small difference",
  medium: "a medium-sized difference",
  large: "a large difference",
};

export interface OutcomeComparison {
  key: OutcomeKey;
  label: string;
  unit?: string;
  baseline: PeriodStats;
  intervention: PeriodStats;
  /** Intervention minus baseline, or null when either side has no data. */
  difference: number | null;
  /** Cohen's d. Null with fewer than two nights either side, or no variation at all. */
  effectSize: number | null;
  band: EffectBand | null;
  /** True when the difference points the way this scale is wanted to go. Null when there is none. */
  inWantedDirection: boolean | null;
  /** One plain sentence. Always starts "In your data so far". */
  sentence: string;
}

export interface ConfounderCount {
  tag: string;
  label: string;
  baseline: number;
  intervention: number;
}

export interface Adherence {
  /** Intervention days with a check-in that answered the did-I-do-it question. */
  answered: number;
  done: number;
  /** 0–1, or null when nothing was answered. */
  rate: number | null;
  /** "HH:MM" times recorded, in date order. Matters for shift experiments. */
  times: string[];
}

export interface SeriesPoint {
  date: string;
  phase: Phase;
  values: Partial<Record<OutcomeKey, number>>;
}

export interface ExperimentResult {
  experimentId: string;
  comparisons: OutcomeComparison[];
  adherence: Adherence;
  confounders: ConfounderCount[];
  caveats: string[];
  series: SeriesPoint[];
  interventionDaysPlanned: number;
}

export function analyseExperiment(input: {
  experiment: LabExperimentRecord;
  checkIns: readonly LabCheckInRecord[];
  adherence: readonly LabAdherenceRecord[];
}): ExperimentResult {
  const { experiment, checkIns } = input;

  const byPhase = { baseline: [] as LabCheckInRecord[], intervention: [] as LabCheckInRecord[] };
  const series: SeriesPoint[] = [];

  for (const checkIn of [...checkIns].sort((a, b) => a.date.getTime() - b.date.getTime())) {
    const phase = phaseOn(experiment, checkIn.date);
    if (phase === "baseline" || phase === "intervention") byPhase[phase].push(checkIn);
    if (phase === "before" || phase === "after") continue;

    const values: Partial<Record<OutcomeKey, number>> = {};
    for (const key of experiment.outcomes) {
      const value = checkIn.scores[key];
      if (typeof value === "number") values[key] = value;
    }
    series.push({ date: checkIn.date.toISOString().slice(0, 10), phase, values });
  }

  const comparisons = experiment.outcomes.map((key) =>
    compareOutcome(key, byPhase.baseline, byPhase.intervention),
  );

  const adherence = adherenceFor(experiment, input.adherence);
  const confounders = countConfounders(byPhase.baseline, byPhase.intervention);
  const interventionDaysPlanned =
    daysBetween(experiment.interventionStart, experiment.interventionEnd) + 1;

  return {
    experimentId: experiment.id,
    comparisons,
    adherence,
    confounders,
    caveats: caveatsFor({
      experiment,
      baselineNights: byPhase.baseline.length,
      interventionNights: byPhase.intervention.length,
      adherence,
      confounders,
      interventionDaysPlanned,
    }),
    series,
    interventionDaysPlanned,
  };
}

export function stats(values: readonly number[]): PeriodStats {
  const n = values.length;
  if (n === 0) return { n, mean: null, sd: null };
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  if (n < 2) return { n, mean, sd: null };
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  return { n, mean, sd: Math.sqrt(variance) };
}

/** Cohen's d with a pooled standard deviation. */
export function cohensD(a: PeriodStats, b: PeriodStats): number | null {
  if (a.mean === null || b.mean === null || a.sd === null || b.sd === null) return null;
  const pooled = Math.sqrt(((a.n - 1) * a.sd ** 2 + (b.n - 1) * b.sd ** 2) / (a.n + b.n - 2));
  if (pooled === 0) return null;
  return (b.mean - a.mean) / pooled;
}

export function effectBand(d: number | null): EffectBand | null {
  if (d === null) return null;
  const size = Math.abs(d);
  if (size < 0.2) return "negligible";
  if (size < 0.5) return "small";
  if (size < 0.8) return "medium";
  return "large";
}

function compareOutcome(
  key: OutcomeKey,
  baselineDays: readonly LabCheckInRecord[],
  interventionDays: readonly LabCheckInRecord[],
): OutcomeComparison {
  const meta = outcomeFor(key);
  const pick = (days: readonly LabCheckInRecord[]) =>
    days.map((day) => day.scores[key]).filter((value): value is number => typeof value === "number");

  const baseline = stats(pick(baselineDays));
  const intervention = stats(pick(interventionDays));
  const difference =
    baseline.mean !== null && intervention.mean !== null ? intervention.mean - baseline.mean : null;
  const effectSize = cohensD(baseline, intervention);
  const band = effectBand(effectSize);

  const inWantedDirection =
    difference === null || difference === 0 || band === "negligible"
      ? null
      : meta.lowerIsWanted
        ? difference < 0
        : difference > 0;

  return {
    key,
    label: meta.label,
    unit: meta.unit,
    baseline,
    intervention,
    difference,
    effectSize,
    band,
    inWantedDirection,
    sentence: sentenceFor(meta.short, meta.unit, baseline, intervention, difference, band),
  };
}

export function formatNumber(value: number, unit?: string): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return unit ? `${text} ${unit}` : text;
}

function sentenceFor(
  label: string,
  unit: string | undefined,
  baseline: PeriodStats,
  intervention: PeriodStats,
  difference: number | null,
  band: EffectBand | null,
): string {
  if (baseline.mean === null || intervention.mean === null || difference === null) {
    return `In your data so far, there are not enough scores for ${label.toLowerCase()} in both periods to compare.`;
  }
  const before = formatNumber(baseline.mean, unit);
  const during = formatNumber(intervention.mean, unit);
  const direction =
    Math.abs(difference) < 0.05
      ? "the same"
      : `${formatNumber(Math.abs(difference), unit)} ${difference < 0 ? "lower" : "higher"}`;
  const size = band ? `, which is ${EFFECT_LABELS[band]} compared with how much your days usually vary` : "";
  return `In your data so far, ${label.toLowerCase()} averaged ${before} before and ${during} during: ${direction}${size}.`;
}

function adherenceFor(
  experiment: LabExperimentRecord,
  records: readonly LabAdherenceRecord[],
): Adherence {
  const inPeriod = records
    .filter((record) => record.experimentId === experiment.id)
    .filter((record) => phaseOn(experiment, record.date) === "intervention")
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const done = inPeriod.filter((record) => record.done).length;
  return {
    answered: inPeriod.length,
    done,
    rate: inPeriod.length > 0 ? done / inPeriod.length : null,
    times: inPeriod
      .filter((record) => record.done && record.timeDone)
      .map((record) => record.timeDone as string),
  };
}

function countConfounders(
  baseline: readonly LabCheckInRecord[],
  intervention: readonly LabCheckInRecord[],
): ConfounderCount[] {
  const counts = new Map<string, ConfounderCount>();
  const tally = (days: readonly LabCheckInRecord[], period: "baseline" | "intervention") => {
    for (const day of days) {
      for (const tag of new Set(day.tags)) {
        const entry = counts.get(tag) ?? { tag, label: labTagLabel(tag), baseline: 0, intervention: 0 };
        entry[period] += 1;
        counts.set(tag, entry);
      }
    }
  };
  tally(baseline, "baseline");
  tally(intervention, "intervention");
  return [...counts.values()].sort(
    (a, b) => b.baseline + b.intervention - (a.baseline + a.intervention) || a.label.localeCompare(b.label),
  );
}

/**
 * The honest part. Every caveat that applies, in plain words, most important first. The last
 * one is always there.
 */
function caveatsFor(input: {
  experiment: LabExperimentRecord;
  baselineNights: number;
  interventionNights: number;
  adherence: Adherence;
  confounders: ConfounderCount[];
  interventionDaysPlanned: number;
}): string[] {
  const { experiment, baselineNights, interventionNights, adherence, confounders } = input;
  const caveats: string[] = [];

  if (experiment.confounded) {
    caveats.push(
      "Another experiment aimed at the same things overlapped with this one, so the two cannot be told apart in these numbers.",
    );
  }

  if (baselineNights === 0) {
    caveats.push("There are no check-ins from before the change, so there is nothing to compare against.");
  } else if (baselineNights < SMALL_SAMPLE_NIGHTS || interventionNights < SMALL_SAMPLE_NIGHTS) {
    caveats.push(
      `This is a small sample: ${baselineNights} ${plural(baselineNights, "check-in")} before and ${interventionNights} during. A handful of nights can differ this much by chance.`,
    );
  }

  if (adherence.rate !== null && adherence.rate < LOW_ADHERENCE) {
    caveats.push(
      `You ticked "done" on ${adherence.done} of ${adherence.answered} days (${Math.round(adherence.rate * 100)}%). Days you did not do it are still counted in the "during" average.`,
    );
  } else if (adherence.rate === null && interventionNights > 0) {
    caveats.push("No days were marked as done or not done, so it is not known how often the change was made.");
  }

  const tagged = confounders.filter((count) => count.intervention > 0 || count.baseline > 0);
  if (tagged.length > 0) {
    const list = tagged
      .slice(0, 4)
      .map((count) => `${count.label.toLowerCase()} (${count.baseline} before, ${count.intervention} during)`)
      .join("; ");
    caveats.push(`Other things you logged that also affect sleep: ${list}.`);
  }

  const entry = libraryEntry(experiment.libraryKey);
  if (entry && input.interventionDaysPlanned < entry.minInterventionDays) {
    caveats.push(
      `This ran for ${input.interventionDaysPlanned} days. People usually give "${entry.name.toLowerCase()}" at least ${entry.minInterventionDays} days before judging it.`,
    );
  }

  caveats.push(
    "These are your own numbers over a few weeks, not medical proof. Sleep changes for many reasons, and one run of an experiment cannot rule them all out.",
  );

  return caveats;
}

function plural(count: number, word: string): string {
  return count === 1 ? word : `${word}s`;
}

/**
 * The line shown when an experiment is completed, whatever it found. A result of no
 * difference is a result: it is one fewer thing to wonder about.
 */
export function completionMessage(experiment: Pick<LabExperimentRecord, "title">, days: number): string {
  return `You finished "${experiment.title}": ${days} days of careful noticing. Whatever the numbers show, you now know something about yourself you did not know before.`;
}
