import type { RecordConfidence, RecordSource } from "@/generated/prisma";

import { SOURCE_SHORT, UNCONFIRMED } from "./records";

/**
 * Which of two disagreeing records to believe.
 *
 * The rule: **a note written at the time, and a document, beat a memory. Always.** Not
 * usually, not unless the memory feels clearer. A voice note recorded on the day the
 * dizziness started outranks a memory of that day formed two weeks later, and the memory
 * feeling more certain is not evidence — it is what memories do as they settle.
 *
 * Third-hand accounts sit below a first-hand memory. "My partner thinks it was the Tuesday"
 * is worth recording and is not worth overruling the person's own recollection with.
 *
 * Two things this file deliberately does not do:
 *
 *   - It does not break a tie. A clinic letter and a note written on the day are both
 *     strong, and when they disagree the honest answer is that we do not know which is
 *     right. `comparePrecedence` returns 0, `proposeWinner` returns null, and the person
 *     is asked. Inventing a tiebreak here would make the system look decisive about
 *     something nobody has decided.
 *   - It never deletes the loser. See `contradictions.ts`.
 */

const SOURCE_RANK: Record<RecordSource, number> = {
  contemporaneous_note: 3,
  document: 3,
  recollection: 2,
  third_party: 1,
};

const CONFIDENCE_RANK: Record<RecordConfidence, number> = {
  confirmed: 3,
  probable: 2,
  unconfirmed: 1,
};

/** Anything carrying provenance. A whole Prisma row is one; so is `{ source, confidence }`. */
export interface Sourced {
  source: RecordSource;
  confidence: RecordConfidence;
}

/**
 * `1` when `a` should be believed over `b`, `-1` when `b` should be believed over `a`,
 * `0` when neither outranks the other and a person has to decide.
 */
export function comparePrecedence(a: Sourced, b: Sourced): -1 | 0 | 1 {
  const bySource = SOURCE_RANK[a.source] - SOURCE_RANK[b.source];
  if (bySource !== 0) return bySource > 0 ? 1 : -1;

  const byConfidence = CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence];
  if (byConfidence !== 0) return byConfidence > 0 ? 1 : -1;

  return 0;
}

/** True when this record is one of the two kinds that outrank a memory. */
export function isStrongSource(source: RecordSource): boolean {
  return source === "contemporaneous_note" || source === "document";
}

export interface WinnerProposal<T extends Sourced> {
  keep: T;
  supersede: T;
  /** The sentence shown next to the proposal. Says which evidence decides it, in plain words. */
  because: string;
}

/**
 * Which record to keep, and why — or null when the evidence does not decide it.
 *
 * Nothing acts on this on its own. It is a suggestion put in front of the person with both
 * versions still on the screen, and it takes effect only when they say so.
 */
export function proposeWinner<T extends Sourced>(a: T, b: T): WinnerProposal<T> | null {
  const order = comparePrecedence(a, b);
  if (order === 0) return null;

  const keep = order > 0 ? a : b;
  const supersede = order > 0 ? b : a;

  const because =
    SOURCE_RANK[keep.source] !== SOURCE_RANK[supersede.source]
      ? `A record ${SOURCE_SHORT[keep.source]} is stronger evidence than one ${SOURCE_SHORT[supersede.source]}.`
      : `Both are ${SOURCE_SHORT[keep.source]}, and you were more sure of one than the other.`;

  return { keep, supersede, because };
}

/**
 * How a value reads once it leaves the app.
 *
 * A date nobody is sure of has to look different from a date somebody read off a letter,
 * everywhere, including in the document handed across a desk. A guessed date that enters a
 * clinical conversation as a fact is the most damaging thing this feature can produce, so
 * uncertainty is spelled out rather than softened.
 */
export function qualify(value: string | null | undefined, confidence: RecordConfidence): string {
  if (value === null || value === undefined || value.trim() === "") return UNCONFIRMED;
  if (confidence === "unconfirmed") return `${value} ${UNCONFIRMED}`;
  if (confidence === "probable") return `${value} (approximate)`;
  return value;
}

/** True when this value would reach a clinician as something nobody has checked. */
export function isUnsettled(value: unknown, confidence: RecordConfidence): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return confidence === "unconfirmed";
}
