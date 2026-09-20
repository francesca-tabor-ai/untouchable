/**
 * Substitutions that preserve what the ingredient was doing.
 *
 * The failure this exists to avoid: a list of "dairy alternatives" offered without asking
 * what the dairy was for. Cream in a pan sauce is doing emulsification and mouthfeel, and
 * oat milk does neither, so the sauce splits and the person eats something they did not
 * want. People who do not enjoy their food stop keeping to the restriction that actually
 * matters, and then the tool has caused the harm it was built to prevent.
 *
 * So a substitution is indexed by **function**, and every one says what it costs. A
 * substitute that will not brown, or will be thinner, is still often the right answer — but
 * only if somebody was told before they served it to six people.
 */

export type Job =
  | "richness in a sauce"
  | "browning and crust"
  | "binding"
  | "raising"
  | "structure in baking"
  | "savoury depth"
  | "acidity"
  | "thickening"
  | "melting and stretch"
  | "emulsifying a dressing";

export interface Substitution {
  /** The allergen or restriction this is a way around. */
  forKey: string;
  /** What the original ingredient was doing. */
  job: Job;
  /** The ingredient being replaced, as a person would say it. */
  replacing: string;
  use: string;
  /** What it costs. Never omitted — an honest cost is the whole value of the entry. */
  cost: string;
}

export const SUBSTITUTIONS: readonly Substitution[] = [
  {
    forKey: "milk",
    job: "richness in a sauce",
    replacing: "Double cream",
    use: "Full-fat oat cream, or a cashew cream blended smooth if nuts are fine. Both carry fat, which is the part doing the work.",
    cost: "Oat is slightly sweet and will catch and thicken faster, so take the pan off sooner. Cashew is thicker and will not reduce the same way.",
  },
  {
    forKey: "milk",
    job: "browning and crust",
    replacing: "Butter for frying or roasting",
    use: "Ghee is not an option here. Use a neutral oil with a knob of a hard vegetable fat, or duck fat if meat is fine.",
    cost: "You lose the milk solids, and those are what brown. Expect colour to take longer and taste less nutty.",
  },
  {
    forKey: "milk",
    job: "melting and stretch",
    replacing: "Mozzarella or cheddar on top",
    use: "There is no good general answer. The starch-based vegan cheeses melt but do not stretch or brown well; a breadcrumb and oil crust does a different and often better job.",
    cost: "Be straightforward about this one — nothing behaves like melted cheese. A dish built around it usually wants rebuilding rather than substituting.",
  },
  {
    forKey: "eggs",
    job: "binding",
    replacing: "Egg in burgers, fishcakes or meatballs",
    use: "A tablespoon of ground flax left to stand in water until it thickens, or a little mashed potato or breadcrumb soaked in stock.",
    cost: "Slightly softer set. Chill the mix before it goes in the pan or it will break up.",
  },
  {
    forKey: "eggs",
    job: "raising",
    replacing: "Egg in a sponge",
    use: "Bicarbonate of soda with an acid — vinegar or lemon — plus a little extra liquid. Aquafaba, the water from a tin of chickpeas, whips and works well for lighter cakes.",
    cost: "A closer, denser crumb, and it will not rise as high. Aquafaba sponges stale faster.",
  },
  {
    forKey: "eggs",
    job: "emulsifying a dressing",
    replacing: "Egg yolk in mayonnaise or hollandaise",
    use: "Aquafaba emulsifies properly and makes a convincing mayonnaise. For a vinaigrette, mustard does the same job — unless mustard is also on your list.",
    cost: "Aquafaba mayonnaise is paler and slightly less rich, and it will not hold as long in the fridge.",
  },
  {
    forKey: "gluten",
    job: "thickening",
    replacing: "Flour in a roux or a gravy",
    use: "Cornflour slaked in cold water, or a potato or rice flour. Reducing the liquid further does it with no thickener at all.",
    cost: "Cornflour sets glossier and can go slimy if it boils hard or sits. It also thins again on reheating.",
  },
  {
    forKey: "gluten",
    job: "structure in baking",
    replacing: "Wheat flour in bread",
    use: "A blend rather than a single flour — rice and tapioca with psyllium husk or xanthan gum for the elasticity gluten was providing.",
    cost: "A slack, wetter dough that is handled more like a batter, a tighter crumb, and bread that stales within a day. Worth expecting rather than being disappointed by.",
  },
  {
    forKey: "gluten",
    job: "browning and crust",
    replacing: "Breadcrumb coating",
    use: "Polenta, crushed cornflakes, or rice flour with a little cornflour.",
    cost: "Polenta is harder and grittier. It browns well but does not go soft under a sauce the way breadcrumb does.",
  },
  {
    forKey: "fish",
    job: "savoury depth",
    replacing: "Anchovy or fish sauce",
    use: "Miso, or a dried mushroom stock reduced down, or capers with a little soy if soy is fine. All bring the glutamate that anchovy was there for.",
    cost: "Miso is saltier and sweeter, so pull back the other salt. None of them give the same clean background savouriness — the dish will taste of the substitute more than it tasted of anchovy.",
  },
  {
    forKey: "soy",
    job: "savoury depth",
    replacing: "Soy sauce",
    use: "Coconut aminos, or a salted mushroom stock. Worcestershire sauce is not a substitute if fish is also on your list.",
    cost: "Coconut aminos are noticeably sweeter and much less salty, so the dish needs salt from somewhere else.",
  },
  {
    forKey: "tree-nuts",
    job: "richness in a sauce",
    replacing: "Ground almond or cashew in a curry",
    use: "Sunflower seeds or pumpkin seeds blended smooth, or a little coconut cream.",
    cost: "Seeds are greener and slightly bitter — toast them first. Coconut takes the dish somewhere else entirely, which is fine if you meant to go there.",
  },
  {
    forKey: "sesame",
    job: "savoury depth",
    replacing: "Tahini in a dressing",
    use: "Sunflower seed butter, thinned the same way with lemon and water.",
    cost: "Paler, sweeter and less bitter. It also goes a slightly grey-green with lemon, which is harmless and looks odd.",
  },
  {
    forKey: "mustard",
    job: "emulsifying a dressing",
    replacing: "Mustard in a vinaigrette",
    use: "A little honey, or a spoon of the aquafaba from a tin of chickpeas, or simply whisking harder and serving straight away.",
    cost: "It will separate sooner. Dress at the table rather than in advance.",
  },
  {
    forKey: "celery",
    job: "savoury depth",
    replacing: "Celery in a stock or a soffritto",
    use: "Fennel stalk for the aromatic side, or a little more onion and a bay leaf. Make the stock rather than using a cube, since the cube is where celery usually is.",
    cost: "Fennel brings aniseed with it. Onion alone makes a sweeter, flatter base.",
  },
];

/** Substitutions for one thing being avoided. Empty is a legitimate answer. */
export function substitutionsFor(key: string): Substitution[] {
  return SUBSTITUTIONS.filter((entry) => entry.forKey === key);
}

export function substitutionsForAny(keys: readonly string[]): Substitution[] {
  return SUBSTITUTIONS.filter((entry) => keys.includes(entry.forKey));
}

/**
 * When we hold nothing.
 *
 * The temptation is to produce something plausible, because a substitution is a low-stakes
 * sort of sentence. It is not: an invented substitute that does not do the job wastes
 * somebody's dinner and their confidence in everything else on the screen.
 */
export const NO_SUBSTITUTION_HELD =
  "We do not hold a substitution for that. Rather than guess at one, it is worth saying what the ingredient was doing in the dish — thickening, browning, holding it together — because that is the question a recipe search can actually answer.";
