/**
 * Menu analysis.
 *
 * The output of a menu scan is **a question to ask a human**, not a verdict. That is the
 * whole design, and it is held here by the type rather than by discipline: `Verdict` has
 * three members and none of them is `safe`. A future contributor who wants to add one has
 * to add it to this union, in this file, under this comment — which is the point.
 *
 * A person who walks away from this screen with three good questions has been served. A
 * person who walks away with a green tick has been endangered.
 */

import { allergen, allergenLabel, namesFoundIn, AMBIGUOUS_NAMES } from "./allergens";
import { structuralRisksFor } from "./cuisines";
import { type ConditionProfile, hasAnaphylaxisRisk, type Tier, tierForSeverity } from "./profile";

/**
 * Three buckets. There is deliberately no fourth.
 *
 * `worth-asking-about` — nothing in the description rules it out, so it is a candidate and
 * here is what to ask. This is as positive as this tool is ever allowed to be.
 * `likely-a-problem` — something in the description names, or commonly implies, an item on
 * the never-list.
 * `not-enough-information` — the description does not say and the question cannot be
 * inferred. A real and common answer, and better than a manufactured one.
 */
export type Verdict = "worth-asking-about" | "likely-a-problem" | "not-enough-information";

export const VERDICT_LABEL: Record<Verdict, string> = {
  "worth-asking-about": "Worth asking about",
  "likely-a-problem": "Likely a problem",
  "not-enough-information": "Not enough information",
};

export const VERDICT_EXPLANATION: Record<Verdict, string> = {
  "worth-asking-about":
    "Nothing in the description rules these out, so they are where to start. That is not the same as them being all right — only the kitchen can tell you that.",
  "likely-a-problem": "These name something you avoid, or are usually made with it.",
  "not-enough-information": "The menu does not say, and there is nothing here to work from.",
};

export interface DishFinding {
  dish: string;
  verdict: Verdict;
  /** Why it landed where it did. Always populated for the first two. */
  because: string[];
  /** Tier of the most serious thing involved, for how loudly this is rendered. */
  tier: Tier | null;
}

export interface MenuAnalysis {
  /**
   * When there is an anaphylaxis risk, this is rendered before any analysis at all — above
   * the dishes, not below them. Somebody scrolling a list of dishes will not scroll back up.
   */
  speakToStaffFirst: string | null;
  /** What could not be read, named specifically. Never silently skipped. */
  couldNotRead: string[];
  findings: DishFinding[];
  /** Properties of the kitchen, never claims about a dish. */
  structuralNotes: { cuisine: string; note: string }[];
  /** Two or three. A person will not ask eight. */
  questions: string[];
  /** Names that mean more than one thing, where they turned up. */
  ambiguities: { name: string; note: string }[];
  yourRightToAsk: string;
}

export const SPEAK_TO_STAFF_FIRST =
  "Before anything else: tell the staff you have an allergy that can cause anaphylaxis, in those words, before you order. That sentence changes how the kitchen handles your food. Nothing below replaces it, and if you carry adrenaline, have it with you.";

/**
 * UK law, and people do not know they have this.
 *
 * Food businesses must provide allergen information for the fourteen regulated allergens on
 * request, and food prepacked for direct sale must carry a full ingredients list. Staff are
 * obliged to be able to find out. Asking is not being difficult.
 */
export const YOUR_RIGHT_TO_ASK =
  "In the UK a food business has to tell you about the fourteen main allergens if you ask, and anything they have packed themselves before you ordered has to carry a full ingredients list. Staff are meant to be able to find this out. You are not being awkward by asking, and you do not have to explain why.";

/** Everything this person is avoiding, as allergen keys we hold names for. */
function allergenKeysIn(profile: ConditionProfile): string[] {
  return profile.allergies.map((allergy) => allergy.allergenKey);
}

function worstTier(profile: ConditionProfile, allergenKeys: readonly string[]): Tier | null {
  const tiers = profile.allergies
    .filter((allergy) => allergenKeys.includes(allergy.allergenKey))
    .map((allergy) => tierForSeverity(allergy.severity));
  return tiers.length === 0 ? null : (Math.min(...tiers) as Tier);
}

/**
 * Sort one dish.
 *
 * A hit on a hidden name is evidence of a problem. A miss is evidence of nothing at all —
 * which is why the absence of a hit produces `worth-asking-about` with questions attached,
 * and never a clean result.
 */
export function sortDish(
  dish: { name: string; description?: string },
  profile: ConditionProfile,
): DishFinding {
  const text = `${dish.name} ${dish.description ?? ""}`.trim();
  const keys = allergenKeysIn(profile);

  const hits = namesFoundIn(text, keys);
  const neverHits = profile.neverList.filter((item) =>
    new RegExp(`\\b${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text),
  );

  if (hits.length > 0 || neverHits.length > 0) {
    const because = [
      ...hits.map((hit) =>
        hit.foundAs.toLowerCase() === allergenLabel(hit.allergenKey).toLowerCase()
          ? `Names ${allergenLabel(hit.allergenKey).toLowerCase()}.`
          : `“${hit.foundAs}” is ${allergenLabel(hit.allergenKey).toLowerCase()}.`,
      ),
      ...neverHits.map((item) => `You have ${item} on your never list.`),
    ];
    return {
      dish: dish.name,
      verdict: "likely-a-problem",
      because,
      tier: neverHits.length > 0 ? 1 : worstTier(profile, hits.map((hit) => hit.allergenKey)),
    };
  }

  if (!dish.description || dish.description.trim().length === 0) {
    return {
      dish: dish.name,
      verdict: "not-enough-information",
      because: ["The menu gives the name and nothing else."],
      tier: null,
    };
  }

  return { dish: dish.name, verdict: "worth-asking-about", because: [], tier: null };
}

/**
 * The questions.
 *
 * Wording is the difference between a usable answer and a shrug. "Is this gluten free?"
 * invites a guess from whoever is nearest. "Is the sauce thickened with flour, and is it
 * fried in the same oil as the breaded items?" is two concrete things a chef either knows
 * or can go and find out.
 *
 * Capped at three. Somebody standing at a table with people waiting will ask two or three
 * questions and no more, so a list of eight is a list of none.
 */
export function questionsFor(profile: ConditionProfile, menuText: string): string[] {
  const questions: string[] = [];
  const seen = new Set<string>();

  const add = (question: string) => {
    if (questions.length < 3 && !seen.has(question)) {
      seen.add(question);
      questions.push(question);
    }
  };

  /**
   * Most serious first, so the cap never spends itself on an intolerance — and within that,
   * the allergens this kitchen's own habits put at risk before the rest.
   */
  const ordered = [...profile.allergies].sort((a, b) => {
    const bySeverity = tierForSeverity(a.severity) - tierForSeverity(b.severity);
    if (bySeverity !== 0) return bySeverity;
    const aStructural = structuralRisksFor(menuText, [a.allergenKey]).length > 0 ? 0 : 1;
    const bStructural = structuralRisksFor(menuText, [b.allergenKey]).length > 0 ? 0 : 1;
    return aStructural - bStructural;
  });

  for (const allergy of ordered) {
    const entry = allergen(allergy.allergenKey);
    if (!entry) continue;
    for (const question of entry.askTheKitchen) add(question);
  }

  if (questions.length === 0 && profile.neverList.length > 0) {
    add(`Does this have ${profile.neverList[0]} in it, including in the sauce or the stock?`);
  }

  return questions;
}

export interface MenuInput {
  dishes: { name: string; description?: string }[];
  /** Sections the reader could not resolve. Carried through verbatim. */
  couldNotRead?: string[];
}

export function analyseMenu(input: MenuInput, profile: ConditionProfile): MenuAnalysis {
  const menuText = input.dishes.map((dish) => `${dish.name} ${dish.description ?? ""}`).join(" ");
  const keys = allergenKeysIn(profile);

  const ambiguities = AMBIGUOUS_NAMES.filter(
    (item) =>
      item.couldBe.some((key) => keys.includes(key)) &&
      new RegExp(`\\b${item.name}\\b`, "i").test(menuText),
  ).map((item) => ({ name: item.name, note: item.note }));

  return {
    speakToStaffFirst: hasAnaphylaxisRisk(profile) ? SPEAK_TO_STAFF_FIRST : null,
    couldNotRead: input.couldNotRead ?? [],
    findings: input.dishes.map((dish) => sortDish(dish, profile)),
    structuralNotes: structuralRisksFor(menuText, keys),
    questions: questionsFor(profile, menuText),
    ambiguities,
    yourRightToAsk: YOUR_RIGHT_TO_ASK,
  };
}

/** Findings in one bucket, for rendering the three groups separately. */
export function inBucket(analysis: MenuAnalysis, verdict: Verdict): DishFinding[] {
  return analysis.findings.filter((finding) => finding.verdict === verdict);
}

/**
 * A typed or pasted menu.
 *
 * One dish per line. A dash, a colon or a bracket separates the name from the description,
 * which is how menus are written down when somebody copies one out.
 *
 * A line with no description is not treated as a bare name to reason about — it goes to
 * "not enough information", the same as an unreadable line in a photograph. This is the
 * same rule in both flows: never infer a dish's contents from its name alone.
 */
export function parseMenuText(text: string): MenuInput {
  const dishes = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const split = /\s+[—–-]\s+|:\s+|\s+\(/.exec(line);
      if (!split) return { name: line };
      const name = line.slice(0, split.index).trim();
      const description = line
        .slice(split.index + split[0].length)
        .replace(/\)$/, "")
        .trim();
      return description.length > 0 ? { name, description } : { name };
    })
    .filter((dish) => dish.name.length > 0);

  return { dishes };
}
