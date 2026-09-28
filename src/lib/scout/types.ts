import { z } from "zod";

/**
 * The Research Scout's shared data contract.
 *
 * These shapes are the ones `docs/vibe-code-prompts/03-research-scout.md` defines so that the
 * Course Generator and the Habit Lab can take papers from here without translation. Field
 * names are kept in the prompt's snake_case for that reason, even though the rest of this
 * codebase is camelCase: a contract that is renamed at the border is two contracts.
 *
 * Nothing here is stored on our servers. Papers, notes and watch topics live on the person's
 * device (DECISIONS.md RS-03), so every shape is also a Zod schema — what comes back out of
 * local storage is parsed, never trusted.
 */

export const STUDY_TYPES = [
  "systematic_review",
  "randomised_trial",
  "observational",
  "case_series",
  "case_report",
  "animal_or_lab",
  "narrative_review",
  "opinion",
  "unclassified",
] as const;

export type StudyType = (typeof STUDY_TYPES)[number];

export const authorSchema = z.object({
  id: z.string(),
  name: z.string(),
  orcid: z.string().nullable(),
  institution: z.string().nullable(),
  /**
   * Only ever an address printed in the paper's own record. Never guessed, never built from
   * a name and a domain. See `contact.ts`.
   */
  public_email: z.string().nullable(),
  profile_url: z.string().nullable(),
});

export type Author = z.infer<typeof authorSchema>;

export const paperAuthorSchema = z.object({
  paper_id: z.string(),
  author_id: z.string(),
  position: z.number().int(),
  is_corresponding: z.boolean(),
});

export type PaperAuthor = z.infer<typeof paperAuthorSchema>;

export const plainSummarySchema = z.object({
  asked: z.string(),
  did: z.string(),
  found: z.string(),
  why_it_matters: z.string(),
  limits: z.string(),
  /** Always "abstract" today. Kept as a field so a full-text summary cannot be mistaken for one. */
  based_on: z.literal("abstract"),
});

export type PlainSummary = z.infer<typeof plainSummarySchema>;

export const paperSchema = z.object({
  id: z.string(),
  doi: z.string().nullable(),
  pmid: z.string().nullable(),
  pmcid: z.string().nullable(),
  title: z.string(),
  journal: z.string().nullable(),
  /** ISO date, as precise as the record allows: "2026", "2026-08" or "2026-08-23". */
  published_date: z.string().nullable(),
  open_access: z.boolean(),
  url: z.string(),
  abstract: z.string().nullable(),
  plain_summary: plainSummarySchema.nullable(),
  study_type: z.enum(STUDY_TYPES),
  /** Where the study type came from: the index's own tags, the words of the record, or Claude. */
  study_type_source: z.enum(["index", "record", "claude", "none"]),
  strength_level: z.number().int().min(1).max(6).nullable(),
  sample_size: z.number().int().positive().nullable(),
  topics: z.array(z.string()),
  authors: z.array(authorSchema),
  paper_authors: z.array(paperAuthorSchema),
  sources: z.array(z.enum(["pubmed", "europepmc"])),
  cited_by: z.number().int().nullable(),
  saved: z.boolean(),
  notes: z.string(),
});

export type Paper = z.infer<typeof paperSchema>;

export const trialSchema = z.object({
  id: z.string(),
  registry: z.enum(["clinicaltrials.gov"]),
  registry_id: z.string(),
  title: z.string(),
  status: z.string(),
  locations: z.array(z.string()),
  /** The registry's own eligibility text, split into lists. Never rewritten into a verdict. */
  eligibility: z.object({
    inclusion: z.array(z.string()),
    exclusion: z.array(z.string()),
    other: z.array(z.string()),
    ages: z.string().nullable(),
    sex: z.string().nullable(),
    healthy_volunteers: z.boolean().nullable(),
  }),
  eligibility_plain: z.string().nullable(),
  contact_public: z.array(
    z.object({ name: z.string(), email: z.string().nullable(), phone: z.string().nullable() }),
  ),
  url: z.string(),
});

export type Trial = z.infer<typeof trialSchema>;

export const searchFiltersSchema = z.object({
  /** How many years back. The prompt's default is five. */
  years: z.number().int().min(1).max(50).default(5),
  studyType: z.enum(["any", "systematic_review", "randomised_trial", "observational", "case_report"]).default("any"),
  openAccessOnly: z.boolean().default(false),
  humansOnly: z.boolean().default(false),
  sort: z.enum(["relevance", "newest"]).default("relevance"),
});

export type SearchFilters = z.infer<typeof searchFiltersSchema>;

export const DEFAULT_FILTERS: SearchFilters = {
  years: 5,
  studyType: "any",
  openAccessOnly: false,
  humansOnly: false,
  sort: "relevance",
};

export const searchQueriesSchema = z.object({
  pubmed: z.string().trim().min(1).max(2000),
  europepmc: z.string().trim().min(1).max(2000),
});

export type SearchQueries = z.infer<typeof searchQueriesSchema>;

export const watchTopicSchema = z.object({
  id: z.string(),
  query: z.string(),
  queries: searchQueriesSchema,
  filters: searchFiltersSchema,
  /** ISO timestamp of the last run, or null if it has never run. */
  last_run: z.string().nullable(),
  new_count: z.number().int().min(0),
  /** Paper ids seen at the last visit, so the next run can say which are new. */
  seen_ids: z.array(z.string()),
  new_ids: z.array(z.string()),
});

export type WatchTopic = z.infer<typeof watchTopicSchema>;

/** A saved paper, with what the person has added to it. */
export const savedPaperSchema = z.object({
  paper: paperSchema,
  notes: z.string(),
  read: z.boolean(),
  tags: z.array(z.string()),
  saved_on: z.string(),
});

export type SavedPaper = z.infer<typeof savedPaperSchema>;
