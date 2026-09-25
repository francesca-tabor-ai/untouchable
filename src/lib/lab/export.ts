import { formatDate } from "@/lib/tracking/dates";

import { labTagLabel, RED_FLAG_QUESTIONS } from "./checkin";
import { chronological, daysBetween } from "./experiments";
import { formatNumber, stats, type ExperimentResult } from "./results";
import { OUTCOMES } from "./scales";
import type { LabAdherenceRecord, LabCheckInRecord, LabExperimentRecord } from "./types";

/**
 * The person's own Habit Lab data, as files they keep.
 *
 * Free text is included in the CSV and JSON. This is somebody receiving their own words back,
 * the same reasoning as `timeline/export.ts`, and the opposite case from a research export,
 * where free text never leaves at all (rule 7). Nothing in this module is a research export,
 * and nothing in `research/` imports it.
 *
 * The GP summary leaves the notes and hypotheses out. It is one page for a ten-minute
 * appointment, and a clinician needs the numbers and what was tried, not a diary.
 */

export const EXPORT_VERSION = 1;

export function checkInsCsv(
  checkIns: readonly LabCheckInRecord[],
  adherence: readonly LabAdherenceRecord[],
  experiments: readonly LabExperimentRecord[],
): string {
  const titles = new Map(experiments.map((experiment) => [experiment.id, experiment.title]));
  const header = [
    "date",
    ...OUTCOMES.map((outcome) => outcome.key),
    "tags",
    "new_symptoms",
    "done",
    "note",
  ];

  const rows = [...checkIns]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((checkIn) => {
      const day = isoDate(checkIn.date);
      const done = adherence
        .filter((record) => isoDate(record.date) === day)
        .map(
          (record) =>
            `${titles.get(record.experimentId) ?? record.experimentId}: ${record.done ? "yes" : "no"}${
              record.timeDone ? ` at ${record.timeDone}` : ""
            }`,
        )
        .join("; ");

      return [
        day,
        ...OUTCOMES.map((outcome) => checkIn.scores[outcome.key] ?? ""),
        checkIn.tags.map(labTagLabel).join("; "),
        checkIn.newSymptoms.join("; "),
        done,
        checkIn.note ?? "",
      ];
    });

  return toCsv([header, ...rows]);
}

export function experimentsCsv(experiments: readonly LabExperimentRecord[]): string {
  const header = [
    "title",
    "library_key",
    "variable_type",
    "variable_detail",
    "hypothesis",
    "outcomes",
    "baseline_start",
    "intervention_start",
    "intervention_end",
    "washout_days",
    "status",
    "confounded",
    "conclusion",
    "conclusion_note",
  ];
  const rows = chronological(experiments).map((experiment) => [
    experiment.title,
    experiment.libraryKey ?? "",
    experiment.variableType,
    experiment.variableDetail ?? "",
    experiment.hypothesis,
    experiment.outcomes.join("; "),
    isoDate(experiment.baselineStart),
    isoDate(experiment.interventionStart),
    isoDate(experiment.interventionEnd),
    experiment.washoutDays,
    experiment.status,
    experiment.confounded ? "yes" : "no",
    experiment.conclusion ?? "",
    experiment.conclusionNote ?? "",
  ]);
  return toCsv([header, ...rows]);
}

export function labJson(input: {
  checkIns: readonly LabCheckInRecord[];
  experiments: readonly LabExperimentRecord[];
  adherence: readonly LabAdherenceRecord[];
  exportedAt: Date;
}): string {
  return JSON.stringify(
    {
      version: EXPORT_VERSION,
      exportedAt: input.exportedAt.toISOString(),
      checkIns: [...input.checkIns]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((checkIn) => ({ ...checkIn, date: isoDate(checkIn.date) })),
      experiments: chronological(input.experiments).map((experiment) => ({
        ...experiment,
        baselineStart: isoDate(experiment.baselineStart),
        interventionStart: isoDate(experiment.interventionStart),
        interventionEnd: isoDate(experiment.interventionEnd),
        concludedAt: experiment.concludedAt?.toISOString() ?? null,
      })),
      adherence: input.adherence.map((record) => ({ ...record, date: isoDate(record.date) })),
    },
    null,
    2,
  );
}

const CONCLUSION_LABELS = { keep: "Keeping it", drop: "Dropped it", retest: "Will run again" } as const;

/**
 * One page for a GP or specialist, as Markdown. Opens in anything and prints on one sheet.
 *
 * It states what was recorded and what was tried. It draws no conclusion on the clinician's
 * behalf beyond the person's own keep / drop / retest, which is labelled as theirs.
 */
export function gpSummaryMarkdown(input: {
  checkIns: readonly LabCheckInRecord[];
  experiments: readonly LabExperimentRecord[];
  results: ReadonlyMap<string, ExperimentResult>;
  today: Date;
}): string {
  const { checkIns, experiments, results, today } = input;
  const sorted = [...checkIns].sort((a, b) => a.date.getTime() - b.date.getTime());
  const lines: string[] = ["# Sleep and habits: self-recorded summary", ""];

  if (sorted.length === 0) {
    lines.push("No check-ins recorded yet.");
    return lines.join("\n");
  }

  const first = sorted[0].date;
  const last = sorted[sorted.length - 1].date;
  lines.push(
    `Prepared ${formatDate(today)}. ${sorted.length} daily check-ins between ${formatDate(first)} and ${formatDate(last)}, recorded by the patient each morning. Scores are their own ratings, not measurements.`,
    "",
  );

  const recent = sorted.filter((checkIn) => daysBetween(checkIn.date, last) < 14);
  lines.push(`## The last two weeks (${recent.length} check-ins)`, "", "| Measure | Average | Range |", "|---|---|---|");
  for (const outcome of OUTCOMES) {
    const values = recent
      .map((checkIn) => checkIn.scores[outcome.key])
      .filter((value): value is number => typeof value === "number");
    if (values.length === 0) continue;
    const { mean } = stats(values);
    const scale = outcome.unit ? "" : ` (${outcome.min}–${outcome.max})`;
    lines.push(
      `| ${outcome.label}${scale} | ${formatNumber(mean as number, outcome.unit)} | ${formatNumber(Math.min(...values), outcome.unit)} to ${formatNumber(Math.max(...values), outcome.unit)} |`,
    );
  }
  lines.push("");

  const flagged = sorted.filter((checkIn) => checkIn.newSymptoms.length > 0);
  lines.push("## New symptoms the patient ticked", "");
  if (flagged.length === 0) {
    lines.push("None.");
  } else {
    for (const checkIn of flagged) {
      const labels = checkIn.newSymptoms.map(
        (value) => RED_FLAG_QUESTIONS.find((question) => question.value === value)?.label ?? value,
      );
      lines.push(`- ${formatDate(checkIn.date)}: ${labels.join("; ")}`);
    }
  }
  lines.push("");

  lines.push("## Changes tried, one at a time", "");
  const ordered = chronological(experiments).filter((experiment) => experiment.status !== "planned");
  if (ordered.length === 0) lines.push("None yet.");
  for (const experiment of ordered) {
    const result = results.get(experiment.id);
    const detail = experiment.variableDetail ? ` (${experiment.variableDetail})` : "";
    const verdict = experiment.conclusion
      ? ` Patient's own conclusion: ${CONCLUSION_LABELS[experiment.conclusion].toLowerCase()}.`
      : experiment.status === "abandoned"
        ? " Stopped early."
        : "";
    const adherence =
      result?.adherence.rate != null ? ` Done on ${Math.round(result.adherence.rate * 100)}% of days.` : "";
    const confounded = experiment.confounded ? " Overlapped with another change." : "";

    lines.push(
      `- **${experiment.title}**${detail}, ${formatDate(experiment.interventionStart)} to ${formatDate(experiment.interventionEnd)}.${adherence}${confounded}${verdict}`,
    );
    for (const comparison of result?.comparisons.slice(0, 3) ?? []) {
      if (comparison.baseline.mean === null || comparison.intervention.mean === null) continue;
      lines.push(
        `  - ${comparison.label}: ${formatNumber(comparison.baseline.mean, comparison.unit)} before (n=${comparison.baseline.n}), ${formatNumber(comparison.intervention.mean, comparison.unit)} during (n=${comparison.intervention.n}).`,
      );
    }
  }
  lines.push(
    "",
    "Self-experiments of a few weeks each. Small samples, not blinded, and not medical evidence.",
  );

  return lines.join("\n");
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** RFC 4180, with formula-looking cells defused so a spreadsheet never runs one. */
export function toCsv(rows: readonly (readonly (string | number | null)[])[]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvCell(value: string | number | null): string {
  if (value === null) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text) && typeof value === "string") text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
