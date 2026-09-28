/**
 * The rules a lesson script is held to before anybody hears it.
 *
 * Three families, all detectors in the shape `src/lib/tracking/no-interpretation.ts`
 * established, because a rule without a test is a rule we do not have:
 *
 * **Written for the ear.** No bullets, headings, digits, brackets or symbols. A voice engine
 * reads "e.g." as "ee gee" and "2024" as it pleases; a listener on a walk cannot see a list.
 *
 * **About the body, not the listener.** A course may explain how doctors think about a
 * symptom. It may never tell the person what they have, or that they are fine — both are
 * diagnoses, and the second is the one people act on. Rule 9's interpretation detector and
 * rule 17's dose detector run over every script as well.
 *
 * **Curiosity, not fear.** The words that turn a biology lesson into a horror story.
 *
 * This file contains every phrase it exists to catch, so the sweep in
 * `tests/unit/course-scripts.test.ts` skips it. Passing is not permission.
 */

import { doseLanguageProblems } from "@/lib/medicines/dose-language";
import { interpretationProblem } from "@/lib/tracking/no-interpretation";

interface Pattern {
  pattern: RegExp;
  why: string;
}

const FOR_THE_EAR: Pattern[] = [
  { pattern: /\d/, why: "a digit — spell numbers the way people say them" },
  { pattern: /^\s*([-*•–]|[a-z]\)|\d+[.)])\s/im, why: "a bullet point — a listener cannot see a list" },
  { pattern: /^\s*#/m, why: "a heading — headings are not read aloud" },
  { pattern: /[/&%@+=<>|→←↑↓~^*_\\]/, why: "a symbol the voice engine will read literally or skip" },
  { pattern: /[()[\]{}]/, why: "brackets — an aside the ear cannot see" },
  { pattern: /\b(e\.g|i\.e|etc|vs|approx|cf)\b\.?/i, why: "an abbreviation — say the words" },
  { pattern: /\|/, why: "a table" },
];

const ABOUT_THE_LISTENER: Pattern[] = [
  {
    pattern:
      /\byou (probably |likely |might |may |could |must )?(have|'ve got|have got|are suffering from)\s+(an? )?\w*(itis|osis|oma|disease|disorder|syndrome|infection|tinnitus|damage)\b/i,
    why: "tells the listener what they have",
  },
  { pattern: /\b(your|this) (is|sounds like|looks like) (probably |likely )?(a |an )?\w*(itis|osis|oma|disease|syndrome)\b/i, why: "tells the listener what they have" },
  { pattern: /\bnothing to worry about\b|\byou('re| are) (fine|okay|ok|healthy)\b/i, why: "reassures the listener about their own health, which is a diagnosis too" },
  { pattern: /\b(no need|don't need|do not need) to see (a|your) (doctor|gp|dentist)\b/i, why: "tells the listener not to get help" },
];

const CURIOSITY_NOT_FEAR: Pattern[] = [
  { pattern: /\b(deadly|fatal|terrifying|horrifying|killer|devastating|nightmare|ticking time ?bomb)\b/i, why: "frightening language" },
  { pattern: /\b(you should be (worried|scared|afraid))\b/i, why: "frightening language" },
];

function problemsIn(patterns: Pattern[], text: string): string[] {
  const found: string[] = [];
  for (const { pattern, why } of patterns) {
    const match = pattern.exec(text);
    if (match) found.push(`"${match[0].trim()}" ${why}`);
  }
  return found;
}

/** Every rule a spoken script breaks. Empty when it is clean. */
export function scriptProblems(text: string): string[] {
  const interpretation = interpretationProblem(text);
  return [
    ...problemsIn(FOR_THE_EAR, text),
    ...problemsIn(ABOUT_THE_LISTENER, text),
    ...problemsIn(CURIOSITY_NOT_FEAR, text),
    ...(interpretation ? [interpretation] : []),
    ...doseLanguageProblems(text).map((problem) => `reads as ${problem} (rule 17)`),
  ];
}

/**
 * Outline copy — titles and one-line summaries — is shown rather than spoken, so symbols are
 * allowed. The listener, fear, interpretation and dose rules still apply.
 */
export function outlineProblems(text: string): string[] {
  const interpretation = interpretationProblem(text);
  return [
    ...problemsIn(ABOUT_THE_LISTENER, text),
    ...problemsIn(CURIOSITY_NOT_FEAR, text),
    ...(interpretation ? [interpretation] : []),
    ...doseLanguageProblems(text).map((problem) => `reads as ${problem} (rule 17)`),
  ];
}

/** The paragraphs of a script, in order. */
export function paragraphsOf(script: string): string[] {
  return script
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** A comfortable listening pace for a script written to be followed on a walk. */
export const WORDS_PER_MINUTE = 145;

export function listeningMinutes(script: string): number {
  const words = script.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
