/**
 * The dose detector. AGENTS.md rule 15.
 *
 * "Never publish a dose, a regimen, or how much of something someone took. A story can say
 * a person was prescribed a drug, became dependent on it, and came off it. It must not be
 * readable as instructions."
 *
 * This is the one place that decides what counts as dose-shaped. It is used twice:
 *
 * 1. In `schemas.ts`, so an editor who types "20mg at night" into a context line is told no
 *    at the form, before anything is written.
 * 2. In `tests/unit/medicine-dose-scan.test.tsx`, which renders every public medicine
 *    surface and runs the whole rendered page through it.
 *
 * Deliberately over-eager. It flags the bare words "dose" and "daily", and it flags "a day",
 * which are all ordinary English — but they are ordinary English that has no business on
 * these surfaces. An editor who wants to say someone took it for years can say that. The
 * cost of a false positive here is a rewritten sentence; the cost of a false negative is a
 * page that reads as a recipe to somebody in recovery.
 */

export interface DosePattern {
  pattern: RegExp;
  problem: string;
}

export const DOSE_PATTERNS: readonly DosePattern[] = [
  {
    pattern:
      /\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|ug|µg|g|ml|micrograms?|milligrams?|grammes?|grams?|millilitres?|units?|iu)\b/i,
    problem: "an amount of a medicine",
  },
  {
    pattern: /\b(?:milligram|microgram|millilitre)s?\b/i,
    problem: "a unit of measurement",
  },
  {
    pattern:
      /\b(?:a|an|one|two|three|four|five|six|seven|eight|nine|ten|half|quarter|couple of|\d+)\s+(?:more\s+|extra\s+|further\s+|small\s+|little\s+|white\s+|blue\s+)*(?:tablets?|pills?|capsules?|doses?|drops?|puffs?|sachets?|patches?|injections?|jabs?|shots?|spoonfuls?|teaspoons?)\b/i,
    problem: "a number of tablets",
  },
  {
    pattern: /\bdos(?:e|es|ed|ing|age|ages)\b/i,
    problem: "a dose",
  },
  {
    pattern:
      /\b(?:once|twice|thrice|three times|four times|five times|several times|\d+\s*times)\s+(?:a|an|per|each|every)\s+(?:day|night|week|month|morning|evening|hour)\b/i,
    problem: "how often it was taken",
  },
  {
    pattern: /\b(?:a|an|per|each|every)\s+(?:day|night)\b/i,
    problem: "a frequency",
  },
  {
    pattern: /\b(?:daily|nightly|twice-daily|bd|tds|qds|prn)\b/i,
    problem: "a frequency",
  },
  {
    pattern: /\b(?:up|upped|doubled|halved|tapered|titrated|increased|reduced)\s+(?:the|his|her|their|my)\s+\w+/i,
    problem: "changing how much was taken",
  },
  {
    pattern: /\b(?:strength|mg\/ml|mg per|per kilo|per kg)\b/i,
    problem: "a strength",
  },
  {
    pattern: /\b(?:take|took|taking|swallow|swallowed)\s+(?:\d+|one|two|three|four|five|a|an|another)\b/i,
    problem: "how many were taken",
  },
];

/**
 * A plain description of the problem if a piece of text is dose-shaped, or null if it is
 * clean. The description is shown to the editor, so it says what is wrong rather than
 * naming a pattern.
 */
export function doseLanguageProblem(text: string): string | null {
  for (const { pattern, problem } of DOSE_PATTERNS) {
    if (pattern.test(text)) return problem;
  }
  return null;
}

/** Every problem in a piece of text. Used by the scan so a failure names all of them. */
export function doseLanguageProblems(text: string): string[] {
  const found = new Set<string>();
  for (const { pattern, problem } of DOSE_PATTERNS) {
    if (pattern.test(text)) found.add(problem);
  }
  return [...found];
}

/** The sentence an editor sees. Same wording wherever the check runs. */
export function doseLanguageMessage(problem: string): string {
  return `This reads as ${problem}. We never publish how much of something a person took, or how often — a story has to say what happened, not how to do it. Say what it was for and what it did to their life instead.`;
}
