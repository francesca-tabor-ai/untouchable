import { doseProblem, overstatementProblem } from "@/lib/scout/language";

/**
 * What the Habit Lab's words may not do.
 *
 * The lab is allowed, by a product-owner decision (DECISIONS.md HL-01), to say which way a
 * difference points and how large it is, and to suggest the next experiment. It is not allowed
 * to present a few weeks of one person's self-ratings as proof, to say something worked, or to
 * print an amount. The first two would teach somebody to trust an n-of-1 result more than it
 * deserves; the third turns the library into a dosing chart.
 *
 * The overstatement and dose detectors are the Research Scout's, reused so the two features
 * cannot drift apart. The patterns below add the phrasings a *personal* result reaches for.
 *
 * Swept across every file in `src/lib/lab/` by `tests/unit/lab-language.test.ts`, and run over
 * every generated sentence in the results and suggestions tests. This file contains every phrase
 * it exists to catch, so the sweep skips it.
 */

const PERSONAL_PROOF: { pattern: RegExp; why: string }[] = [
  { pattern: /\b(it|this|that) (works|is working)\b/i, why: "says an experiment worked" },
  { pattern: /\bworked\b/i, why: "says an experiment worked" },
  { pattern: /\b(fixed|solved) (your|my|the) (sleep|insomnia|tinnitus)\b/i, why: "claims a fix" },
  { pattern: /\b(caused|causes) (your|the) (insomnia|poor sleep|tinnitus)\b/i, why: "claims a cause" },
  { pattern: /\bstatistically significant\b/i, why: "borrows the authority of a trial" },
  { pattern: /\bclinically (proven|shown|tested)\b/i, why: "borrows the authority of a trial" },
  { pattern: /\bguarantee\w*\b/i, why: "promises an outcome" },
  { pattern: /\bwill (help|work|fix|improve)\b/i, why: "promises an outcome" },
];

export function personalProofProblem(text: string): string | null {
  for (const { pattern, why } of PERSONAL_PROOF) {
    const match = pattern.exec(text);
    if (match) return `"${match[0]}" ${why}`;
  }
  return null;
}

export function labLanguageProblem(text: string): string | null {
  return overstatementProblem(text) ?? doseProblem(text) ?? personalProofProblem(text);
}
