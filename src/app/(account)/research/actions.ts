"use server";

import { z } from "zod";

import { requireAdult } from "@/lib/auth/guards";
import { draftEmail } from "@/lib/scout/email-draft";
import { draftInputSchema, templateDraft } from "@/lib/scout/email-template";
import { takeClaudeRequest } from "@/lib/scout/limits";
import { researcherProfile } from "@/lib/scout/openalex";
import { paperById, searchPapers } from "@/lib/scout/search";
import { findDisagreements, plainEligibility, suggestQuery, summarisePaper } from "@/lib/scout/summarise";
import { searchTrials, trialCriteria } from "@/lib/scout/trials";
import { searchFiltersSchema, searchQueriesSchema } from "@/lib/scout/types";

/**
 * The Research Scout's server actions.
 *
 * Each one: the guard, then Zod, then one call into `src/lib/scout/`. Nothing here decides
 * anything. Only async functions are exported — AGENTS.md section 9 — so the shapes these
 * return are the domain modules' own types.
 *
 * Nothing sent here is stored. Questions, notes and the email form pass through and are gone;
 * the only thing held is the cache of public search results in `http.ts`.
 *
 * Anything that goes to Claude is looked up by id on the server first, never taken from the
 * browser, and counted against the person's hourly allowance in `limits.ts`.
 */

const LIMITED = { ok: false as const, reason: "limited" as const };

export async function runSearch(input: unknown) {
  await requireAdult("/research");
  const { queries, filters } = z.object({ queries: searchQueriesSchema, filters: searchFiltersSchema }).parse(input);
  return searchPapers(queries, filters);
}

export async function summarise(paperId: unknown) {
  const user = await requireAdult("/research");
  const id = z.string().max(300).parse(paperId);
  if (!takeClaudeRequest(user.id)) return LIMITED;

  const paper = await paperById(id).catch(() => null);
  if (!paper) return { ok: false as const, reason: "unavailable" as const };
  return summarisePaper(paper);
}

export async function disagreements(paperIds: unknown) {
  const user = await requireAdult("/research");
  const ids = z.array(z.string().max(300)).min(2).max(15).parse(paperIds);
  if (!takeClaudeRequest(user.id)) return LIMITED;

  const papers = (await Promise.all(ids.map((id) => paperById(id).catch(() => null)))).filter(
    (paper): paper is NonNullable<typeof paper> => paper !== null,
  );
  return findDisagreements(papers);
}

export async function suggestSearch(question: unknown) {
  const user = await requireAdult("/research");
  const text = z.string().trim().min(3).max(500).parse(question);
  if (!takeClaudeRequest(user.id)) return LIMITED;
  return suggestQuery(text);
}

export async function researcher(input: unknown) {
  await requireAdult("/research");
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(200),
      orcid: z.string().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/).nullable(),
      paperDoi: z.string().max(300).nullable(),
      topicTerms: z.array(z.string().max(80)).max(6),
    })
    .parse(input);
  return researcherProfile(parsed);
}

export async function draft(input: unknown) {
  const user = await requireAdult("/research");
  const parsed = draftInputSchema.parse(input);
  // Over the allowance, the template still works: it never needed Claude.
  if (!takeClaudeRequest(user.id)) return templateDraft(parsed);
  return draftEmail(parsed);
}

export async function trials(input: unknown) {
  await requireAdult("/research");
  const parsed = z
    .object({
      condition: z.string().trim().min(2).max(120),
      terms: z.string().trim().max(200).optional(),
      place: z.enum(["london", "uk", "anywhere"]),
    })
    .parse(input);
  try {
    return { ok: true as const, trials: await searchTrials(parsed) };
  } catch {
    return { ok: false as const, trials: [] };
  }
}

export async function eligibility(nctId: unknown) {
  const user = await requireAdult("/research");
  const id = z.string().regex(/^NCT\d{8}$/).parse(nctId);
  if (!takeClaudeRequest(user.id)) return LIMITED;

  const criteria = await trialCriteria(id).catch(() => null);
  if (!criteria) return { ok: false as const, reason: "unavailable" as const };
  return plainEligibility(criteria);
}
