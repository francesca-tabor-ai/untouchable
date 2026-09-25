import { z } from "zod";

import { askClaude, ClaudeUnavailableError } from "./claude";
import { cached } from "./http";
import { firstLanguageProblem } from "./language";
import { STUDY_TYPE_INFO } from "./study-type";
import { plainSummarySchema, STUDY_TYPES, type Paper, type PlainSummary, type StudyType } from "./types";

/**
 * Everything the Research Scout asks Claude to write.
 *
 * Four things, all under the carve-out in DECISIONS.md RS-01 and all held to the same three
 * rules: say only what the source says, label what kind of evidence it is, and never turn it
 * into advice. Every answer goes through `language.ts` before it is returned; one that fails
 * is withheld, not reworded, and the caller shows the source text instead.
 */

const HOUSE_RULES = `You write for UnTouchable, a UK health information platform. Your reader is not a
scientist. They may be unwell, frightened, and reading on a phone late at night.

Rules you must follow:
- Say only what the text you are given says. You have the abstract, not the full paper. Do not
  add facts, context or figures from anywhere else.
- Attribute findings to the authors ("the authors found", "in this study"). Never state a finding
  as a general truth.
- Never give advice. Never say what the reader should do, try, take, stop or ask for. Never write
  "you" about the reader's health.
- Never say a treatment works, is effective, or is the best. Say what was measured and what
  changed, in this study, in these people.
- Never include a dose, an amount, a frequency or a regimen for any drug, supplement or therapy,
  even if the abstract gives one. Say "a drug" or name it without the amount.
- Never use: proves, proven, cure, breakthrough, definitive, conclusive.
- If the study is small, early, in animals, or in cells, say so plainly.
- British English. Short sentences. No jargon without a plain explanation beside it.`;

// ---------------------------------------------------------------------------------------------
// Plain-English summary of one paper
// ---------------------------------------------------------------------------------------------

const SUMMARY_JSON_SCHEMA = {
  type: "object",
  properties: {
    asked: { type: "string", description: "One sentence: the question the study set out to answer." },
    did: { type: "string", description: "One or two sentences: who or what was studied and how." },
    found: { type: "string", description: "One or two sentences: what the authors report finding, attributed to them." },
    why_it_matters: {
      type: "string",
      description: "One sentence: why this matters to the research on this question. Never to the reader personally.",
    },
    limits: {
      type: "string",
      description: "One sentence: the main limit on how much weight this can bear (size, design, animals, abstract only).",
    },
    study_type: { type: "string", enum: [...STUDY_TYPES] },
    sample_size: { type: ["integer", "null"], description: "Number of human participants if the abstract states it, else null." },
  },
  required: ["asked", "did", "found", "why_it_matters", "limits", "study_type", "sample_size"],
  additionalProperties: false,
} as const;

const summaryAnswer = z.object({
  asked: z.string().min(1),
  did: z.string().min(1),
  found: z.string().min(1),
  why_it_matters: z.string().min(1),
  limits: z.string().min(1),
  study_type: z.enum(STUDY_TYPES),
  sample_size: z.number().int().positive().nullable(),
});

export type SummaryOutcome =
  | {
      ok: true;
      summary: PlainSummary;
      /** Claude's study type, used only when the index and the record could not say. */
      study_type: StudyType | null;
      sample_size: number | null;
    }
  | { ok: false; reason: "not-configured" | "no-abstract" | "withheld" | "unavailable" };

function hash(text: string): string {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) | 0;
  return (value >>> 0).toString(36);
}

export async function summarisePaper(
  paper: Pick<Paper, "id" | "title" | "abstract" | "study_type" | "study_type_source" | "journal" | "published_date">,
): Promise<SummaryOutcome> {
  if (!paper.abstract) return { ok: false, reason: "no-abstract" };

  const prompt = `Summarise this study in plain English, from its abstract only.

Title: ${paper.title}
Journal: ${paper.journal ?? "not given"}
Published: ${paper.published_date ?? "not given"}
${paper.study_type_source === "index" ? `Indexed as: ${STUDY_TYPE_INFO[paper.study_type].label}` : ""}

Abstract:
${paper.abstract}`;

  try {
    const answer = await cached(
      `summary:${paper.id}:${hash(paper.abstract)}`,
      () => askClaude({ system: HOUSE_RULES, prompt, schema: SUMMARY_JSON_SCHEMA, parser: summaryAnswer, maxTokens: 8_000 }),
      7 * 24 * 60 * 60 * 1000,
    );

    const summary: PlainSummary = plainSummarySchema.parse({
      asked: answer.asked,
      did: answer.did,
      found: answer.found,
      why_it_matters: answer.why_it_matters,
      limits: answer.limits,
      based_on: "abstract",
    });

    if (firstLanguageProblem(summary)) return { ok: false, reason: "withheld" };
    return { ok: true, summary, study_type: answer.study_type, sample_size: answer.sample_size };
  } catch (error) {
    if (error instanceof ClaudeUnavailableError && error.reason === "not-configured") return { ok: false, reason: "not-configured" };
    return { ok: false, reason: "unavailable" };
  }
}

// ---------------------------------------------------------------------------------------------
// Where the papers on one question disagree
// ---------------------------------------------------------------------------------------------

const DISAGREEMENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    disagreements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string", description: "What the papers disagree about, in a short phrase." },
          one_side: {
            type: "object",
            properties: {
              paper_ids: { type: "array", items: { type: "string" } },
              finding: { type: "string", description: "What these papers report, attributed to them." },
            },
            required: ["paper_ids", "finding"],
            additionalProperties: false,
          },
          other_side: {
            type: "object",
            properties: {
              paper_ids: { type: "array", items: { type: "string" } },
              finding: { type: "string", description: "What these papers report, attributed to them." },
            },
            required: ["paper_ids", "finding"],
            additionalProperties: false,
          },
        },
        required: ["topic", "one_side", "other_side"],
        additionalProperties: false,
      },
    },
  },
  required: ["disagreements"],
  additionalProperties: false,
} as const;

const side = z.object({ paper_ids: z.array(z.string()).min(1), finding: z.string().min(1) });
const disagreementAnswer = z.object({
  disagreements: z.array(z.object({ topic: z.string().min(1), one_side: side, other_side: side })),
});

export type Disagreement = z.infer<typeof disagreementAnswer>["disagreements"][number];

export type DisagreementOutcome =
  | { ok: true; disagreements: Disagreement[] }
  | { ok: false; reason: "not-configured" | "too-few" | "withheld" | "unavailable" };

/**
 * Where the abstracts in a set of results point in different directions. Both sides are
 * shown, each with the papers that say it. Nothing picks a winner: which one is right is
 * exactly what the reader should take to a clinician or a researcher, and the study type on
 * each card is there to help them weigh it, not us.
 */
export async function findDisagreements(
  papers: Pick<Paper, "id" | "title" | "abstract" | "study_type">[],
): Promise<DisagreementOutcome> {
  const usable = papers.filter((paper) => paper.abstract).slice(0, 15);
  if (usable.length < 2) return { ok: false, reason: "too-few" };

  const prompt = `Below are abstracts of studies on one question. Identify only places where they
report findings that genuinely point in different directions on the same point. If they do not
disagree, return an empty list. Do not invent disagreements. Do not say which side is right.
Refer to papers only by the ids given.

${usable
  .map((paper) => `[id: ${paper.id}] (${STUDY_TYPE_INFO[paper.study_type].label}) ${paper.title}\n${paper.abstract}`)
  .join("\n\n---\n\n")}`;

  try {
    const answer = await askClaude({ system: HOUSE_RULES, prompt, schema: DISAGREEMENT_JSON_SCHEMA, parser: disagreementAnswer });
    const known = new Set(usable.map((paper) => paper.id));
    // A disagreement citing a paper that was not in the set is invented, so it goes.
    const disagreements = answer.disagreements.filter((entry) =>
      [...entry.one_side.paper_ids, ...entry.other_side.paper_ids].every((id) => known.has(id)),
    );
    if (firstLanguageProblem(disagreements)) return { ok: false, reason: "withheld" };
    return { ok: true, disagreements };
  } catch (error) {
    if (error instanceof ClaudeUnavailableError && error.reason === "not-configured") return { ok: false, reason: "not-configured" };
    return { ok: false, reason: "unavailable" };
  }
}

// ---------------------------------------------------------------------------------------------
// A better search query
// ---------------------------------------------------------------------------------------------

const QUERY_JSON_SCHEMA = {
  type: "object",
  properties: {
    pubmed: { type: "string", description: "A PubMed query using MeSH terms ([MeSH Terms]) and title/abstract words ([tiab])." },
    europepmc: { type: "string", description: "The same search as plain boolean keywords, no field tags." },
    explanation: { type: "string", description: "One or two plain sentences on what the search covers." },
  },
  required: ["pubmed", "europepmc", "explanation"],
  additionalProperties: false,
} as const;

const queryAnswer = z.object({
  pubmed: z.string().min(1).max(2000),
  europepmc: z.string().min(1).max(2000),
  explanation: z.string().min(1),
});

export type QuerySuggestion =
  | { ok: true; pubmed: string; europepmc: string; explanation: string }
  | { ok: false; reason: "not-configured" | "withheld" | "unavailable" };

/**
 * A suggested search for a question. Only the question is sent — not the account, not the
 * person's conditions. The suggestion lands in the same editable box as the rule-built one;
 * it is a draft for the person to check, not a search run behind their back.
 */
export async function suggestQuery(question: string): Promise<QuerySuggestion> {
  const prompt = `Write literature searches for this question from a member of the public. Cover the
likely search territory (related mechanisms and conditions), but keep it focused enough to return
relevant papers. Do not include date or study-type filters; those are added separately.

Question: ${question}`;
  try {
    const answer = await askClaude({ system: HOUSE_RULES, prompt, schema: QUERY_JSON_SCHEMA, parser: queryAnswer, maxTokens: 4_000 });
    if (firstLanguageProblem(answer.explanation)) return { ok: false, reason: "withheld" };
    return { ok: true, ...answer };
  } catch (error) {
    if (error instanceof ClaudeUnavailableError && error.reason === "not-configured") return { ok: false, reason: "not-configured" };
    return { ok: false, reason: "unavailable" };
  }
}

// ---------------------------------------------------------------------------------------------
// A trial's eligibility in plain English
// ---------------------------------------------------------------------------------------------

const ELIGIBILITY_JSON_SCHEMA = {
  type: "object",
  properties: {
    plain: {
      type: "string",
      description: "The eligibility criteria rewritten in plain English as short sentences. Keep every criterion. Add nothing.",
    },
  },
  required: ["plain"],
  additionalProperties: false,
} as const;

export type EligibilityOutcome = { ok: true; plain: string } | { ok: false; reason: "not-configured" | "withheld" | "unavailable" };

/**
 * A trial's eligibility criteria reworded. The registry's own text stays on the screen beside
 * it, always: the reworded version is to help somebody read the original, not to replace it,
 * and it never says whether they would qualify. Only the trial's text is sent.
 */
export async function plainEligibility(criteria: string): Promise<EligibilityOutcome> {
  const prompt = `Rewrite these clinical trial eligibility criteria in plain English. Keep every
criterion, in order, split into "Who can take part" and "Who cannot take part". Do not judge
whether anyone would qualify. Do not add anything. Write in the third person ("People aged 18
or over"), never "you".

${criteria}`;
  try {
    const answer = await cached(
      `eligibility:${hash(criteria)}`,
      () => askClaude({ system: HOUSE_RULES, prompt, schema: ELIGIBILITY_JSON_SCHEMA, parser: z.object({ plain: z.string().min(1) }), maxTokens: 8_000 }),
      7 * 24 * 60 * 60 * 1000,
    );
    // Criteria legitimately name doses ("taking more than 20 mg a day"), so the dose check
    // would withhold most trials. Advice and overstatement still apply.
    const problem = firstLanguageProblem(answer.plain.replace(/\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|units?)\b/gi, "an amount"));
    if (problem) return { ok: false, reason: "withheld" };
    return { ok: true, plain: answer.plain };
  } catch (error) {
    if (error instanceof ClaudeUnavailableError && error.reason === "not-configured") return { ok: false, reason: "not-configured" };
    return { ok: false, reason: "unavailable" };
  }
}
