/**
 * Structural risks of a kitchen, as distinct from claims about a dish.
 *
 * This is the one place the tool is allowed to generalise, and the distinction it turns on
 * is worth being precise about. "A Thai kitchen commonly uses fish sauce in dishes that do
 * not mention fish" is a true statement about how a cuisine is cooked. "There is fish sauce
 * in your pad see ew" is a claim about a pan we cannot see, and we never make it.
 *
 * So everything in here is phrased as a property of the kitchen and renders as a prompt to
 * ask, never as a finding about what is on the plate.
 */

export interface Cuisine {
  key: string;
  label: string;
  /** Words on a menu that suggest this kitchen. Cheap and deliberately loose. */
  signals: string[];
  /** How the kitchen works, phrased as a property of the kitchen. */
  structuralRisks: { note: string; allergenKeys: string[] }[];
}

export const CUISINES: readonly Cuisine[] = [
  {
    key: "thai",
    label: "Thai and South East Asian",
    signals: ["pad thai", "green curry", "red curry", "tom yum", "som tam", "larb", "massaman", "satay", "thai"],
    structuralRisks: [
      { note: "Fish sauce is a base seasoning here, and it goes into dishes that do not mention fish anywhere on the menu — including vegetable dishes and dressings.", allergenKeys: ["fish"] },
      { note: "Curry pastes commonly contain shrimp paste, and are often bought in rather than made on site, so the kitchen may not know what is in them.", allergenKeys: ["crustaceans", "fish"] },
      { note: "Peanut is used in satay and also to thicken and garnish, and is often in the same section of the kitchen as everything else.", allergenKeys: ["peanuts"] },
    ],
  },
  {
    key: "italian",
    label: "Italian",
    signals: ["pasta", "risotto", "pizza", "puttanesca", "carbonara", "ragù", "ragu", "gnocchi", "italian"],
    structuralRisks: [
      { note: "Anchovy is used as a seasoning rather than as a fish — it is in puttanesca by definition, and often in a slow-cooked sauce where it is not detectable.", allergenKeys: ["fish"] },
      { note: "Parmesan and pecorino are made with animal rennet and appear in dishes listed as vegetarian; dishes are also commonly finished with butter or cream in the pan.", allergenKeys: ["milk"] },
      { note: "Fresh pasta is made with egg. Dried pasta usually is not, and a menu rarely says which is being used.", allergenKeys: ["eggs"] },
      { note: "Pizza bases are stretched on flour, so flour dust is across the whole surface.", allergenKeys: ["gluten"] },
    ],
  },
  {
    key: "indian",
    label: "Indian and South Asian",
    signals: ["curry", "korma", "tikka", "masala", "naan", "biryani", "dhal", "dal", "pasanda", "bhuna", "indian"],
    structuralRisks: [
      { note: "Ghee is clarified butter and is used widely, including in dishes a menu lists as vegan.", allergenKeys: ["milk"] },
      { note: "Korma, pasanda and many creamy sauces are thickened with ground almond or cashew.", allergenKeys: ["tree-nuts"] },
      { note: "Mustard seed and mustard oil are base ingredients rather than condiments here.", allergenKeys: ["mustard"] },
    ],
  },
  {
    key: "chinese",
    label: "Chinese and East Asian",
    signals: ["stir fry", "stir-fry", "chow mein", "dim sum", "szechuan", "sichuan", "cantonese", "wok", "chinese"],
    structuralRisks: [
      { note: "Soy sauce is in most sauces and marinades, and most soy sauce contains wheat.", allergenKeys: ["soy", "gluten"] },
      { note: "Oyster sauce is a standard stir-fry base and is not usually named on a menu.", allergenKeys: ["molluscs"] },
      { note: "Woks are used across the whole menu and are wiped rather than washed between dishes.", allergenKeys: ["crustaceans", "fish", "molluscs"] },
    ],
  },
  {
    key: "middle-eastern",
    label: "Middle Eastern and Levantine",
    signals: ["hummus", "falafel", "mezze", "shawarma", "tabbouleh", "baba ganoush", "halloumi", "za'atar", "lebanese", "turkish"],
    structuralRisks: [
      { note: "Tahini is sesame and is in most dips, dressings and sauces here.", allergenKeys: ["sesame"] },
      { note: "Bulgur and freekeh are wheat, and turn up in salads that read as though no wheat could be involved.", allergenKeys: ["gluten"] },
      { note: "Desserts are nut-heavy and are usually prepared in the same area as everything else.", allergenKeys: ["tree-nuts"] },
    ],
  },
  {
    key: "bakery",
    label: "Bakery and café",
    signals: ["bakery", "patisserie", "croissant", "pastry", "cake", "scone", "sourdough", "brownie"],
    structuralRisks: [
      { note: "A bakery shares equipment, surfaces and airborne flour across everything it makes. Separation is very difficult in this kind of kitchen, and for an anaphylactic allergy that is the finding, not the ingredients list.", allergenKeys: ["gluten", "tree-nuts", "eggs", "milk", "sesame"] },
      { note: "Pastry is glazed with egg after it is shaped, so egg can arrive on something whose recipe never called for it.", allergenKeys: ["eggs"] },
    ],
  },
  {
    key: "pub",
    label: "Pub and fried food",
    signals: ["pub", "fish and chips", "burger", "pie", "scampi", "sunday roast", "battered", "gravy"],
    structuralRisks: [
      { note: "One fryer usually does everything. Chips, battered fish, breaded scampi and onion rings commonly share oil.", allergenKeys: ["gluten", "fish", "crustaceans", "milk"] },
      { note: "Gravy and stock come from a base or a cube, which is where celery and wheat get in.", allergenKeys: ["celery", "gluten"] },
      { note: "Burgers and sausages contain rusk as a binder, and sometimes mustard and sulphites.", allergenKeys: ["gluten", "mustard", "sulphites"] },
    ],
  },
  {
    key: "japanese",
    label: "Japanese",
    signals: ["sushi", "ramen", "katsu", "teriyaki", "miso", "tempura", "udon", "japanese", "donburi"],
    structuralRisks: [
      { note: "Dashi is a fish stock and is the base of miso soup, most broths and many dressings, including in dishes listed as vegetarian.", allergenKeys: ["fish"] },
      { note: "Soy is in almost everything, and most soy sauce contains wheat. Tamari is the form made without wheat, and a kitchen may or may not use it.", allergenKeys: ["soy", "gluten"] },
      { note: "Tempura batter and katsu crumb are wheat, and the fryer is shared.", allergenKeys: ["gluten"] },
    ],
  },
] as const;

/** Which kitchens a menu looks like. More than one is a normal answer. */
export function cuisinesIn(menuText: string): Cuisine[] {
  const haystack = menuText.toLowerCase();
  return CUISINES.filter((cuisine) => cuisine.signals.some((signal) => haystack.includes(signal)));
}

/** The structural notes worth raising, given what this person is avoiding. */
export function structuralRisksFor(
  menuText: string,
  allergenKeys: readonly string[],
): { cuisine: string; note: string }[] {
  if (allergenKeys.length === 0) return [];

  return cuisinesIn(menuText).flatMap((cuisine) =>
    cuisine.structuralRisks
      .filter((risk) => risk.allergenKeys.some((key) => allergenKeys.includes(key)))
      .map((risk) => ({ cuisine: cuisine.label, note: risk.note })),
  );
}
