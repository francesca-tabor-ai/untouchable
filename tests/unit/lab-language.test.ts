// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { labLanguageProblem, personalProofProblem } from "@/lib/lab";
import { givingLanguageProblem } from "@/lib/tracking/no-interpretation";

/**
 * The lab may say which way a number moved and how far (DECISIONS.md HL-01). It may not call
 * that proof, say something worked, promise an outcome, print an amount, or ask for money.
 */

const LAB = join(__dirname, "..", "..", "src", "lib", "lab");

/** Explaining a rule in a comment must not trip the detector that enforces it. */
function copyOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

/** String literals only — code identifiers like `doseProblem` are not copy. */
function literals(source: string): string[] {
  return [...copyOnly(source).matchAll(/(["'`])((?:\\.|(?!\1).)*)\1/g)].map((match) => match[2]);
}

describe("the detector", () => {
  it.each([
    "In your data so far, magnesium worked.",
    "This proves caffeine was the problem.",
    "Meditation will help your sleep.",
    "The difference was statistically significant.",
    "Take 400mg in the evening.",
  ])("catches %j", (text) => {
    expect(labLanguageProblem(text)).not.toBeNull();
  });

  it("lets a plain difference through", () => {
    expect(
      labLanguageProblem("In your data so far, time to sleep averaged 42 min before and 31 min during: 11 min lower."),
    ).toBeNull();
    expect(personalProofProblem("You have not tried it yet.")).toBeNull();
  });
});

describe("every sentence in the lab", () => {
  const files = readdirSync(LAB).filter((file) => file.endsWith(".ts") && file !== "language.ts" && !file.startsWith("._"));

  it.each(files)("%s passes", (file) => {
    for (const text of literals(readFileSync(join(LAB, file), "utf8"))) {
      expect(labLanguageProblem(text), `${file}: ${text}`).toBeNull();
      expect(givingLanguageProblem(text), `${file}: ${text}`).toBeNull();
    }
  });
});
