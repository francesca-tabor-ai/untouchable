/**
 * Filtering conditions by the body system they affect.
 *
 * Eleven systems, one word each, so the row of filters fits on a phone. Where the textbook
 * name is jargon somebody frightened at 2am would not recognise, the plainer word is used:
 * "Skin" for the integumentary system, "Immune" for the lymphatic and immune system,
 * "Urinary" for the excretory system. Everything else keeps its own name.
 *
 * **This is a way of finding things, not a statement about anybody's illness.** The mapping
 * below says where a condition is most usefully looked for. It does not say what causes it,
 * how serious it is, or how it should be treated, and nothing on the page may read it that
 * way (AGENTS.md rule 9).
 *
 * **Some conditions have no system, on purpose.** Depression, PTSD, eating disorders and
 * addiction are not conditions of an organ, and filing them under "Nervous" would be a
 * clinical claim this platform has no business making. A trauma is not a condition of the
 * body at all. Those entries are `[]`: they are always on the unfiltered list and never under
 * a system. See DECISIONS.md PL-58.
 *
 * A condition that is not in this table at all behaves the same way — it shows on the full
 * list and nowhere else — which is the safe failure when an editor adds a condition before
 * this file is updated. `tests/unit/body-systems.test.ts` keeps the known list honest.
 */

export const BODY_SYSTEMS = [
  { key: "circulatory", label: "Circulatory", about: "The heart and blood vessels, which move blood around the body." },
  { key: "digestive", label: "Digestive", about: "The stomach, gut, liver and pancreas, which break down food." },
  { key: "endocrine", label: "Endocrine", about: "The glands that make hormones, such as the thyroid and pancreas." },
  { key: "urinary", label: "Urinary", about: "The kidneys and bladder, which filter the blood and remove waste." },
  { key: "skin", label: "Skin", about: "The skin, hair and nails, which protect the body." },
  { key: "immune", label: "Immune", about: "The lymph nodes, spleen and bone marrow, which fight infection." },
  { key: "muscular", label: "Muscular", about: "The muscles, which move the body." },
  { key: "nervous", label: "Nervous", about: "The brain, spinal cord and nerves, including the senses." },
  { key: "reproductive", label: "Reproductive", about: "The organs involved in sex, pregnancy and birth." },
  { key: "respiratory", label: "Respiratory", about: "The lungs and airways, which bring in oxygen." },
  { key: "skeletal", label: "Skeletal", about: "The bones, joints, cartilage and ligaments." },
] as const;

export type BodySystem = (typeof BODY_SYSTEMS)[number]["key"];

/**
 * Where each condition is looked for. Keyed by condition slug.
 *
 * A condition may sit under more than one system when it genuinely belongs to both — a brain
 * aneurysm is a blood vessel in the brain. It is never added to a second system just to be
 * findable in more places.
 */
export const CONDITION_SYSTEMS: Record<string, readonly BodySystem[]> = {
  "acid-and-chemical-burns": ["skin"],
  "brain-aneurysm": ["circulatory", "nervous"],
  "brain-tumour": ["nervous"],
  // The breast is not in the eleven. It is grouped here with the reproductive system, as it
  // commonly is; the call is recorded in PL-58 so it can be revisited.
  "breast-cancer": ["reproductive"],
  "colloid-cyst": ["nervous"],
  encephalitis: ["nervous"],
  endometriosis: ["reproductive"],
  fibromyalgia: ["muscular"],
  "frontotemporal-dementia": ["nervous"],
  hiv: ["immune"],
  "hodgkin-lymphoma": ["immune"],
  "kidney-transplant": ["urinary"],
  "laryngeal-cancer": ["respiratory"],
  lupus: ["immune"],
  menopause: ["reproductive", "endocrine"],
  "motor-neurone-disease": ["nervous"],
  "multiple-sclerosis": ["nervous", "immune"],
  "parkinsons-disease": ["nervous"],
  pots: ["circulatory", "nervous"],
  "pre-eclampsia": ["circulatory", "reproductive"],
  "sickle-cell-disease": ["circulatory"],
  "sjogrens-syndrome": ["immune"],
  "spinal-cord-injury": ["nervous"],
  "stiff-person-syndrome": ["nervous", "muscular"],
  svt: ["circulatory"],
  tinnitus: ["nervous"],
  "type-2-diabetes": ["endocrine"],

  // Deliberately in no system. Not organ conditions, and placing them under one would be a
  // clinical claim. They stay on the full list.
  adhd: [],
  "alcohol-use-disorder": [],
  "binge-eating-disorder": [],
  bulimia: [],
  depression: [],
  "drug-addiction": [],
  "postnatal-depression": [],
  ptsd: [],
  "sexual-abuse": [],
  // A gene change, not a condition of a system.
  "brca1-gene-change": [],
  // An infection that can reach the skin, joints and nerves. No single system fits, and
  // listing three would overstate what is known about any one person's illness.
  "lyme-disease": [],
};

export function systemsFor(slug: string): readonly BodySystem[] {
  return CONDITION_SYSTEMS[slug] ?? [];
}

/** A system from the URL, or null for anything that is not one. Never throws. */
export function parseSystem(value: string | string[] | undefined): BodySystem | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return BODY_SYSTEMS.find((system) => system.key === raw)?.key ?? null;
}

export function filterBySystem<T extends { slug: string }>(
  conditions: readonly T[],
  system: BodySystem | null,
): T[] {
  if (system === null) return [...conditions];
  return conditions.filter((condition) => systemsFor(condition.slug).includes(system));
}

/** How many of these conditions each system would show, so an empty filter is visible before it is tapped. */
export function countBySystem(conditions: readonly { slug: string }[]): Record<BodySystem, number> {
  const counts = Object.fromEntries(BODY_SYSTEMS.map((system) => [system.key, 0])) as Record<
    BodySystem,
    number
  >;
  for (const condition of conditions) {
    for (const system of systemsFor(condition.slug)) counts[system] += 1;
  }
  return counts;
}
