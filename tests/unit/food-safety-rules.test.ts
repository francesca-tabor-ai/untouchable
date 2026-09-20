// @vitest-environment node
import { describe, expect, it } from "vitest";

import { interactionsFor, INTERACTIONS, nothingHeldNotice, PHARMACIST_NOTE } from "@/lib/food/interactions";
import { inventedQuantityProblem } from "@/lib/food/language";
import { analysePantry, DATE_MEANING, markItem, mealsFrom } from "@/lib/food/pantry";
import {
  EMPTY_PROFILE,
  neverWorkAround,
  questionForClinician,
  reviewNoticeFor,
  statesDueForReview,
  TIER_MAY_SUGGEST_A_PORTION,
  tierForSeverity,
  type ConditionProfile,
} from "@/lib/food/profile";
import { SCOPE_CREEP_NOTE, plentyIsAvailableNote, scopeCreepNote } from "@/lib/food/scope-creep";
import { SUBSTITUTIONS, substitutionsFor } from "@/lib/food/substitutions";
import { getFoodVisionProvider, PhotoReadUnavailable, photoReadingAvailable } from "@/lib/food/vision";

describe("an allergy and a preference are never the same class of thing", () => {
  it("puts anaphylaxis and a moderate allergy in tier 1 and an intolerance in tier 2", () => {
    expect(tierForSeverity("anaphylaxis")).toBe(1);
    expect(tierForSeverity("moderate")).toBe(1);
    expect(tierForSeverity("intolerance")).toBe(2);
  });

  it("allows 'a small portion' only where amount actually matters", () => {
    expect(TIER_MAY_SUGGEST_A_PORTION[1]).toBe(false);
    expect(TIER_MAY_SUGGEST_A_PORTION[2]).toBe(true);
    expect(TIER_MAY_SUGGEST_A_PORTION[3]).toBe(true);
  });
});

describe("drug interactions are looked up, never worked out", () => {
  it("names a medicine it holds nothing about instead of going quiet", () => {
    const lookup = interactionsFor(["warfarin", "something-we-do-not-hold"]);
    expect(lookup.found.length).toBeGreaterThan(0);
    expect(lookup.nothingHeldFor).toEqual(["something-we-do-not-hold"]);
    expect(nothingHeldNotice(lookup.nothingHeldFor)).toMatch(/not the same as there being nothing/i);
  });

  it("finds a medicine under the name the person actually uses", () => {
    expect(interactionsFor(["atorvastatin"]).found.length).toBeGreaterThan(0);
    expect(interactionsFor(["Flagyl"]).found.length).toBeGreaterThan(0);
  });

  it("never states an amount or a limit in any entry", () => {
    for (const entry of INTERACTIONS) {
      const problem = inventedQuantityProblem(`${entry.food} ${entry.whatHappens}`);
      expect(problem, `${entry.drug}: ${problem}`).toBeNull();
    }
  });

  it("never tells anybody to change what they take", () => {
    for (const entry of INTERACTIONS) {
      expect(entry.whatHappens, entry.drug).not.toMatch(/\byou should (stop|reduce|halve|double)\b/i);
      expect(entry.whatHappens, entry.drug).not.toMatch(/\bstop taking\b/i);
    }
  });

  it("cites an independent source for every entry — never a company selling treatment", () => {
    for (const entry of INTERACTIONS) {
      expect(["NHS", "BNF", "electronic Medicines Compendium"]).toContain(entry.source);
    }
  });

  it("ends at the pharmacist", () => {
    expect(PHARMACIST_NOTE).toMatch(/pharmacist/i);
    expect(PHARMACIST_NOTE).toMatch(/do not need an appointment/i);
  });
});

describe("a clinical restriction is never worked around", () => {
  it("marks it, and offers a question rather than a way round it", () => {
    const restriction = { what: "grapefruit", source: "clinical" as const };
    expect(neverWorkAround(restriction)).toBe(true);
    expect(questionForClinician(restriction)).toMatch(/still needed/i);
    expect(neverWorkAround({ what: "coriander", source: "preference" })).toBe(false);
  });
});

describe("a temporary state does not quietly become permanent", () => {
  const recovering: ConditionProfile = {
    ...EMPTY_PROFILE,
    temporaryStates: [
      {
        state: "recovery after gastroenteritis",
        started: "2026-08-01",
        reviewOn: "2026-08-15",
        rulesDifferHow: "Bland food only for now.",
      },
    ],
  };

  it("surfaces a state that is past its review date", () => {
    expect(statesDueForReview(recovering, new Date("2026-09-20"))).toHaveLength(1);
  });

  it("says nothing while the state is still current", () => {
    expect(statesDueForReview(recovering, new Date("2026-08-10"))).toHaveLength(0);
  });

  it("says the restriction has ended rather than merely that a date passed", () => {
    const notice = reviewNoticeFor(recovering.temporaryStates[0]);
    expect(notice).toMatch(/ordinary food again/i);
    expect(notice).toMatch(/GP|clinician/i);
  });
});

describe("scope creep is mentioned once, gently, and never again", () => {
  const narrow: ConditionProfile = {
    ...EMPTY_PROFILE,
    conditions: [{ name: "IBS", diagnosedBy: "self" }],
    neverList: ["wheat", "onion", "garlic", "apple", "pear", "milk", "beans", "rye", "honey", "cashew", "mushroom", "avocado", "plum", "lentil"],
  };

  it("says nothing about a long list that is proportionate to the diagnoses under it", () => {
    const proportionate: ConditionProfile = {
      ...EMPTY_PROFILE,
      conditions: [
        { name: "Coeliac disease", diagnosedBy: "clinician" },
        { name: "Chronic kidney disease", diagnosedBy: "clinician" },
      ],
      allergies: [
        { allergenKey: "tree-nuts", severity: "anaphylaxis", confirmedBy: "clinician" },
        { allergenKey: "sesame", severity: "moderate", confirmedBy: "clinician" },
      ],
      intolerances: [{ substance: "lactose", thresholdKnown: false }],
      neverList: ["wheat", "rye", "barley", "cashew", "almond", "tahini", "hummus", "malt", "semolina", "banana", "potato", "walnut"],
    };
    expect(scopeCreepNote({ profile: proportionate })).toBeNull();
  });

  it("mentions it when the list has outgrown what it stands on", () => {
    expect(scopeCreepNote({ profile: narrow })).toBe(SCOPE_CREEP_NOTE);
  });

  it("never says it twice", () => {
    expect(scopeCreepNote({ profile: narrow, saidOn: "2026-09-01" })).toBeNull();
  });

  it("says it when somebody reports that eating has become frightening", () => {
    expect(scopeCreepNote({ profile: EMPTY_PROFILE, reportedDistress: true })).toBe(SCOPE_CREEP_NOTE);
  });

  it("does not diagnose, does not alarm, and hands it to someone qualified", () => {
    expect(SCOPE_CREEP_NOTE).not.toMatch(/disorder|anorexi|orthorex|ARFID|symptom/i);
    expect(SCOPE_CREEP_NOTE).toMatch(/dietitian/i);
    expect(SCOPE_CREEP_NOTE).toMatch(/Nothing here changes/i);
  });
});

describe("the tool can always answer 'what can I eat'", () => {
  it("leads with how much is available rather than with warnings", () => {
    expect(plentyIsAvailableNote(4, 9)).toMatch(/more than enough to eat well/i);
    expect(plentyIsAvailableNote(1, 6)).toMatch(/worth asking about/i);
  });

  it("offers a way forward even when nothing on the menu is straightforward", () => {
    const note = plentyIsAvailableNote(0, 6);
    expect(note).toMatch(/off-menu/i);
    expect(note).toMatch(/more normal request than it feels/i);
  });
});

describe("substitutions preserve the job and admit the cost", () => {
  it("states a cost on every single one", () => {
    for (const entry of SUBSTITUTIONS) {
      expect(entry.cost.trim().length, `${entry.replacing}`).toBeGreaterThan(20);
    }
  });

  it("is indexed by what the ingredient was doing", () => {
    const dairy = substitutionsFor("milk");
    expect(dairy.map((entry) => entry.job)).toContain("richness in a sauce");
    expect(dairy.map((entry) => entry.job)).toContain("browning and crust");
  });

  it("says plainly when nothing behaves like the original", () => {
    const melt = substitutionsFor("milk").find((entry) => entry.job === "melting and stretch");
    expect(melt?.cost).toMatch(/nothing behaves like/i);
  });
});

describe("the fridge flow inventories only what was seen", () => {
  const profile: ConditionProfile = {
    ...EMPTY_PROFILE,
    allergies: [{ allergenKey: "milk", severity: "moderate", confirmedBy: "clinician" }],
  };

  it("marks an item against the profile and leaves a clean one unmarked", () => {
    expect(markItem({ name: "Whey protein" }, profile).tier).toBe(1);
    expect(markItem({ name: "Carrots" }, profile).tier).toBeNull();
    expect(markItem({ name: "Carrots" }, profile).because).toBeNull();
  });

  it("keeps use-by and best-before apart, because one is safety and one is quality", () => {
    expect(DATE_MEANING["use-by"]).toMatch(/safety/i);
    expect(DATE_MEANING["best-before"]).toMatch(/quality/i);
    expect(DATE_MEANING["use-by"]).not.toEqual(DATE_MEANING["best-before"]);
  });

  it("flags a date that has passed and says which kind it was", () => {
    const analysis = analysePantry(
      { items: [{ name: "Ham", dateKind: "use-by", dateText: "18 Sep", pastDate: true }] },
      profile,
    );
    expect(analysis.dateFlags).toHaveLength(1);
    expect(analysis.dateFlags[0].meaning).toMatch(/safety/i);
  });

  it("carries unidentified items through instead of guessing at them", () => {
    const analysis = analysePantry(
      { items: [{ name: "Eggs" }], unidentified: ["a jar with the label turned away"] },
      profile,
    );
    expect(analysis.unidentified).toEqual(["a jar with the label turned away"]);
  });

  it("never builds a meal out of something it marked", () => {
    const items = [
      markItem({ name: "Milk" }, profile),
      markItem({ name: "Oats" }, profile),
      markItem({ name: "Eggs" }, profile),
      markItem({ name: "Onion" }, profile),
      markItem({ name: "Potato" }, profile),
    ];
    for (const meal of mealsFrom(items)) {
      expect(meal.uses).not.toContain("milk");
    }
  });

  it("names what is missing rather than proposing a meal that cannot be finished", () => {
    const items = [markItem({ name: "Pasta" }, profile), markItem({ name: "Tomatoes" }, profile)];
    const meal = mealsFrom(items).find((idea) => idea.name.includes("pasta"));
    expect(meal?.missing).toContain("garlic");
  });
});

describe("reading a photograph", () => {
  it("declines rather than returning an empty read when no provider is configured", async () => {
    expect(photoReadingAvailable()).toBe(false);
    await expect(getFoodVisionProvider().readMenu(new Uint8Array())).rejects.toBeInstanceOf(
      PhotoReadUnavailable,
    );
  });
});
