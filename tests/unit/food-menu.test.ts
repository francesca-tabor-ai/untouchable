// @vitest-environment node
import { describe, expect, it } from "vitest";

import { namesFoundIn, namesToWatchFor } from "@/lib/food/allergens";
import { structuralRisksFor } from "@/lib/food/cuisines";
import {
  analyseMenu,
  inBucket,
  parseMenuText,
  sortDish,
  VERDICT_LABEL,
  type Verdict,
} from "@/lib/food/menu";
import { EMPTY_PROFILE, type ConditionProfile } from "@/lib/food/profile";

/**
 * The menu flow, checked against the thing it exists to prevent.
 *
 * The output of a menu scan is a question to ask a human. A person who walks away with
 * three good questions has been served; a person who walks away with a green tick has been
 * endangered, and these tests are what stop the second one from being added later.
 */

const coeliac: ConditionProfile = {
  ...EMPTY_PROFILE,
  conditions: [{ name: "Coeliac disease", diagnosedBy: "clinician" }],
  allergies: [{ allergenKey: "gluten", severity: "moderate", confirmedBy: "clinician" }],
};

const anaphylactic: ConditionProfile = {
  ...EMPTY_PROFILE,
  allergies: [{ allergenKey: "peanuts", severity: "anaphylaxis", confirmedBy: "clinician" }],
};

describe("there are three buckets and there is no fourth", () => {
  it("has no verdict meaning safe", () => {
    const verdicts = Object.keys(VERDICT_LABEL) as Verdict[];
    expect(verdicts).toHaveLength(3);
    for (const verdict of verdicts) {
      expect(verdict).not.toMatch(/safe|ok|fine|clear/i);
      expect(VERDICT_LABEL[verdict]).not.toMatch(/safe|fine|all right/i);
    }
  });

  it("never puts a dish it found nothing in above 'worth asking about'", () => {
    const finding = sortDish({ name: "Grilled seabass", description: "new potatoes, samphire" }, coeliac);
    expect(finding.verdict).toBe("worth-asking-about");
  });
});

describe("a dish is never read from its name alone", () => {
  it("sends a bare name to 'not enough information'", () => {
    expect(sortDish({ name: "Chicken katsu" }, coeliac).verdict).toBe("not-enough-information");
    expect(sortDish({ name: "House salad" }, coeliac).verdict).toBe("not-enough-information");
  });

  it("does the same for a line the reader could not resolve", () => {
    const analysis = analyseMenu(
      { dishes: [{ name: "Today's special" }], couldNotRead: ["the specials board"] },
      coeliac,
    );
    expect(analysis.findings[0].verdict).toBe("not-enough-information");
    expect(analysis.couldNotRead).toEqual(["the specials board"]);
  });
});

describe("hidden names are what the tool is for", () => {
  it("finds gluten under the names people miss", () => {
    for (const description of ["dressed with malt vinegar", "dusted with semolina", "a brewer's yeast glaze"]) {
      expect(sortDish({ name: "A dish", description }, coeliac).verdict).toBe("likely-a-problem");
    }
  });

  it("names the form it was found under, not just the allergen", () => {
    const finding = sortDish({ name: "Chutney", description: "malt vinegar and onion" }, coeliac);
    expect(finding.because.join(" ")).toMatch(/malt vinegar/i);
  });

  it("carries lecithin's ambiguity instead of resolving it", () => {
    expect(namesToWatchFor("soy")).toContain("lecithin");
    expect(namesToWatchFor("eggs")).toContain("lecithin");
  });

  it("matches on word boundaries", () => {
    expect(namesFoundIn("a minute of rest", ["tree-nuts"])).toHaveLength(0);
  });
});

describe("an anaphylaxis risk changes the top of the screen", () => {
  it("puts the reminder to speak to staff before any analysis", () => {
    const analysis = analyseMenu({ dishes: [{ name: "Satay", description: "peanut sauce" }] }, anaphylactic);
    expect(analysis.speakToStaffFirst).toMatch(/anaphylaxis/i);
  });

  it("leaves it off when nothing in the profile is that serious", () => {
    const analysis = analyseMenu({ dishes: [{ name: "Bread" }] }, coeliac);
    expect(analysis.speakToStaffFirst).toBeNull();
  });
});

describe("the kitchen is described, the dish is not", () => {
  it("raises fish sauce as a property of a Thai kitchen", () => {
    const profile: ConditionProfile = {
      ...EMPTY_PROFILE,
      allergies: [{ allergenKey: "fish", severity: "moderate", confirmedBy: "clinician" }],
    };
    const notes = structuralRisksFor("green curry, pad thai, som tam", ["fish"]);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0].note).toMatch(/fish sauce/i);

    // And it stays a note about the kitchen rather than a finding about a dish.
    const analysis = analyseMenu({ dishes: [{ name: "Som tam", description: "green papaya, lime, chilli" }] }, profile);
    expect(analysis.findings[0].verdict).toBe("worth-asking-about");
    expect(analysis.structuralNotes.length).toBeGreaterThan(0);
  });

  it("raises nothing structural when the person avoids nothing it touches", () => {
    expect(structuralRisksFor("green curry", [])).toEqual([]);
  });
});

describe("the questions", () => {
  it("are capped at three, because nobody asks eight", () => {
    const many: ConditionProfile = {
      ...EMPTY_PROFILE,
      allergies: [
        { allergenKey: "gluten", severity: "moderate", confirmedBy: "clinician" },
        { allergenKey: "milk", severity: "moderate", confirmedBy: "clinician" },
        { allergenKey: "fish", severity: "moderate", confirmedBy: "clinician" },
        { allergenKey: "sesame", severity: "moderate", confirmedBy: "clinician" },
        { allergenKey: "soy", severity: "moderate", confirmedBy: "clinician" },
      ],
    };
    expect(analyseMenu({ dishes: [{ name: "Ramen", description: "broth, noodles" }] }, many).questions.length).toBeLessThanOrEqual(3);
  });

  it("spends the cap on the most serious thing first", () => {
    const mixed: ConditionProfile = {
      ...EMPTY_PROFILE,
      allergies: [
        { allergenKey: "celery", severity: "intolerance", confirmedBy: "self" },
        { allergenKey: "peanuts", severity: "anaphylaxis", confirmedBy: "clinician" },
      ],
    };
    const [first] = analyseMenu({ dishes: [{ name: "Satay", description: "skewers" }] }, mixed).questions;
    expect(first).toMatch(/peanut/i);
  });

  it("asks something concrete rather than something answerable with a shrug", () => {
    const analysis = analyseMenu({ dishes: [{ name: "Pie", description: "shortcrust, gravy" }] }, coeliac);
    for (const question of analysis.questions) {
      expect(question.length).toBeGreaterThan(30);
      expect(question).toMatch(/\?$/);
    }
  });
});

describe("the right to ask is spelled out", () => {
  it("tells the person staff are obliged to know", () => {
    const analysis = analyseMenu({ dishes: [{ name: "Pie", description: "gravy" }] }, coeliac);
    expect(analysis.yourRightToAsk).toMatch(/fourteen/i);
    expect(analysis.yourRightToAsk).toMatch(/not being awkward|do not have to explain/i);
  });
});

describe("parsing a menu somebody typed out", () => {
  it("splits a name from its description on the separators menus use", () => {
    const parsed = parseMenuText("Puttanesca — olives, capers, anchovy\nRisotto: peas and mint\nSoup (celery and potato)");
    expect(parsed.dishes).toEqual([
      { name: "Puttanesca", description: "olives, capers, anchovy" },
      { name: "Risotto", description: "peas and mint" },
      { name: "Soup", description: "celery and potato" },
    ]);
  });

  it("keeps a bare line as a name with no description", () => {
    expect(parseMenuText("Chicken katsu").dishes).toEqual([{ name: "Chicken katsu" }]);
  });

  it("ignores blank lines", () => {
    expect(parseMenuText("\n\nBread\n\n").dishes).toEqual([{ name: "Bread" }]);
  });
});

describe("the buckets are rendered apart", () => {
  it("sorts a mixed menu into all three", () => {
    const analysis = analyseMenu(
      {
        dishes: [
          { name: "Puttanesca", description: "olives, capers, semolina crust" },
          { name: "Seabass", description: "new potatoes and samphire" },
          { name: "Today's special" },
        ],
      },
      coeliac,
    );
    expect(inBucket(analysis, "likely-a-problem")).toHaveLength(1);
    expect(inBucket(analysis, "worth-asking-about")).toHaveLength(1);
    expect(inBucket(analysis, "not-enough-information")).toHaveLength(1);
  });
});
