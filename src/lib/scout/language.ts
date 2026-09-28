/**
 * What the Research Scout's words may not do, as detectors.
 *
 * The Scout exists by a platform-lead decision to carve it out of AGENTS.md rule 9 and the
 * brief's "no AI-generated insight" line (DECISIONS.md RS-01). The carve-out lets Claude say,
 * in plain English, what a paper asked, did and found, and why it matters to the research.
 * It does not let anything here — Claude or our own copy — tell the reader what to do about
 * their health, say a treatment works, overstate a finding, or print a dose.
 *
 * These run in two places:
 *
 * - **On every piece of Claude output, at runtime.** A summary that trips one is not shown;
 *   the card says a summary could not be written safely and shows the authors' abstract
 *   instead. Rewording it ourselves would put our words in the paper's mouth.
 * - **Across every file in the feature**, by `tests/unit/scout-language.test.ts`.
 *
 * Deliberately narrower than `no-interpretation.ts`. A summary of a paper has to be able to
 * say "pain scores fell in the treated group", because that is what the paper found, said as
 * the paper's finding. What it may not do is turn that into a statement about the reader, a
 * certainty, or an instruction.
 *
 * This file necessarily contains every phrase it exists to catch, so the sweep skips it.
 */

interface Pattern {
  pattern: RegExp;
  why: string;
}

/** Talking to the reader about their own health, or telling them what to do. */
const ADVICE: Pattern[] = [
  { pattern: /\byou (should|could|might want to|may want to|need to|ought to|must)\b/i, why: "tells the reader what to do" },
  { pattern: /\b(we|i) (recommend|suggest|advise)\b/i, why: "recommends something" },
  { pattern: /\b(try|consider|ask your (doctor|dentist|gp) (about|for|to prescribe))\s+(taking|using|stopping|starting|a course of)\b/i, why: "tells the reader what to do" },
  { pattern: /\byour (tinnitus|condition|symptoms?|pain|treatment|teeth|jaw|diagnosis|illness)\b/i, why: "talks about the reader's own health" },
  { pattern: /\b(this|it) (means|suggests) (that )?you\b/i, why: "applies a finding to the reader" },
  { pattern: /\bworth (trying|taking|asking for)\b/i, why: "recommends a treatment" },
  { pattern: /\bdiagnos(e|es|ing)\b/i, why: "the platform does not diagnose" },
];

/** Saying more than a paper can bear. */
const OVERSTATEMENT: Pattern[] = [
  { pattern: /\bprov(es|ed|en)\b/i, why: "overstates what a study can show" },
  { pattern: /\b(cures?|cured)\b/i, why: "claims a cure" },
  { pattern: /\bbreakthrough\b|\bmiracle\b|\bgame[- ]changer\b|\brevolutionary\b/i, why: "overstates a finding" },
  { pattern: /\b(definitive(ly)?|conclusive(ly)?|settles?|once and for all)\b/i, why: "overstates a finding" },
  { pattern: /\b(the )?(treatment|therapy|drug|surgery|procedure) (works|worked|is effective)\b/i, why: "says a treatment worked, beyond reporting the study" },
  { pattern: /\b(best|most effective|safest) (treatment|option|choice|therapy)\b/i, why: "ranks treatments" },
];

/** AGENTS.md rule 17: never a dose, a regimen, or how much of something somebody took. */
const DOSE: Pattern[] = [
  { pattern: /\b\d+(\.\d+)?\s*(mg|mcg|µg|micrograms?|milligrams?|g|grams?|ml|millilitres?|iu|units?)\b(?!\w)/i, why: "states a dose" },
  { pattern: /\b(once|twice|three times|four times|\d+ times) (a|per) (day|daily|week)\b/i, why: "states a regimen" },
  { pattern: /\b(daily|weekly) dose\b|\bdosage\b|\bdosing\b/i, why: "states a regimen" },
  { pattern: /\b\d+\s*(sessions?|injections?|tablets?|capsules?)\s+(a|per|each)\s+(day|week)\b/i, why: "states a regimen" },
];

function firstProblem(patterns: Pattern[], text: string): string | null {
  for (const { pattern, why } of patterns) {
    const match = pattern.exec(text);
    if (match) return `"${match[0].trim()}" ${why}`;
  }
  return null;
}

export const adviceProblem = (text: string) => firstProblem(ADVICE, text);
export const overstatementProblem = (text: string) => firstProblem(OVERSTATEMENT, text);
export const doseProblem = (text: string) => firstProblem(DOSE, text);

/** The first problem found in any of the three, or null when the text is clean. */
export function scoutLanguageProblem(text: string): string | null {
  return adviceProblem(text) ?? overstatementProblem(text) ?? doseProblem(text);
}

/** Every string inside a value — for checking a whole structured Claude response at once. */
export function stringsIn(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === "object") return Object.values(value).flatMap(stringsIn);
  return [];
}

export function firstLanguageProblem(value: unknown): string | null {
  for (const text of stringsIn(value)) {
    const problem = scoutLanguageProblem(text);
    if (problem) return problem;
  }
  return null;
}
