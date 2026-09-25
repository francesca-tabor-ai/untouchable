import type { StudyType } from "./types";

/**
 * What kind of study a paper is, and how much weight that kind of study can carry.
 *
 * Classified from the index first. PubMed and Europe PMC tag every record with publication
 * types assigned by indexers ("Randomized Controlled Trial", "Case Reports"), and a tag a
 * trained indexer applied is a better source than any reading of the abstract — ours or a
 * model's. Only when the tags say nothing more specific than "Journal Article" do we look at
 * the record's own words, and only when those say nothing does Claude get asked (see
 * `summarise.ts`). The card says which of the three it was.
 *
 * The strength scale is the ordinary hierarchy of evidence and it describes the design, not
 * the paper. A careless meta-analysis is still level 1 here, and the note says "if the
 * studies it pools were good" for exactly that reason. It ranks kinds of study. It never
 * ranks treatments, and nothing on the card says which result to believe.
 */

export interface StudyTypeInfo {
  label: string;
  /** 1 is the design that can bear the most weight; 6 the least. Null when we cannot tell. */
  level: number | null;
  /** One line, plain English, on how much weight this kind of study can bear. */
  note: string;
}

export const STUDY_TYPE_INFO: Record<StudyType, StudyTypeInfo> = {
  systematic_review: {
    label: "Systematic review or meta-analysis",
    level: 1,
    note: "Pulls together many earlier studies on one question. The strongest kind of evidence, if the studies it pools were good.",
  },
  randomised_trial: {
    label: "Randomised trial",
    level: 2,
    note: "People were put into groups at random and compared. The best design for testing cause and effect, especially when large.",
  },
  observational: {
    label: "Observational study",
    level: 3,
    note: "Researchers watched or compared groups without changing anything. It can show that two things go together, not that one causes the other.",
  },
  case_series: {
    label: "Case series",
    level: 4,
    note: "A small group of patients described together, with no comparison group. Useful for ideas, weak as evidence.",
  },
  case_report: {
    label: "Case report",
    level: 5,
    note: "One patient's story. It shows something can happen, not how often it does.",
  },
  animal_or_lab: {
    label: "Animal or laboratory study",
    level: 6,
    note: "Done in animals or in cells, not in people. What happens there often does not happen in people.",
  },
  narrative_review: {
    label: "Review (not systematic)",
    level: 5,
    note: "Experts summarising the field in their own words. Not new research, and only as balanced as the papers the authors chose.",
  },
  opinion: {
    label: "Opinion, letter or editorial",
    level: 6,
    note: "Someone's view, not a study. Worth knowing about, not evidence on its own.",
  },
  unclassified: {
    label: "Type of study not known",
    level: null,
    note: "The record does not say what kind of study this is. Read the abstract before giving it any weight.",
  },
};

/**
 * Publication types, most specific first. The first match wins, so a record tagged both
 * "Review" and "Systematic Review" is a systematic review.
 */
const INDEX_RULES: [RegExp, StudyType][] = [
  [/^(systematic[- ]review|meta-analysis|systematic review)$/i, "systematic_review"],
  [/randomi[sz]ed controlled trial|^clinical trial, phase (ii|iii|iv)$/i, "randomised_trial"],
  [/^(observational study|cohort studies|case-control studies|cross-sectional studies|comparative study|multicenter study)$/i, "observational"],
  [/^case[- ]reports?$/i, "case_report"],
  [/^(editorial|comment|letter|news|interview)$/i, "opinion"],
  [/^(review|review-article)$/i, "narrative_review"],
];

export function studyTypeFromIndex(publicationTypes: string[], mesh: string[] = []): StudyType | null {
  for (const [pattern, type] of INDEX_RULES) {
    if (publicationTypes.some((tag) => pattern.test(tag.trim()))) return type;
  }
  // MEDLINE indexes the population: "Animals" without "Humans" means nobody in it was a person.
  const hasAnimals = mesh.some((heading) => /^animals$/i.test(heading));
  const hasHumans = mesh.some((heading) => /^humans$/i.test(heading));
  if (hasAnimals && !hasHumans) return "animal_or_lab";
  return null;
}

/** The record's own words, when the tags were no help. Conservative: no match means no guess. */
const RECORD_RULES: [RegExp, StudyType][] = [
  [/\bsystematic review\b|\bmeta-analys[ie]s\b/i, "systematic_review"],
  [/\brandomi[sz]ed\b.{0,40}\b(trial|study)\b|\brandomly (assigned|allocated)\b/i, "randomised_trial"],
  [/\bcase report\b|\bwe (report|present|describe) (a|the) case\b|\ba \d{1,3}-year-old (man|woman|male|female|patient)\b/i, "case_report"],
  [/\bcase series\b|\bretrospective(ly)? review of \d+ (patients|cases)\b/i, "case_series"],
  [/\b(cohort|case-control|cross-sectional|prospective|retrospective|population-based)\b.{0,30}\b(study|analysis|design|survey)\b/i, "observational"],
  [/\b(mice|mouse|rats?|murine|rodents?|guinea pigs?|in vitro|cell lines?|zebrafish)\b/i, "animal_or_lab"],
  [/\bscoping review\b|\bnarrative review\b|\bliterature review\b|\bwe review\b/i, "narrative_review"],
];

export function studyTypeFromRecord(title: string, abstract: string | null): StudyType | null {
  const words = `${title} ${abstract ?? ""}`;
  for (const [pattern, type] of RECORD_RULES) {
    if (pattern.test(words)) return type;
  }
  return null;
}

export function classify(input: {
  publicationTypes: string[];
  mesh?: string[];
  title: string;
  abstract: string | null;
}): { study_type: StudyType; study_type_source: "index" | "record" | "none"; strength_level: number | null } {
  const fromIndex = studyTypeFromIndex(input.publicationTypes, input.mesh);
  if (fromIndex) return { study_type: fromIndex, study_type_source: "index", strength_level: STUDY_TYPE_INFO[fromIndex].level };

  const fromRecord = studyTypeFromRecord(input.title, input.abstract);
  if (fromRecord) return { study_type: fromRecord, study_type_source: "record", strength_level: STUDY_TYPE_INFO[fromRecord].level };

  return { study_type: "unclassified", study_type_source: "none", strength_level: null };
}

/**
 * How many people were studied, when the abstract states it plainly. Returns the first
 * number stated as "n = 120" or "120 patients". Anything less plain than that returns null:
 * a wrong sample size is worse than none, because it is the number people use to decide how
 * seriously to take a result.
 */
export function sampleSizeFrom(abstract: string | null): number | null {
  if (!abstract) return null;
  const explicit = /\b[nN]\s*=\s*(\d{1,3}(?:,\d{3})*|\d+)\b/.exec(abstract);
  const counted =
    /\b(\d{1,3}(?:,\d{3})+|\d{2,6})\s+(?:adult\s+|consecutive\s+|eligible\s+)?(patients|participants|subjects|people|individuals|adults|volunteers|children|women|men|cases)\b/i.exec(
      abstract,
    );
  const raw = explicit?.[1] ?? counted?.[1];
  if (!raw) return null;
  const value = Number(raw.replace(/,/g, ""));
  return Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * A sample size only means something for a study that recruited people. A review's "n = 14"
 * is usually the number of studies it found, and printing that as a sample would mislead.
 */
export function sampleSizeApplies(type: StudyType): boolean {
  return !["systematic_review", "narrative_review", "opinion", "animal_or_lab"].includes(type);
}
