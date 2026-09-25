import { EVIDENCE_LABELS, LAB_LIBRARY, type EvidenceLevel, type LibraryEntry } from "./library";
import type { ExperimentResult } from "./results";
import { outcome, PRIMARY_OUTCOMES, type OutcomeKey } from "./scales";
import type { LabCheckInRecord, LabExperimentRecord } from "./types";

/**
 * What to try next.
 *
 * A product-owner exception to rule 9 (DECISIONS.md HL-01), held narrow in code:
 *
 * - **Exactly one suggestion, or none.** Never a list, never a ranking shown to the person.
 *   One change at a time is the whole method, and a menu of five invites trying three.
 * - **Nothing while an experiment is running or planned.** The answer is "finish this one".
 * - **Only from the library.** Every candidate has already been reviewed, carries its cautions,
 *   and is natural and low-risk. There is no path by which this suggests a medicine.
 * - **The reasons are shown**, as the plain sentences that decided it, so the person can
 *   disagree with the reasoning rather than with a verdict.
 *
 * The scoring is deliberately simple enough to explain in one breath: aimed at what you most
 * want to change, closer to what has already shifted things in your own data, and better
 * researched in general. It is a tie-break between reasonable options, not a prediction.
 */

export type Suggestion =
  | { kind: "wait"; message: string; experimentId: string }
  | { kind: "retest"; experiment: LabExperimentRecord; reasons: string[] }
  | { kind: "try"; entry: LibraryEntry; reasons: string[] }
  | { kind: "exhausted"; message: string };

export interface HistoryItem {
  experiment: LabExperimentRecord;
  /** Present once the experiment has data to analyse. */
  result?: ExperimentResult;
}

const EVIDENCE_POINTS: Record<EvidenceLevel, number> = {
  strong: 3,
  moderate: 2,
  early: 1,
  anecdotal: 0,
};

/** Recent tinnitus intrusiveness at or above this favours the tinnitus entries. */
export const TINNITUS_BOTHERSOME = 5;

const LIVE = new Set(["planned", "baseline", "intervention", "washout"]);

export function suggestNext(input: {
  history: readonly HistoryItem[];
  /** The last couple of weeks of check-ins, for what is bothering the person now. */
  recentCheckIns: readonly LabCheckInRecord[];
}): Suggestion {
  const { history } = input;

  const live = history.find((item) => LIVE.has(item.experiment.status));
  if (live) {
    return {
      kind: "wait",
      experimentId: live.experiment.id,
      message:
        live.experiment.status === "planned"
          ? `You already have "${live.experiment.title}" lined up. One change at a time keeps each result clear.`
          : `"${live.experiment.title}" is still running. Finish it first, so its result is its own.`,
    };
  }

  const retest = history
    .filter((item) => item.experiment.status === "complete" && item.experiment.conclusion === "retest")
    .filter((item) => !rerunSince(item.experiment, history))
    .sort((a, b) => b.experiment.interventionEnd.getTime() - a.experiment.interventionEnd.getTime())[0];

  if (retest) {
    return {
      kind: "retest",
      experiment: retest.experiment,
      reasons: [
        `You marked "${retest.experiment.title}" to run again.`,
        "A second run on its own is the clearest way to see whether the first one was a fluke.",
      ],
    };
  }

  const tried = new Set(
    history
      .filter((item) => item.experiment.status !== "abandoned")
      .map((item) => item.experiment.libraryKey)
      .filter((key): key is string => key !== null),
  );

  const untried = LAB_LIBRARY.filter((entry) => !tried.has(entry.key));
  if (untried.length === 0) {
    return {
      kind: "exhausted",
      message:
        "You have tried everything in the library. You could run one again, or build your own experiment.",
    };
  }

  const shifted = outcomesShiftedByKeptExperiments(history);
  const tinnitusBothersome = recentAverage(input.recentCheckIns, "tinnitusIntrusiveness") >= TINNITUS_BOTHERSOME;

  const scored = untried.map((entry, index) => {
    let score = EVIDENCE_POINTS[entry.evidence];
    const reasons: string[] = ["You have not tried it yet."];

    const primary = entry.outcomes.filter((key) => PRIMARY_OUTCOMES.includes(key));
    if (primary.length > 0) {
      score += 3;
      reasons.push(`It is aimed at ${listOf(primary)}, the main thing you are here to change.`);
    }

    const near = [...shifted.entries()].filter(([key]) => entry.outcomes.includes(key));
    if (near.length > 0) {
      score += 2;
      const [key, title] = near[0];
      reasons.push(
        `In your data so far, "${title}" moved ${outcome(key).short.toLowerCase()} the way you wanted, and this is aimed at the same thing.`,
      );
    }

    if (tinnitusBothersome && entry.outcomes.includes("tinnitusIntrusiveness")) {
      score += 2;
      reasons.push("Your recent check-ins say the tinnitus has been getting in the way.");
    }

    reasons.push(`Research on it: ${EVIDENCE_LABELS[entry.evidence].toLowerCase()}.`);
    return { entry, score, index, reasons };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  const best = scored[0];
  return { kind: "try", entry: best.entry, reasons: best.reasons };
}

function rerunSince(experiment: LabExperimentRecord, history: readonly HistoryItem[]): boolean {
  return history.some(
    (item) =>
      item.experiment.id !== experiment.id &&
      item.experiment.baselineStart.getTime() > experiment.interventionEnd.getTime() &&
      (experiment.libraryKey
        ? item.experiment.libraryKey === experiment.libraryKey
        : item.experiment.title === experiment.title),
  );
}

/** Outcome → the title of a kept experiment that moved it in the wanted direction. */
function outcomesShiftedByKeptExperiments(history: readonly HistoryItem[]): Map<OutcomeKey, string> {
  const shifted = new Map<OutcomeKey, string>();
  for (const item of history) {
    if (item.experiment.conclusion !== "keep" || item.experiment.confounded || !item.result) continue;
    for (const comparison of item.result.comparisons) {
      if (comparison.inWantedDirection && !shifted.has(comparison.key)) {
        shifted.set(comparison.key, item.experiment.title);
      }
    }
  }
  return shifted;
}

function recentAverage(checkIns: readonly LabCheckInRecord[], key: OutcomeKey): number {
  const values = checkIns
    .map((checkIn) => checkIn.scores[key])
    .filter((value): value is number => typeof value === "number");
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function listOf(keys: readonly OutcomeKey[]): string {
  const words = keys.map((key) => outcome(key).short.toLowerCase());
  return words.length <= 1 ? words.join("") : `${words.slice(0, -1).join(", ")} and ${words.at(-1)}`;
}

