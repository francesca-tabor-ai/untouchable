/**
 * What is actually in the fridge, and what can be made from it.
 *
 * Two disciplines carry over from the menu flow. Nothing is inventoried that was not seen —
 * a fridge "usually" has butter and eggs in it, and populating the list from that
 * assumption produces a recipe somebody cannot finish. And nothing is declared safe: an
 * item is marked by tier against the profile, and an unlabelled jar is asked about.
 *
 * The one thing this flow adds is dates, and the distinction there is a safety matter
 * rather than a tidiness one. **Use-by is safety. Best-before is quality.** People conflate
 * them in both directions — throwing away good food and eating unsafe food — so the two are
 * never rendered with the same word.
 */

import { namesFoundIn } from "./allergens";
import { type ConditionProfile, type Tier, tierForSeverity } from "./profile";

export type DateKind = "use-by" | "best-before" | "unknown";

export const DATE_MEANING: Record<Exclude<DateKind, "unknown">, string> = {
  "use-by": "Use-by is about safety. After it, food can make you ill even if it looks and smells fine.",
  "best-before": "Best-before is about quality. Food is usually still fine to eat after it, it is just not at its best.",
};

export interface PantryItem {
  name: string;
  dateKind?: DateKind;
  /** As printed. Never re-formatted, because a misread date is worse than an awkward one. */
  dateText?: string;
  pastDate?: boolean;
}

export interface MarkedItem extends PantryItem {
  tier: Tier | null;
  because: string | null;
}

export interface PantryAnalysis {
  items: MarkedItem[];
  /** Asked about, never assumed. */
  unidentified: string[];
  /** Storage problems visible in the frame. */
  storageNotes: string[];
  dateFlags: { item: string; kind: DateKind; text?: string; meaning: string }[];
  meals: MealIdea[];
  /** The shortest list that unlocks the most. */
  worthBuying: string[];
}

export interface MealIdea {
  name: string;
  uses: string[];
  /** Named plainly rather than a recipe proposed that cannot be finished. */
  missing: string[];
}

/** Mark one item against the profile. A clean item is unmarked, never marked "fine". */
export function markItem(item: PantryItem, profile: ConditionProfile): MarkedItem {
  const keys = profile.allergies.map((allergy) => allergy.allergenKey);
  const hits = namesFoundIn(item.name, keys);

  const onNeverList = profile.neverList.find((entry) =>
    new RegExp(`\\b${entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(item.name),
  );

  if (onNeverList) {
    return { ...item, tier: 1, because: `${onNeverList} is on your never list.` };
  }

  if (hits.length > 0) {
    const severities = profile.allergies
      .filter((allergy) => hits.some((hit) => hit.allergenKey === allergy.allergenKey))
      .map((allergy) => tierForSeverity(allergy.severity));
    return {
      ...item,
      tier: Math.min(...severities) as Tier,
      because: `Contains ${hits[0].foundAs}.`,
    };
  }

  return { ...item, tier: null, because: null };
}

/**
 * Meals worth making, built only from items that are not marked.
 *
 * Kept deliberately small and shallow. A large recipe database would be a different product,
 * and the value here is "you already have most of a meal", not "here is a cookbook".
 */
const MEAL_PATTERNS: readonly { name: string; needs: string[] }[] = [
  { name: "A frittata", needs: ["egg", "onion", "potato"] },
  { name: "A tomato and garlic pasta", needs: ["pasta", "tomato", "garlic"] },
  { name: "A lentil soup", needs: ["lentil", "onion", "carrot", "stock"] },
  { name: "Egg fried rice", needs: ["rice", "egg", "spring onion"] },
  { name: "A baked potato with beans", needs: ["potato", "beans"] },
  { name: "A chickpea and tomato stew", needs: ["chickpea", "tomato", "onion"] },
  { name: "Porridge", needs: ["oats", "milk"] },
  { name: "An omelette", needs: ["egg", "butter"] },
  { name: "A stir fry", needs: ["rice", "carrot", "onion"] },
];

export function mealsFrom(items: readonly MarkedItem[]): MealIdea[] {
  // Only unmarked items. Something marked tier 1 is not an ingredient.
  const available = items.filter((item) => item.tier === null).map((item) => item.name.toLowerCase());
  const has = (need: string) => available.some((name) => name.includes(need));

  return MEAL_PATTERNS.map((pattern) => ({
    name: pattern.name,
    uses: pattern.needs.filter(has),
    missing: pattern.needs.filter((need) => !has(need)),
  }))
    .filter((idea) => idea.uses.length >= 2)
    .sort((a, b) => a.missing.length - b.missing.length)
    .slice(0, 3);
}

/** The shortest shopping list that finishes the most of what is nearly there. */
export function worthBuying(meals: readonly MealIdea[]): string[] {
  const counts = new Map<string, number>();
  for (const meal of meals) {
    for (const item of meal.missing) counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([item]) => item);
}

export function analysePantry(
  read: { items: PantryItem[]; unidentified?: string[]; storageNotes?: string[] },
  profile: ConditionProfile,
): PantryAnalysis {
  const items = read.items.map((item) => markItem(item, profile));
  const meals = mealsFrom(items);

  const dateFlags = items
    .filter((item) => item.pastDate && item.dateKind && item.dateKind !== "unknown")
    .map((item) => ({
      item: item.name,
      kind: item.dateKind as DateKind,
      text: item.dateText,
      meaning: DATE_MEANING[item.dateKind as Exclude<DateKind, "unknown">],
    }));

  return {
    items,
    unidentified: read.unidentified ?? [],
    storageNotes: read.storageNotes ?? [],
    dateFlags,
    meals,
    worthBuying: worthBuying(meals),
  };
}

export const UNIDENTIFIED_NOTICE =
  "Some things were not identifiable in the photograph — a label turned away, or a jar with nothing on it. They have been left off the list rather than guessed at.";
