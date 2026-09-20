/**
 * Where the rules come from, and what this tool is.
 *
 * Every general rule in here traces to a named body. Rule 14 of AGENTS.md applies with full
 * force: the NHS, the BNF, the electronic Medicines Compendium, and the condition charities
 * that publish guidance rather than sell treatment. Never a clinic, never a supplement
 * company, never a meal-kit brand, however good the page is. The one thing this platform has
 * is that nobody paid to be here.
 *
 * Where guidance genuinely conflicts or has moved recently, the honest thing is to say so
 * rather than pick the side that makes a tidier sentence.
 */

export interface Source {
  key: string;
  body: string;
  covers: string;
  url: string;
}

export const SOURCES: readonly Source[] = [
  {
    key: "nhs-allergy",
    body: "NHS",
    covers: "Food allergy and intolerance, and eating out with an allergy",
    url: "https://www.nhs.uk/conditions/food-allergy/",
  },
  {
    key: "fsa-allergen",
    body: "Food Standards Agency",
    covers: "The fourteen allergens a UK food business must declare, and what you are entitled to ask for",
    url: "https://www.food.gov.uk/safety-hygiene/food-allergy-and-intolerance",
  },
  {
    key: "coeliac-uk",
    body: "Coeliac UK",
    covers: "Gluten in coeliac disease, including the forms it is sold under",
    url: "https://www.coeliac.org.uk/",
  },
  {
    key: "bda",
    body: "British Dietetic Association",
    covers: "Food fact sheets, and finding a registered dietitian",
    url: "https://www.bda.uk.com/food-health/food-facts.html",
  },
  {
    key: "bnf",
    body: "British National Formulary",
    covers: "Drug interactions, including with food and drink",
    url: "https://bnf.nice.org.uk/",
  },
  {
    key: "nhs-kidney-diet",
    body: "NHS",
    covers: "Diet in chronic kidney disease, including potassium",
    url: "https://www.nhs.uk/conditions/kidney-disease/living-with/",
  },
  {
    key: "beat",
    body: "Beat",
    covers: "Support if eating has become frightening or difficult",
    url: "https://www.beateatingdisorders.org.uk/",
  },
] as const;

export function source(key: string): Source | null {
  return SOURCES.find((entry) => entry.key === key) ?? null;
}

/**
 * The caveat.
 *
 * One line, and placed where it will be read rather than stacked at the top where it is
 * scrolled past. Somebody is standing in a restaurant with four people waiting for them.
 */
export const WHAT_THIS_IS =
  "This turns what you have told us into questions worth asking. It cannot see inside the food, and it never says a dish is all right for you — only the kitchen can tell you that.";

export const NOT_A_DIETITIAN =
  "This is not a dietitian and not an allergy service. If your list of what you avoid is getting longer, or you are not sure a restriction still applies, a GP can refer you to a registered dietitian.";

/** Where a restriction was set by a clinician, the tool's only move is to help ask. */
export const ASK_THE_CLINICIAN =
  "If a clinician set this, it stays. We do not hold the reason it was set and it is not ours to relax — but it is worth asking at your next appointment whether it still applies, because these often outlive the reason for them.";
