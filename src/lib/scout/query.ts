import type { SearchFilters, SearchQueries } from "./types";

/**
 * Turning a plain question into a search a database understands.
 *
 * This part is rules, not a model: a question is matched against a short list of concepts,
 * each with its MeSH heading and the words authors actually use. The result is shown to the
 * person and they can edit it — the query is theirs, and a search nobody can read is a search
 * nobody can check. Claude can suggest a better one (`suggestQuery` in `summarise.ts`) but the
 * suggestion also lands in the same editable box.
 *
 * The first concept named is the anchor: "tinnitus and the teeth, jaw and nerves" searches
 * for tinnitus AND (teeth OR jaw OR nerves). That is how people phrase these questions — the
 * thing they have, then the things they wonder about — and it keeps a search about tinnitus
 * from returning every paper ever written about molars.
 */

export interface Concept {
  key: string;
  label: string;
  /** Words in a question that point to this concept. Matched on word boundaries. */
  triggers: RegExp;
  mesh: string[];
  keywords: string[];
  /** Territory worth searching alongside, offered as a choice rather than added silently. */
  related?: string[];
}

export const CONCEPTS: Concept[] = [
  {
    key: "tinnitus",
    label: "Tinnitus",
    triggers: /\btinnitus\b|\bringing in (my|the) ears?\b/i,
    mesh: ["Tinnitus"],
    keywords: ["tinnitus", "somatosensory tinnitus", "somatic tinnitus"],
    related: ["somatosensory"],
  },
  {
    key: "somatosensory",
    label: "Somatic (somatosensory) tinnitus",
    triggers: /\bsomat(ic|osensory)\b/i,
    mesh: [],
    keywords: ["somatosensory tinnitus", "somatic tinnitus", "somatosensory modulation"],
  },
  {
    key: "teeth",
    label: "Teeth",
    triggers: /\bteeth\b|\btooth\b|\bdental\b|\bmolars?\b|\bdentist\w*/i,
    mesh: ["Tooth Diseases", "Tooth"],
    keywords: ["teeth", "tooth", "dental", "molar"],
    related: ["malocclusion", "dental-infection"],
  },
  {
    key: "jaw",
    label: "Jaw and TMJ",
    triggers: /\bjaws?\b|\btmj\b|\btmd\b|\btemporomandibular\b/i,
    mesh: ["Temporomandibular Joint Disorders"],
    keywords: ["temporomandibular", "TMD", "TMJ", "jaw"],
    related: ["bruxism"],
  },
  {
    key: "nerves",
    label: "Trigeminal and other nerves",
    triggers: /\bnerves?\b|\btrigeminal\b|\bneural\b/i,
    mesh: ["Trigeminal Nerve"],
    keywords: ["trigeminal", "cranial nerve"],
  },
  {
    key: "bruxism",
    label: "Teeth grinding (bruxism)",
    triggers: /\bbruxism\b|\bgrind\w*\b|\bclench\w*\b/i,
    mesh: ["Bruxism"],
    keywords: ["bruxism", "teeth grinding", "clenching"],
  },
  {
    key: "malocclusion",
    label: "Teeth out of line (malocclusion)",
    triggers: /\bmalocclusion\b|\bbite\b|\bout of (place|line)\b|\bcrooked\b/i,
    mesh: ["Malocclusion"],
    keywords: ["malocclusion", "occlusion", "dental occlusion"],
  },
  {
    key: "dental-infection",
    label: "Dental infection",
    triggers: /\babscess\w*\b|\bpulpitis\b|\broot canal\b|\binfected tooth\b|\bdental infection\b/i,
    mesh: ["Focal Infection, Dental", "Periapical Abscess", "Pulpitis"],
    keywords: ["dental infection", "periapical", "endodontic", "root canal"],
  },
  {
    key: "labyrinthitis",
    label: "Labyrinthitis",
    triggers: /\blabyrinthitis\b|\bvestibular neuritis\b|\binner ear infection\b/i,
    mesh: ["Labyrinthitis", "Vestibular Neuronitis"],
    keywords: ["labyrinthitis", "vestibular neuritis"],
  },
  {
    key: "insomnia",
    label: "Insomnia",
    triggers: /\binsomnia\b|\b(can't|cannot|can not) sleep\b|\bsleep\w*/i,
    mesh: ["Sleep Initiation and Maintenance Disorders"],
    keywords: ["insomnia", "sleep disturbance"],
  },
  {
    key: "hearing-loss",
    label: "Hearing loss",
    triggers: /\bhearing loss\b|\bdeaf\w*\b|\bhard of hearing\b/i,
    mesh: ["Hearing Loss"],
    keywords: ["hearing loss"],
  },
  {
    key: "vertigo",
    label: "Dizziness and vertigo",
    triggers: /\bvertigo\b|\bdizz\w*\b/i,
    mesh: ["Vertigo", "Dizziness"],
    keywords: ["vertigo", "dizziness"],
  },
  {
    key: "migraine",
    label: "Migraine and headache",
    triggers: /\bmigraines?\b|\bheadaches?\b/i,
    mesh: ["Migraine Disorders", "Headache"],
    keywords: ["migraine", "headache"],
  },
  {
    key: "neck",
    label: "Neck",
    triggers: /\bneck\b|\bcervical spine\b|\bwhiplash\b/i,
    mesh: ["Neck Pain"],
    keywords: ["neck pain", "cervical"],
  },
];

const BY_KEY = new Map(CONCEPTS.map((concept) => [concept.key, concept]));

export function conceptByKey(key: string): Concept | undefined {
  return BY_KEY.get(key);
}

/** Concepts named in the question, in the order they first appear. */
export function conceptsIn(question: string): Concept[] {
  return CONCEPTS.map((concept) => ({ concept, at: question.search(concept.triggers) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ concept }) => concept);
}

/** Related territory for what was named, minus what was already named. */
export function relatedTo(concepts: Concept[]): Concept[] {
  const named = new Set(concepts.map((concept) => concept.key));
  const related = new Set(concepts.flatMap((concept) => concept.related ?? []));
  return [...related]
    .filter((key) => !named.has(key))
    .map((key) => BY_KEY.get(key))
    .filter((concept): concept is Concept => Boolean(concept));
}

const STOPWORDS = new Set(
  "a an and are as at be between by can could do does for from how i in into is it its link links me my of on or relationship relation research show shows study studies that the their there these this to was what when where which who why with would".split(
    " ",
  ),
);

/** Words from the question that no concept claimed, for a question we have no concepts for. */
export function freeTerms(question: string): string[] {
  return [
    ...new Set(
      question
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !STOPWORDS.has(word)),
    ),
  ].slice(0, 6);
}

const quote = (term: string) => (/\s|-/.test(term) ? `"${term}"` : term);

function pubmedBlock(concept: Concept): string {
  const parts = [
    ...concept.mesh.map((heading) => `"${heading}"[MeSH Terms]`),
    ...concept.keywords.map((keyword) => `${quote(keyword)}[tiab]`),
  ];
  return parts.length === 1 ? parts[0] : `(${parts.join(" OR ")})`;
}

function europeBlock(concept: Concept): string {
  const parts = concept.keywords.map(quote);
  return parts.length === 1 ? parts[0] : `(${parts.join(" OR ")})`;
}

function combine(blocks: string[]): string {
  if (blocks.length <= 1) return blocks[0] ?? "";
  const [anchor, ...rest] = blocks;
  return rest.length === 1 ? `${anchor} AND ${rest[0]}` : `${anchor} AND (${rest.join(" OR ")})`;
}

/**
 * The two search strings for a question, before filters. PubMed gets MeSH headings as well
 * as words; Europe PMC gets words only, because its MeSH field behaves differently and a
 * query that silently matches nothing is worse than a slightly broader one.
 */
export function buildQueries(question: string, extraConceptKeys: string[] = []): SearchQueries {
  const named = conceptsIn(question);
  const extra = extraConceptKeys
    .map((key) => BY_KEY.get(key))
    .filter((concept): concept is Concept => Boolean(concept))
    .filter((concept) => !named.some((already) => already.key === concept.key));
  const concepts = [...named, ...extra];

  if (concepts.length === 0) {
    const words = freeTerms(question);
    const fallback = words.length > 0 ? words : [question.trim()];
    return {
      pubmed: fallback.map((word) => `${quote(word)}[tiab]`).join(" AND "),
      europepmc: fallback.map(quote).join(" AND "),
    };
  }

  return {
    pubmed: combine(concepts.map(pubmedBlock)),
    europepmc: combine(concepts.map(europeBlock)),
  };
}

const PUBMED_STUDY_FILTER: Record<Exclude<SearchFilters["studyType"], "any">, string> = {
  systematic_review: `("systematic review"[pt] OR "meta-analysis"[pt])`,
  randomised_trial: `"randomized controlled trial"[pt]`,
  observational: `"observational study"[pt]`,
  case_report: `"case reports"[pt]`,
};

const EUROPE_STUDY_FILTER: Record<Exclude<SearchFilters["studyType"], "any">, string> = {
  systematic_review: `(PUB_TYPE:"systematic-review" OR PUB_TYPE:"Meta-Analysis" OR PUB_TYPE:"Systematic Review")`,
  randomised_trial: `PUB_TYPE:"Randomized Controlled Trial"`,
  observational: `PUB_TYPE:"Observational Study"`,
  case_report: `(PUB_TYPE:"Case Reports" OR PUB_TYPE:"case-report")`,
};

/** The query as sent, filters included. Kept separate so the editable box shows only the topic. */
export function withFilters(queries: SearchQueries, filters: SearchFilters, now = new Date()) {
  const fromYear = now.getUTCFullYear() - filters.years + 1;

  const pubmed = [`(${queries.pubmed})`];
  // Titles and abstracts only, as PubMed's [tiab] does. Europe PMC otherwise searches full
  // text, where a paper that mentions tinnitus once in its references counts as a match.
  const europepmc = [`TITLE_ABS:(${queries.europepmc})`, `FIRST_PDATE:[${fromYear}-01-01 TO 3000-12-31]`];

  if (filters.studyType !== "any") {
    pubmed.push(PUBMED_STUDY_FILTER[filters.studyType]);
    europepmc.push(EUROPE_STUDY_FILTER[filters.studyType]);
  }
  if (filters.openAccessOnly) {
    pubmed.push(`"free full text"[sb]`);
    europepmc.push(`OPEN_ACCESS:y`);
  }
  if (filters.humansOnly) {
    pubmed.push(`"humans"[MeSH Terms]`);
    // Europe PMC has no dependable equivalent; animal studies are dropped after classification.
  }

  return { pubmed: pubmed.join(" AND "), europepmc: europepmc.join(" AND "), fromYear };
}

function anyOf(text: string): SearchQueries | null {
  const concepts = conceptsIn(text);
  if (concepts.length > 0) {
    const join = (blocks: string[]) => (blocks.length === 1 ? blocks[0] : `(${blocks.join(" OR ")})`);
    return { pubmed: join(concepts.map(pubmedBlock)), europepmc: join(concepts.map(europeBlock)) };
  }
  const words = freeTerms(text);
  if (words.length === 0) return null;
  return {
    pubmed: `(${words.map((word) => `${quote(word)}[tiab]`).join(" OR ")})`,
    europepmc: `(${words.map(quote).join(" OR ")})`,
  };
}

/**
 * A search anchored on one thing, narrowed by any of several others: "this condition, and any
 * of these symptoms". Used by the hand-off from the symptom timeline, where the condition must
 * stay the anchor even when it is one this file has no concept for.
 */
export function anchoredQueries(anchor: string, others: string[]): SearchQueries {
  const known = conceptsIn(anchor)[0];
  const anchorQueries = known
    ? { pubmed: pubmedBlock(known), europepmc: europeBlock(known) }
    : { pubmed: `${quote(anchor.trim())}[tiab]`, europepmc: quote(anchor.trim()) };

  const narrowing = others.length > 0 ? anyOf(others.join(", ")) : null;
  if (!narrowing) return anchorQueries;
  return {
    pubmed: `${anchorQueries.pubmed} AND ${narrowing.pubmed}`,
    europepmc: `${anchorQueries.europepmc} AND ${narrowing.europepmc}`,
  };
}
