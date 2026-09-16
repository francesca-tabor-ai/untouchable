import type { Answers, AnswerValue } from "./answers";
import type { Scoring } from "./definition";

/**
 * Scoring, as arithmetic and nothing else.
 *
 * Brief 7.3 asks for sum, mean and a custom mapping, defined per questionnaire. Brief
 * principle 7 and AGENTS.md rule 9 say the product never interprets. So this module
 * produces a number, and that is the whole of its job: there is no "good", no "worse than
 * last time", no band, no label. A number and a date is all anybody is ever shown.
 *
 * Pure, and deliberately dull.
 */

export interface Score {
  /** The number, or null when nothing the score is made from was answered. */
  value: number | null;
  /** How many of the scored questions had an answer. */
  answered: number;
  /** How many questions the score is defined over. */
  total: number;
  method: Scoring["method"];
  /** The bounds the questionnaire declares, if it declares any. Shown as "x out of y". */
  scale: { min: number; max: number } | null;
}

export const NO_SCORE: Score = {
  value: null,
  answered: 0,
  total: 0,
  method: "none",
  scale: null,
};

/**
 * Work out the score for a set of answers.
 *
 * **Missing optional answers do not count as zero.** A question somebody chose not to
 * answer is absent, not "the worst possible answer" — treating it as zero would quietly
 * invent data about a person, and would drag a mean down for no reason but silence. Absent
 * items are left out of both the total and the divisor, and if nothing at all was answered
 * the score is null rather than 0.
 */
export function scoreAnswers(scoring: Scoring, answers: Answers): Score {
  if (scoring.method === "none") return NO_SCORE;

  const scale = scoring.scale ?? null;
  const numbers: number[] = [];

  for (const key of scoring.items) {
    const answer = answers[key];
    if (answer === undefined) continue;

    if (scoring.method === "map") {
      const mapped = scoring.mapping[key]?.[codeFor(answer)];
      // An answer with no entry in the mapping is not scored. It is not zero either: a
      // mapping that does not mention an answer has said nothing about it.
      if (mapped === undefined) continue;
      numbers.push(mapped);
      continue;
    }

    if (typeof answer !== "number" || !Number.isFinite(answer)) continue;
    numbers.push(answer);
  }

  const total = scoring.items.length;
  const answered = numbers.length;

  if (answered === 0) {
    return { value: null, answered: 0, total, method: scoring.method, scale };
  }

  const sum = numbers.reduce((running, next) => running + next, 0);
  const aggregate = scoring.method === "mean" ? "mean" : scoring.method === "map" ? scoring.aggregate : "sum";
  const value = aggregate === "mean" ? sum / answered : sum;

  return { value: round(value), answered, total, method: scoring.method, scale };
}

/**
 * The text form of an answer, used to look it up in a mapping.
 *
 * A multiple choice answer is a list, and a list has no single code, so it is not mappable.
 * The definition checks catch that before a version is published.
 */
function codeFor(answer: AnswerValue): string {
  if (Array.isArray(answer)) return "";
  return String(answer);
}

/**
 * Two decimal places. A mean of three whole numbers is 4.666666666666667 in binary floating
 * point, and showing somebody that is noise, not precision.
 */
function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
