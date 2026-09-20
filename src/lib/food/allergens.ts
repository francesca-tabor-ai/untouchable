/**
 * The hidden-name list, as data.
 *
 * Someone who has lived with coeliac disease for ten years knows about bread. What catches
 * them is malt vinegar in a chutney, semolina dusted under a pizza base, or brewer's yeast
 * in a stock. This table is the part of the Food Advisor that earns its place — everything
 * else in here is arrangement.
 *
 * Scope and sourcing: the fourteen allergens are the ones UK food law requires a business to
 * declare (Food Information Regulations 2014, retained EU 1169/2011 Annex II). The hidden
 * names are the forms those allergens are sold and written under. Where a name is
 * conditional — lecithin can come from soy or from egg — it says so rather than being listed
 * flatly under one, because a flat listing here is how somebody stops trusting the list.
 *
 * This is an ingredient-naming reference. It is not a judgement about any dish, and nothing
 * derived from it may be rendered as one.
 */

export interface Allergen {
  /** Stable key. Used in the profile and in URLs; never shown to anybody. */
  key: string;
  /** What a person would call it. */
  label: string;
  /** The names it is sold and written under that people miss. */
  hiddenNames: string[];
  /** Where it turns up without being named on the menu at all. */
  unexpectedIn: string[];
  /** What to ask, worded to get an answer rather than a shrug. */
  askTheKitchen: string[];
}

export const ALLERGENS: readonly Allergen[] = [
  {
    key: "gluten",
    label: "Cereals containing gluten",
    hiddenNames: [
      "wheat", "rye", "barley", "spelt", "khorasan", "kamut", "durum", "semolina",
      "couscous", "bulgur", "farina", "freekeh", "einkorn", "emmer", "triticale",
      "malt", "malt extract", "malt vinegar", "malted barley", "brewer's yeast",
      "seitan", "rusk", "hydrolysed wheat protein", "wheat starch", "atta", "graham flour",
    ],
    unexpectedIn: [
      "soy sauce", "stock cubes and gravy", "chips fried in a shared fryer",
      "sausages and burgers with rusk in them", "some chutneys and pickles",
      "dusting flour under a pizza or on a work surface", "communion wafers", "some crisps",
    ],
    askTheKitchen: [
      "Is the sauce thickened with flour, and is the stock made from a cube?",
      "Are the chips cooked in the same oil as anything breaded or battered?",
    ],
  },
  {
    key: "crustaceans",
    label: "Crustaceans",
    hiddenNames: ["prawn", "shrimp", "crab", "lobster", "langoustine", "scampi", "crayfish", "krill", "crevette"],
    unexpectedIn: [
      "shrimp paste in South East Asian curry pastes", "crab stick, which is usually fish plus crab flavour",
      "some laksa and tom yum bases", "XO sauce",
    ],
    askTheKitchen: ["Is there shrimp paste in the curry paste, and is the paste made here or bought in?"],
  },
  {
    key: "eggs",
    label: "Eggs",
    hiddenNames: [
      "albumen", "ovalbumin", "ovomucoid", "globulin", "livetin", "lysozyme", "vitellin",
      "meringue", "mayonnaise", "aioli", "hollandaise", "egg wash", "egg glaze",
    ],
    unexpectedIn: [
      "fresh pasta", "the glaze brushed on pastry and bread", "some ice cream and sorbet",
      "mousse and anything set without gelatine", "Caesar dressing", "some wines, fined with egg white",
    ],
    askTheKitchen: ["Is the pasta fresh or dried, and is anything brushed with egg before it goes in the oven?"],
  },
  {
    key: "fish",
    label: "Fish",
    hiddenNames: [
      "anchovy", "anchovies", "bonito", "dashi", "katsuobushi", "nam pla", "nuoc mam",
      "fish sauce", "fish stock", "surimi", "isinglass", "garum", "colatura",
    ],
    unexpectedIn: [
      "Worcestershire sauce, and anything made with it",
      "Caesar dressing", "puttanesca and many tomato sauces", "Thai and Vietnamese dressings and curry pastes",
      "some kimchi", "XO sauce", "some real ales and wines, fined with isinglass",
    ],
    askTheKitchen: [
      "Is there anchovy or fish sauce in the dressing or the base?",
      "Does the marinade have Worcestershire sauce in it?",
    ],
  },
  {
    key: "peanuts",
    label: "Peanuts",
    hiddenNames: ["groundnut", "groundnut oil", "arachis", "arachis oil", "monkey nut", "beer nuts", "mandelonas", "earth nut"],
    unexpectedIn: [
      "satay, and anything satay has touched", "some chilli and mole sauces used to thicken",
      "some vegetarian mince and protein bars", "ice cream from a shared scoop",
      "biscuits and cakes made in a bakery that also uses peanuts",
    ],
    askTheKitchen: [
      "Are peanuts used anywhere in this kitchen, including to thicken a sauce?",
      "Is the frying oil groundnut oil, and is it shared?",
    ],
  },
  {
    key: "soy",
    label: "Soybeans",
    hiddenNames: [
      "soya", "soja", "edamame", "tofu", "tempeh", "miso", "natto", "tamari", "shoyu",
      "TVP", "textured vegetable protein", "hydrolysed vegetable protein", "okara", "yuba",
      "soy lecithin", "lecithin (E322)",
    ],
    unexpectedIn: [
      "most soy sauce, and therefore most East Asian marinades", "hoisin and black bean sauce",
      "chocolate, through lecithin", "many breads and baked goods", "some tinned tuna", "vegetable oil blends",
    ],
    askTheKitchen: ["Is there soy sauce, miso or hoisin anywhere in the marinade or the dressing?"],
  },
  {
    key: "milk",
    label: "Milk",
    hiddenNames: [
      "casein", "caseinate", "sodium caseinate", "whey", "whey protein", "lactose",
      "lactalbumin", "lactoglobulin", "ghee", "curds", "paneer", "quark", "milk solids",
      "butterfat", "buttermilk", "milk powder", "skimmed milk powder",
    ],
    unexpectedIn: [
      "steak and vegetables finished with butter", "some breads and naan",
      "ghee in Indian cooking, in dishes described as dairy-light", "some crisps and flavoured snacks",
      "many dark chocolates", "some sausages and processed meat, through milk powder",
    ],
    askTheKitchen: [
      "Is anything finished with butter or cream in the pan before it comes out?",
      "Is the bread or the naan made with milk or ghee?",
    ],
  },
  {
    key: "tree-nuts",
    label: "Nuts",
    hiddenNames: [
      "almond", "hazelnut", "walnut", "cashew", "pecan", "brazil nut", "pistachio", "macadamia",
      "queensland nut", "marzipan", "praline", "frangipane", "nougat", "gianduja", "nut butter",
      "amaretto", "orgeat", "persipan", "dukkah",
    ],
    unexpectedIn: [
      "pesto, which is often cashew rather than pine nut", "korma and pasanda, thickened with ground almond",
      "vegan cheese and cream sauces, usually cashew", "baklava and many pastries",
      "some salad dressings", "anything from a bakery with shared equipment",
    ],
    askTheKitchen: [
      "Is the sauce thickened with ground nuts?",
      "Is this made in the same area as the desserts, and is any equipment shared?",
    ],
  },
  {
    key: "celery",
    label: "Celery",
    hiddenNames: ["celeriac", "celery salt", "celery seed", "celery extract"],
    unexpectedIn: [
      "stock cubes and bouillon, almost always", "the mirepoix or soffritto under most soups, stews and ragùs",
      "many spice blends", "some tomato juice and Bloody Mary mixes", "some sausages",
    ],
    askTheKitchen: ["Is the stock made from a cube or a bought-in base, and does it have celery in it?"],
  },
  {
    key: "mustard",
    label: "Mustard",
    hiddenNames: ["mustard flour", "mustard seed", "mustard oil", "sinapis", "piccalilli"],
    unexpectedIn: [
      "most vinaigrette, as the emulsifier", "many curry powders and spice blends",
      "some sausages and burgers", "barbecue and brown sauce", "some breadcrumb coatings",
    ],
    askTheKitchen: ["Is there mustard in the dressing? It is often in there as the emulsifier rather than for flavour."],
  },
  {
    key: "sesame",
    label: "Sesame",
    hiddenNames: ["tahini", "tahina", "halva", "gomashio", "benne", "til", "sesamol", "gingelly oil", "za'atar"],
    unexpectedIn: [
      "hummus and baba ganoush", "burger buns and many breads", "falafel",
      "most Middle Eastern and many East Asian dressings", "seeded crackers and dukkah",
    ],
    askTheKitchen: ["Is there tahini in this, and are the buns or bread seeded?"],
  },
  {
    key: "sulphites",
    label: "Sulphur dioxide and sulphites",
    hiddenNames: ["sulphur dioxide", "sulfites", "E220", "E221", "E222", "E223", "E224", "E226", "E227", "E228", "sodium metabisulphite"],
    unexpectedIn: [
      "wine, cider and beer", "dried fruit", "some sausages and burgers as a preservative",
      "bottled lemon and lime juice", "some prepared potato products", "vinegar and pickles",
    ],
    askTheKitchen: ["Are the dried fruit or the sausages preserved with sulphites?"],
  },
  {
    key: "lupin",
    label: "Lupin",
    hiddenNames: ["lupin flour", "lupine", "lupini beans"],
    unexpectedIn: [
      "some breads, pastries and pasta, particularly gluten-replacing ones imported from Europe",
      "some vegan protein products",
    ],
    askTheKitchen: ["Does the flour blend in the bread contain lupin?"],
  },
  {
    key: "molluscs",
    label: "Molluscs",
    hiddenNames: ["mussel", "oyster", "clam", "scallop", "squid", "calamari", "octopus", "cuttlefish", "whelk", "snail", "escargot", "abalone", "oyster sauce"],
    unexpectedIn: [
      "oyster sauce, in a great deal of Cantonese cooking", "many stir-fry sauces",
      "fish stock and seafood bases", "some Worcestershire-style sauces", "paella and mixed seafood dishes",
    ],
    askTheKitchen: ["Is there oyster sauce in the stir-fry sauce?"],
  },
] as const;

const BY_KEY = new Map(ALLERGENS.map((allergen) => [allergen.key, allergen]));

export function allergen(key: string): Allergen | null {
  return BY_KEY.get(key) ?? null;
}

export function allergenLabel(key: string): string {
  return BY_KEY.get(key)?.label ?? key;
}

/**
 * Names that mean more than one thing.
 *
 * Lecithin is the example that matters: E322 is usually soy and is sometimes egg, and a
 * label saying only "lecithin" has told you nothing. Listing it flatly under soy would be
 * wrong for the person avoiding egg, so the ambiguity is carried rather than resolved.
 */
export const AMBIGUOUS_NAMES: readonly { name: string; couldBe: string[]; note: string }[] = [
  {
    name: "lecithin",
    couldBe: ["soy", "eggs"],
    note: "E322 is usually made from soy and is sometimes made from egg. A label that says only “lecithin” has not told you which.",
  },
  {
    name: "natural flavouring",
    couldBe: ["milk", "fish", "celery"],
    note: "A flavouring can be derived from an allergen without naming it in the flavouring itself. UK law still requires the allergen to be declared, so ask for the full ingredients list.",
  },
  {
    name: "vegetable oil",
    couldBe: ["peanuts", "soy"],
    note: "An unspecified blend. Groundnut and soybean oil both appear in them.",
  },
  {
    name: "starch",
    couldBe: ["gluten"],
    note: "Modified starch may be from wheat or from maize. The wheat form has to be declared; the word on its own does not tell you.",
  },
] as const;

/**
 * Every written form of an allergen, for matching against an ingredients list.
 *
 * A hit means "this word appears and here is what it can mean". It is never evidence of
 * absence — a miss tells you nothing at all, which is why nothing in this module returns a
 * verdict and why `menu.ts` has no bucket called safe.
 */
export function namesToWatchFor(allergenKey: string): string[] {
  const entry = BY_KEY.get(allergenKey);
  if (!entry) return [];
  const ambiguous = AMBIGUOUS_NAMES.filter((item) => item.couldBe.includes(allergenKey)).map((item) => item.name);
  return [entry.label.toLowerCase(), ...entry.hiddenNames, ...ambiguous];
}

/** Which of the given allergens are named in a piece of text, and under which name. */
export function namesFoundIn(text: string, allergenKeys: readonly string[]): { allergenKey: string; foundAs: string }[] {
  const haystack = text.toLowerCase();
  const found: { allergenKey: string; foundAs: string }[] = [];

  for (const key of allergenKeys) {
    /**
     * The longest match, not the first.
     *
     * "Malt vinegar" and "malt" both hit on a chutney, and only one of them tells the
     * reader where in the dish the gluten actually is. Reporting "malt" there is
     * technically true and practically useless.
     */
    let longest: string | null = null;

    for (const name of namesToWatchFor(key)) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Word boundaries, so "nut" does not match "minute".
      if (new RegExp(`\\b${escaped}\\b`, "i").test(haystack)) {
        if (!longest || name.length > longest.length) longest = name;
      }
    }

    if (longest) found.push({ allergenKey: key, foundAs: longest });
  }

  return found;
}
