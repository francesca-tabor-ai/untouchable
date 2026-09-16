/**
 * The rule this whole feature is most likely to break by accident.
 *
 * AGENTS.md rule 9 and brief 7.7: **the UI shows data and never interprets it.** No "your
 * pain is improving", no trend arrows, no "this treatment is working", no colouring a score
 * green or red. A number, a date, and what the person told us.
 *
 * It is easy to agree with that and then write "you're doing well this week" in a heading,
 * because that is how people ordinarily talk about numbers. So the rule is a detector rather
 * than a good intention, and `tests/unit/tracking-no-interpretation.test.ts` runs every
 * tracking screen's rendered markup through it.
 *
 * This is a tripwire, not a proof. It catches the phrasings we know we reach for. Passing it
 * is not permission to write a sentence that draws a conclusion for somebody.
 */

interface Pattern {
  pattern: RegExp;
  why: string;
}

const PATTERNS: Pattern[] = [
  {
    pattern: /\b(improv|worsen|deteriorat|declin)\w*/i,
    why: "says whether the data is going one way or the other",
  },
  { pattern: /\bgetting (better|worse)\b/i, why: "reads a direction into the data" },
  { pattern: /\b(better|worse) than\b/i, why: "compares two of the person's own readings" },
  { pattern: /\btrend\w*/i, why: "a trend is an interpretation, not a reading" },
  { pattern: /\b(going|heading) (up|down)\b/i, why: "reads a direction into the data" },
  { pattern: /\bon track\b/i, why: "implies a target the person has not set" },
  {
    pattern: /\b(is|are|was|were|seems?|looks?|appears?) (to be )?(working|helping|effective)\b/i,
    why: "says a treatment worked",
  },
  { pattern: /\bhelping\b/i, why: "says a treatment worked" },
  { pattern: /\bwe recommend\w*|\brecommend(s|ed|ation|ations)?\b/i, why: "recommends something" },
  { pattern: /\byou should (take|try|stop|start|keep|consider)\b/i, why: "gives advice" },
  {
    pattern: /\b(good|bad|poor|great|excellent|healthy|unhealthy|normal|abnormal|high|low)\s+(score|result|reading|number|day|week|level)s?\b/i,
    why: "grades a score",
  },
  { pattern: /\bwell done\b|\bkeep it up\b|\bgreat job\b/i, why: "praises a reading" },
  { pattern: /\bdiagnos(e|es|ing)\b/i, why: "the platform does not diagnose" },
  { pattern: /\bbest (treatment|option|choice)\b/i, why: "ranks treatments" },
  { pattern: /\bmost effective\b/i, why: "ranks treatments" },
];

/** A sentence to put in a test failure, or null when the text is clean. */
export function interpretationProblem(text: string): string | null {
  for (const { pattern, why } of PATTERNS) {
    const match = pattern.exec(text);
    if (match) return `"${match[0]}" ${why}`;
  }
  return null;
}

/** Brief 6.4 and AGENTS.md rule 5: nothing on a tracking screen asks anybody for money. */
const GIVING = /donate|donation|give now|chip in|support us|fundrais|gift aid/i;

export function givingLanguageProblem(text: string): string | null {
  const match = GIVING.exec(text);
  return match ? `"${match[0]}" asks for money on a health screen` : null;
}
