// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  eatingBehaviourProblem,
  foodLanguageProblem,
  inventedQuantityProblem,
  safetyClaimProblem,
} from "@/lib/food/language";

/**
 * The three rules the Food Advisor is not allowed to break, checked against the sentences
 * somebody would actually write and then swept across every file in the feature.
 *
 * The rule that outranks everything is the first one: we hold a photograph of a menu, not
 * the kitchen, so nothing here ever tells anybody a plate of food will not hurt them.
 */

const ROOT = join(__dirname, "..", "..");

function filesUnder(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const read = (path: string) => readFileSync(path, "utf8");

/**
 * Source with the comments taken out — the same trick `tracking-rules.test.tsx` uses.
 * Explaining a rule in a comment must not trip the detector that enforces it.
 */
function copyOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

/**
 * `language.ts` is left out on purpose: it is the detector, and it necessarily contains
 * every phrase it exists to catch. It is checked by its own tests below.
 */
const FOOD_FILES = [
  ...filesUnder(join(ROOT, "src/lib/food")),
  ...filesUnder(join(ROOT, "src/components/food")),
  ...filesUnder(join(ROOT, "src/app/(account)/food")),
]
  .filter((path) => /\.tsx?$/.test(path))
  .filter((path) => !path.endsWith("language.ts"));

describe("no food is ever declared safe", () => {
  it("catches the sentences somebody would write", () => {
    expect(safetyClaimProblem("This is safe for you")).toBeTruthy();
    expect(safetyClaimProblem("The risotto is gluten free")).toBeTruthy();
    expect(safetyClaimProblem("This does not contain nuts")).toBeTruthy();
    expect(safetyClaimProblem("That's fine")).toBeTruthy();
    expect(safetyClaimProblem("Probably fine")).toBeTruthy();
    expect(safetyClaimProblem("No dairy in this one")).toBeTruthy();
    expect(safetyClaimProblem("Suitable for you")).toBeTruthy();
    expect(safetyClaimProblem("You can eat this")).toBeTruthy();
  });

  it("leaves the sentences we want somebody to be able to write", () => {
    expect(safetyClaimProblem("Ask the kitchen whether the sauce is thickened with flour.")).toBeNull();
    expect(safetyClaimProblem("Worth asking about. The menu does not say.")).toBeNull();
    expect(safetyClaimProblem("Likely a problem — this names anchovy.")).toBeNull();
    expect(safetyClaimProblem("Not enough information.")).toBeNull();
  });

  it("finds none of it anywhere in the feature", () => {
    for (const path of FOOD_FILES) {
      const problem = safetyClaimProblem(copyOnly(read(path)));
      expect(problem, `${path}: ${problem}`).toBeNull();
    }
  });
});

describe("nothing counts calories or moralises about food", () => {
  it("catches the vocabulary", () => {
    expect(eatingBehaviourProblem("about 400 calories")).toBeTruthy();
    expect(eatingBehaviourProblem("hits your macros")).toBeTruthy();
    expect(eatingBehaviourProblem("a guilt-free treat")).toBeTruthy();
    expect(eatingBehaviourProblem("save it for a cheat day")).toBeTruthy();
    expect(eatingBehaviourProblem("clean eating")).toBeTruthy();
    expect(eatingBehaviourProblem("good for weight loss")).toBeTruthy();
    expect(eatingBehaviourProblem("you should cut out bread")).toBeTruthy();
    expect(eatingBehaviourProblem("junk food")).toBeTruthy();
  });

  it("leaves ordinary sentences about eating alone", () => {
    expect(eatingBehaviourProblem("Plenty here is worth asking about.")).toBeNull();
    expect(eatingBehaviourProblem("A small portion is usually tolerated.")).toBeNull();
    expect(eatingBehaviourProblem("Ghee is clarified butter.")).toBeNull();
  });

  it("finds none of it anywhere in the feature", () => {
    for (const path of FOOD_FILES) {
      const problem = eatingBehaviourProblem(copyOnly(read(path)));
      expect(problem, `${path}: ${problem}`).toBeNull();
    }
  });
});

describe("no quantity is invented", () => {
  it("catches a figure nobody could read off a menu", () => {
    expect(inventedQuantityProblem("roughly 6g of salt")).toBeTruthy();
    expect(inventedQuantityProblem("around 300mg potassium")).toBeTruthy();
    expect(inventedQuantityProblem("about 2 portions")).toBeTruthy();
  });

  it("leaves a category alone", () => {
    expect(inventedQuantityProblem("This is a high-potassium food.")).toBeNull();
    expect(inventedQuantityProblem("Ask the two questions below.")).toBeNull();
    expect(inventedQuantityProblem("Reviewed on 2026-09-20.")).toBeNull();
  });

  it("finds none of it anywhere in the feature", () => {
    for (const path of FOOD_FILES) {
      const problem = inventedQuantityProblem(copyOnly(read(path)));
      expect(problem, `${path}: ${problem}`).toBeNull();
    }
  });
});

describe("the combined detector", () => {
  it("returns the first problem it finds", () => {
    expect(foodLanguageProblem("This is safe and about 400 calories")).toMatch(/safe/);
    expect(foodLanguageProblem("Ask whether the stock has celery in it")).toBeNull();
  });
});
