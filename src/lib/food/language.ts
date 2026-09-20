/**
 * The detectors the Food Advisor is built around.
 *
 * This feature exists by an explicit platform-lead decision to carve it out of AGENTS.md
 * rule 9 (see DECISIONS.md FA-01). That carve-out is narrow: the Food Advisor may translate
 * a condition into food rules and ask questions about a dish. It gains no licence to
 * declare food safe, to count calories, or to moralise about eating — and those three are
 * the failures a tool like this actually ships.
 *
 * So they are detectors rather than good intentions, in the shape `no-interpretation.ts`
 * already established for tracking. `tests/unit/food-language.test.ts` runs every rendered
 * Food Advisor surface and every string of generated copy through all three.
 *
 * This file necessarily contains every phrase it exists to catch, so the scanner skips it.
 * A tripwire is not a proof: passing it is not permission to write a sentence that tells
 * somebody a plate of food will not hurt them.
 */

interface Pattern {
  pattern: RegExp;
  why: string;
}

/**
 * "You never declare any food safe."
 *
 * We hold a photograph of a menu. We do not hold the kitchen, the fryer, the shared
 * chopping board, the recipe changed last Tuesday, or the supplier substituted this
 * morning. Every one of these phrasings claims knowledge of a kitchen we cannot see.
 */
const SAFETY_CLAIM: Pattern[] = [
  { pattern: /\b(is|are|it's|its|this is|that's|looks|seems|should be)\s+safe\b/i, why: "declares food safe" },
  { pattern: /\bsafe (for you|to eat|to have|option|choice|bet)\b/i, why: "declares food safe" },
  { pattern: /\b(gluten|dairy|nut|peanut|egg|soy|soya|lactose|sesame|wheat)[- ]free\b/i, why: "claims an absence we cannot verify in someone else's kitchen" },
  { pattern: /\bfree from\b/i, why: "claims an absence we cannot verify in someone else's kitchen" },
  { pattern: /\bno (gluten|dairy|nuts|peanuts|egg|soy|soya|sesame|shellfish|fish|milk)\b/i, why: "claims an absence we cannot verify in someone else's kitchen" },
  { pattern: /\b(does not|doesn't|won't|will not) contain\b/i, why: "claims an absence we cannot verify in someone else's kitchen" },
  { pattern: /\b(you can|you'll be able to) (eat|have|order) (this|that|it)\b/i, why: "turns a question into a verdict" },
  { pattern: /\b(this|that|it)('s| is) (fine|ok|okay|alright)\b/i, why: "turns a question into a verdict" },
  { pattern: /\b(probably|should be|most likely) (fine|ok|okay|safe)\b/i, why: "a hedged verdict is still a verdict" },
  { pattern: /\bcleared\b|\bgreen[- ]?(tick|light)\b|\ball clear\b/i, why: "turns a question into a verdict" },
  { pattern: /\b(suitable|approved) for (you|your)\b/i, why: "declares food safe" },
];

/**
 * Food-restriction tools are a known route into disordered eating, so this list is not a
 * style preference. A person using this tool is already watching what they eat more closely
 * than most people ever will; the tool must not hand them a second reason to.
 */
const EATING_BEHAVIOUR: Pattern[] = [
  { pattern: /\b\d+\s*(k?cal|calories|kilocalories)\b/i, why: "counts calories" },
  { pattern: /\bcalorie\b|\bcalories\b|\bkcal\b/i, why: "counts calories" },
  { pattern: /\bmacros?\b|\bmacronutrient/i, why: "sets macro targets" },
  { pattern: /\b(weight|fat) loss\b|\blose weight\b|\bslimming\b|\blow[- ]cal/i, why: "frames food as weight loss" },
  { pattern: /\b(clean|pure|guilt[- ]?free|cheat|sinful|naughty|indulgent|virtuous)\s+(food|eating|meal|day|snack|treat)s?\b/i, why: "moralises about food" },
  { pattern: /\b(cheat day|cheat meal|clean eating|guilt[- ]free|burn(ed|t)? off|earned (it|this)|work (it|that) off)\b/i, why: "moralises about food" },
  { pattern: /\b(bad|good|junk|naughty|sinful) foods?\b/i, why: "moralises about food" },
  { pattern: /\byou (should|need to|ought to) (cut|cut out|avoid|skip|restrict)\b/i, why: "proposes restriction the condition did not ask for" },
];

/**
 * "Never estimate hidden quantities." How much salt, potassium, sugar or FODMAP is in a
 * restaurant dish is not knowable from a menu, and a number invented here would be acted on.
 * Say the category. Never the figure.
 *
 * Deliberately narrow: this catches a quantity attached to a nutrient, not the digits in
 * "two or three questions" or a date.
 */
const INVENTED_QUANTITY: Pattern[] = [
  { pattern: /\b\d+(\.\d+)?\s*(mg|g|grams?|mcg|micrograms?|mmol|iu)\b/i, why: "states a quantity we cannot know from a menu or a packet photograph" },
  { pattern: /\b(about|around|roughly|approx\w*|at least|up to)\s+\d+(\.\d+)?\s*(mg|g|grams?|mmol|portions?|servings?)\b/i, why: "estimates a quantity we cannot know" },
  { pattern: /\b\d+(\.\d+)?\s*(mg|g|grams?)\s+of\s+(salt|sodium|sugar|potassium|fat|protein|fibre|fiber)\b/i, why: "estimates a quantity we cannot know" },
];

function firstProblem(patterns: Pattern[], text: string): string | null {
  for (const { pattern, why } of patterns) {
    const match = pattern.exec(text);
    if (match) return `"${match[0].trim()}" ${why}`;
  }
  return null;
}

/** The rule that outranks everything. A sentence for a test failure, or null when clean. */
export function safetyClaimProblem(text: string): string | null {
  return firstProblem(SAFETY_CLAIM, text);
}

/** Calorie counting, weight framing and moral vocabulary about food. */
export function eatingBehaviourProblem(text: string): string | null {
  return firstProblem(EATING_BEHAVIOUR, text);
}

/** A nutrient quantity nobody could read off a menu. */
export function inventedQuantityProblem(text: string): string | null {
  return firstProblem(INVENTED_QUANTITY, text);
}

/** All three, for scanning a rendered screen. */
export function foodLanguageProblem(text: string): string | null {
  return safetyClaimProblem(text) ?? eatingBehaviourProblem(text) ?? inventedQuantityProblem(text);
}
