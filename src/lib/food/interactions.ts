/**
 * Drug–food interactions, as a table that is read rather than reasoned about.
 *
 * The rule is narrow and absolute: **never infer an interaction**. A model asked whether a
 * drug interacts with a food will produce a fluent answer either way, and the fluent wrong
 * answer is indistinguishable from the right one. So there is a lookup, the lookup either
 * hits or it does not, and a miss says "I do not hold anything about this" rather than
 * "nothing to worry about".
 *
 * What an entry is allowed to contain: the name of the interaction and what it does. What
 * it is never allowed to contain: an amount, a limit, a frequency, or an instruction to
 * change anything. Every entry ends at the pharmacist, who has the person's full list and
 * their doses, and we have neither.
 *
 * Sourcing follows AGENTS.md rule 14 — NHS, BNF and the electronic Medicines Compendium
 * only, never a company that sells treatment. Each entry carries its source so it can be
 * re-checked; guidance changes and this table will go stale if nobody can tell where a line
 * came from.
 */

export interface Interaction {
  /** Generic drug name, or a class. Matched case-insensitively against the profile. */
  drug: string;
  /** Other names the same drug is sold under, so a person's own spelling finds it. */
  alsoKnownAs?: string[];
  /** What it interacts with, named as food rather than as a nutrient where possible. */
  food: string;
  /** What the interaction is. Named, not quantified, not advised upon. */
  whatHappens: string;
  source: "NHS" | "BNF" | "electronic Medicines Compendium";
}

export const INTERACTIONS: readonly Interaction[] = [
  {
    drug: "warfarin",
    food: "Foods high in vitamin K — leafy greens, especially kale, spinach, spring greens and broccoli",
    whatHappens:
      "Vitamin K works against warfarin, so a change in how much of these you eat changes how well the warfarin works. The usual guidance is about keeping intake steady rather than cutting these foods out — stopping them suddenly is itself a change.",
    source: "NHS",
  },
  {
    drug: "warfarin",
    food: "Cranberry juice, grapefruit and pomegranate juice",
    whatHappens: "These can increase warfarin's effect and the risk of bleeding.",
    source: "NHS",
  },
  {
    drug: "warfarin",
    food: "Alcohol",
    whatHappens: "Drinking, and particularly binge drinking, changes how warfarin works.",
    source: "NHS",
  },
  {
    drug: "simvastatin",
    alsoKnownAs: ["atorvastatin", "zocor", "lipitor"],
    food: "Grapefruit and grapefruit juice",
    whatHappens:
      "Grapefruit raises the amount of the statin in the blood, which raises the risk of muscle side effects. It does not affect every statin equally.",
    source: "NHS",
  },
  {
    drug: "ciclosporin",
    alsoKnownAs: ["tacrolimus", "sirolimus"],
    food: "Grapefruit and grapefruit juice",
    whatHappens: "Grapefruit raises the level of the drug in the blood.",
    source: "BNF",
  },
  {
    drug: "phenelzine",
    alsoKnownAs: ["tranylcypromine", "isocarboxazid", "moclobemide", "MAOI"],
    food: "Foods high in tyramine — mature cheese, cured and fermented meat, yeast extract, soy sauce, broad bean pods, and draught or home-brewed beer",
    whatHappens:
      "Tyramine with a monoamine oxidase inhibitor can cause a sudden dangerous rise in blood pressure. This is one of the few genuinely urgent food interactions, and the list of foods is specific — it is worth having it from your pharmacist in writing.",
    source: "BNF",
  },
  {
    drug: "linezolid",
    food: "Foods high in tyramine — mature cheese, cured meat, yeast extract, soy sauce",
    whatHappens: "Linezolid acts on the same enzyme as a monoamine oxidase inhibitor, and tyramine can raise blood pressure.",
    source: "BNF",
  },
  {
    drug: "metronidazole",
    alsoKnownAs: ["flagyl", "tinidazole"],
    food: "Alcohol, including in food, mouthwash and some medicines",
    whatHappens:
      "Drinking during the course, and for a period after it finishes, can cause severe nausea, vomiting and flushing. Your pharmacist can tell you how long after.",
    source: "NHS",
  },
  {
    drug: "doxycycline",
    alsoKnownAs: ["tetracycline", "lymecycline", "oxytetracycline"],
    food: "Milk and dairy, and anything with added calcium, iron, magnesium or zinc",
    whatHappens: "These bind to the antibiotic in the gut so that less of it is absorbed and it works less well. It is a timing question, and the pharmacist can tell you the spacing.",
    source: "NHS",
  },
  {
    drug: "ciprofloxacin",
    alsoKnownAs: ["ofloxacin", "levofloxacin", "norfloxacin"],
    food: "Dairy, calcium-fortified drinks, and indigestion remedies",
    whatHappens: "These reduce how much of the antibiotic is absorbed.",
    source: "NHS",
  },
  {
    drug: "levothyroxine",
    food: "Soya, calcium and iron supplements, coffee, and high-fibre food taken at the same time",
    whatHappens: "These affect how much levothyroxine is absorbed. It is usually managed by when it is taken rather than by avoiding the food.",
    source: "NHS",
  },
  {
    drug: "methotrexate",
    food: "Alcohol",
    whatHappens: "Both affect the liver, and the combination raises that risk.",
    source: "NHS",
  },
  {
    drug: "lithium",
    food: "Large changes in salt intake, caffeine, and becoming dehydrated",
    whatHappens:
      "Lithium levels move with your salt and fluid balance, and the safe range is narrow. Illness, hot weather and a sudden change of diet all matter.",
    source: "BNF",
  },
  {
    drug: "ramipril",
    alsoKnownAs: ["lisinopril", "enalapril", "perindopril", "losartan", "candesartan", "spironolactone", "amiloride"],
    food: "Salt substitutes, which are usually potassium chloride, and very high-potassium diets",
    whatHappens: "These medicines already raise potassium, and a potassium-based salt substitute adds to it.",
    source: "BNF",
  },
  {
    drug: "isotretinoin",
    alsoKnownAs: ["acitretin"],
    food: "Supplements containing vitamin A, and liver",
    whatHappens: "The medicine is a form of vitamin A, so the two add together.",
    source: "electronic Medicines Compendium",
  },
  {
    drug: "phenytoin",
    alsoKnownAs: ["carbamazepine"],
    food: "Grapefruit juice, and some enteral feeds taken at the same time",
    whatHappens: "These change how much of the medicine reaches the blood.",
    source: "BNF",
  },
  {
    drug: "alendronic acid",
    alsoKnownAs: ["risedronate", "ibandronic acid"],
    food: "All food and drink other than plain water around the time it is taken",
    whatHappens: "Almost none of it is absorbed if it is taken with food, which is why it comes with instructions about timing.",
    source: "NHS",
  },
  {
    drug: "digoxin",
    food: "High-fibre food and bran taken at the same time, and liquorice",
    whatHappens: "Fibre reduces absorption; liquorice lowers potassium, which changes how the heart responds to digoxin.",
    source: "BNF",
  },
];

/** Where every interaction answer ends, because the person holding the full picture is there. */
export const PHARMACIST_NOTE =
  "Your pharmacist can check this against everything you take, including anything bought over the counter. You do not need an appointment and you do not need to be a regular customer.";

export interface InteractionLookup {
  /** Entries we hold for the medicines in the profile. */
  found: Interaction[];
  /** Medicines we hold nothing about. Named, so a silent miss is visible. */
  nothingHeldFor: string[];
}

/**
 * Look up every medicine in the profile.
 *
 * `nothingHeldFor` is the important half. A tool that returns an empty list when it knows
 * nothing reads exactly like a tool that has checked and found nothing, and a person will
 * act on the second. So the miss is returned and the screen says it out loud.
 */
export function interactionsFor(medicationNames: readonly string[]): InteractionLookup {
  const found: Interaction[] = [];
  const nothingHeldFor: string[] = [];

  for (const raw of medicationNames) {
    const name = raw.trim().toLowerCase();
    if (!name) continue;

    const matches = INTERACTIONS.filter(
      (entry) =>
        entry.drug.toLowerCase() === name ||
        entry.alsoKnownAs?.some((alias) => alias.toLowerCase() === name),
    );

    if (matches.length === 0) nothingHeldFor.push(raw.trim());
    else found.push(...matches);
  }

  return { found, nothingHeldFor };
}

export function nothingHeldNotice(names: readonly string[]): string {
  if (names.length === 0) return "";
  const list = names.join(", ");
  return `We hold nothing about food and ${list}. That is not the same as there being nothing — it means it is not in this table, and the table is not complete. ${PHARMACIST_NOTE}`;
}
