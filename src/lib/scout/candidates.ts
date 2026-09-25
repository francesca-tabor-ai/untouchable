import { z } from "zod";

import { anchoredQueries, buildQueries } from "./query";
import { searchPapers, type SearchOutcome } from "./search";
import { DEFAULT_FILTERS, type Paper } from "./types";

/**
 * Research for the possibilities somebody is currently weighing up.
 *
 * This is the door the symptom timeline (`/timeline`) — or any other tool that narrows
 * symptoms towards possible explanations — calls when a symptom is logged or the list of
 * possibilities changes. It takes symptoms and candidate conditions and returns papers.
 *
 * What it does not do matters as much. It does not rank the candidates, weight a condition
 * by how likely it is, or say which the papers support. It runs one search per candidate,
 * paired with the symptoms, and returns what each search found, ranked by search relevance
 * and nothing else. The timeline's own rule (DECISIONS.md PL-49) is that no candidate is ever
 * invented or scored by the platform; this keeps to it by only ever searching for the
 * candidates it was handed.
 *
 * Only the words go out — to PubMed and Europe PMC, as search terms. Never who they belong to.
 */

export const candidateRequestSchema = z.object({
  symptoms: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
  candidate_conditions: z.array(z.string().trim().min(1).max(120)).min(1).max(8),
  question: z.string().trim().max(500).optional(),
});

export type CandidateRequest = z.infer<typeof candidateRequestSchema>;

export interface CandidateResearch {
  /** Per candidate, in the order they were given — not reordered by us. */
  by_condition: { condition: string; query: string; papers: Paper[] }[];
  /** Every paper once, for callers that want a flat list. */
  papers: Paper[];
  unavailable: string[];
}

const PER_CONDITION = 8;

/**
 * The search for one candidate: the condition as the anchor, narrowed by any of the symptoms
 * (at most three, or the search narrows to nothing). A caller's own question, when given,
 * replaces the symptoms as the narrowing.
 */
export function queriesFor(condition: string, symptoms: string[], question?: string) {
  if (question) return buildQueries(`${condition} ${question}`);
  return anchoredQueries(condition, symptoms.slice(0, 3));
}

export async function researchForCandidates(
  request: CandidateRequest,
  search: typeof searchPapers = searchPapers,
): Promise<CandidateResearch> {
  const outcomes: { condition: string; query: string; outcome: SearchOutcome }[] = [];

  // One after another rather than all at once: NCBI's rate limit is shared by the whole server.
  for (const condition of request.candidate_conditions) {
    const queries = queriesFor(condition, request.symptoms, request.question);
    const outcome = await search(queries, DEFAULT_FILTERS);
    outcomes.push({ condition, query: queries.pubmed, outcome });
  }

  const byCondition = outcomes.map(({ condition, query, outcome }) => ({
    condition,
    query,
    papers: outcome.papers.slice(0, PER_CONDITION),
  }));

  const seen = new Set<string>();
  const papers: Paper[] = [];
  // Interleaved, so the first candidate named does not crowd out the others in a flat list.
  for (let index = 0; index < PER_CONDITION; index += 1) {
    for (const entry of byCondition) {
      const paper = entry.papers[index];
      if (paper && !seen.has(paper.id)) {
        seen.add(paper.id);
        papers.push({ ...paper, topics: [...new Set([entry.condition, ...paper.topics])] });
      }
    }
  }

  return {
    by_condition: byCondition,
    papers,
    unavailable: [...new Set(outcomes.flatMap(({ outcome }) => outcome.unavailable))],
  };
}
