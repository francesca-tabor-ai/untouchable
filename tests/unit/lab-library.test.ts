import { describe, expect, it } from "vitest";

import { isOutcomeKey, LAB_LIBRARY, labLanguageProblem, SUPPLEMENT_CAUTION } from "@/lib/lab";
import { doseProblem } from "@/lib/scout/language";

/**
 * The library is the only place the lab says anything general about health, so its limits are
 * checked entry by entry.
 */

const text = (entry: (typeof LAB_LIBRARY)[number]) =>
  [entry.name, entry.rationale, entry.howTo, entry.expectedTimeframe, ...entry.cautions].join(" ");

describe("the intervention library", () => {
  it("has everything the spec asked to be seeded", () => {
    const keys = LAB_LIBRARY.map((entry) => entry.key);
    for (const key of [
      "caffeine_removal",
      "sugar_removal",
      "magnesium",
      "morning_daylight",
      "fixed_wake_time",
      "gym_morning",
      "meditation",
      "breathwork",
      "earlier_last_meal",
      "alcohol_removal",
      "screen_curfew",
      "cool_bedroom",
      "worry_dump",
      "tinnitus_sound",
    ]) {
      expect(keys).toContain(key);
    }
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every supplement the pharmacist-or-GP caution", () => {
    const supplements = LAB_LIBRARY.filter((entry) => entry.isSupplement);
    expect(supplements.length).toBeGreaterThan(0);
    for (const entry of supplements) expect(entry.cautions).toContain(SUPPLEMENT_CAUTION);
  });

  it("names kidney problems for magnesium", () => {
    const magnesium = LAB_LIBRARY.find((entry) => entry.key === "magnesium");
    expect(magnesium?.cautions.join(" ")).toMatch(/kidney/i);
    expect(magnesium?.cautions.join(" ")).toMatch(/pharmacist or GP/);
  });

  it("warns about stopping heavy drinking suddenly", () => {
    const alcohol = LAB_LIBRARY.find((entry) => entry.key === "alcohol_removal");
    expect(alcohol?.cautions.join(" ")).toMatch(/stopping suddenly can be dangerous/);
  });

  it.each(LAB_LIBRARY.map((entry) => [entry.key, entry] as const))("%s never states an amount", (_, entry) => {
    expect(doseProblem(text(entry))).toBeNull();
  });

  it.each(LAB_LIBRARY.map((entry) => [entry.key, entry] as const))("%s passes the language check", (_, entry) => {
    expect(labLanguageProblem(text(entry))).toBeNull();
  });

  it("links only to the NHS (rule 14)", () => {
    for (const entry of LAB_LIBRARY) {
      for (const source of entry.sources) expect(source.url).toMatch(/^https:\/\/www\.nhs\.uk\//);
    }
  });

  it("aims every entry at outcomes the check-in actually records", () => {
    for (const entry of LAB_LIBRARY) {
      expect(entry.outcomes.length).toBeGreaterThan(0);
      for (const key of entry.outcomes) expect(isOutcomeKey(key)).toBe(true);
    }
  });

  it("contains no prescription medicines", () => {
    const all = LAB_LIBRARY.map(text).join(" ");
    expect(all).not.toMatch(/melatonin|zopiclone|zolpidem|antihistamine|sleeping pill|prescri/i);
  });
});
