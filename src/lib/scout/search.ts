import { searchEuropePmc } from "./europepmc";
import { SourceUnavailableError } from "./http";
import { mergeResults, sortPapers } from "./merge";
import { fetchPubmedRecords, searchPubmed } from "./pubmed";
import { withFilters } from "./query";
import type { Paper, SearchFilters, SearchQueries } from "./types";

/**
 * The search itself: both sources at once, merged, filtered, sorted.
 *
 * A source that does not answer does not sink the search. The results from the one that did
 * are shown, and the page says by name which one was missing — somebody deciding what to read
 * next should know they are looking at half the picture.
 */

export interface SearchOutcome {
  papers: Paper[];
  /** Sources that did not answer, by name, for the page to say so. */
  unavailable: string[];
  totals: { pubmed: number | null; europepmc: number | null };
  sent: { pubmed: string; europepmc: string };
}

const PER_SOURCE = 20;

export async function searchPapers(queries: SearchQueries, filters: SearchFilters, now = new Date()): Promise<SearchOutcome> {
  const sent = withFilters(queries, filters, now);
  const unavailable: string[] = [];

  const [pubmed, europe] = await Promise.all([
    (async () => {
      const { ids, total } = await searchPubmed(sent.pubmed, { fromYear: sent.fromYear, sort: filters.sort, limit: PER_SOURCE });
      const papers = await fetchPubmedRecords(ids);
      // efetch returns records in its own order; put them back in search order.
      const order = new Map(ids.map((id, index) => [id, index]));
      papers.sort((a, b) => (order.get(a.pmid ?? "") ?? 0) - (order.get(b.pmid ?? "") ?? 0));
      return { papers, total };
    })().catch((error: unknown) => {
      unavailable.push(error instanceof SourceUnavailableError ? error.source : "PubMed");
      return null;
    }),
    searchEuropePmc(sent.europepmc, { sort: filters.sort, limit: PER_SOURCE }).catch((error: unknown) => {
      unavailable.push(error instanceof SourceUnavailableError ? error.source : "Europe PMC");
      return null;
    }),
  ]);

  let papers = mergeResults([pubmed?.papers ?? [], europe?.papers ?? []]);

  if (filters.openAccessOnly) papers = papers.filter((paper) => paper.open_access);
  if (filters.humansOnly) papers = papers.filter((paper) => paper.study_type !== "animal_or_lab");

  return {
    papers: sortPapers(papers, filters.sort),
    unavailable,
    totals: { pubmed: pubmed?.total ?? null, europepmc: europe?.total ?? null },
    sent: { pubmed: sent.pubmed, europepmc: sent.europepmc },
  };
}

/**
 * One paper by its id, fetched fresh from the source rather than taken from the browser.
 *
 * Anything that goes to Claude is looked up here first. If the page could send its own
 * abstract to be summarised, anybody signed in could send any text they liked to a model on
 * our account and have it come back looking like a paper's summary.
 */
export async function paperById(id: string): Promise<Paper | null> {
  const pmid = /^pmid:(\d+)$/.exec(id)?.[1];
  if (pmid) return (await fetchPubmedRecords([pmid]))[0] ?? null;

  const doi = /^doi:(10\.\S+)$/.exec(id)?.[1];
  if (doi) {
    const { papers } = await searchEuropePmc(`DOI:"${doi.replace(/"/g, "")}"`, { sort: "relevance", limit: 1 });
    const found = papers.find((paper) => paper.doi === doi) ?? null;
    if (found?.pmid) {
      // PubMed's record is the better one for authors and study type; merge the two.
      const pubmed = await fetchPubmedRecords([found.pmid]).catch(() => []);
      return mergeResults([pubmed, [found]])[0] ?? found;
    }
    if (found) return found;

    const { ids } = await searchPubmed(`"${doi.replace(/"/g, "")}"[doi]`, { fromYear: 1900, sort: "relevance", limit: 1 });
    return (await fetchPubmedRecords(ids))[0] ?? null;
  }
  return null;
}
