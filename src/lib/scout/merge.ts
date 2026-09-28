import type { Author, Paper } from "./types";

/**
 * One paper, once, however many sources found it.
 *
 * Deduplicated by DOI and by PMID: two records are the same paper if they share either. A
 * paper with neither is kept as it is, since there is nothing trustworthy to match it on and
 * a false merge would hang one paper's authors on another's title.
 *
 * When two records merge, each field comes from whichever source is better for it. PubMed's
 * indexing wins for study type; Europe PMC's wins for open access and citation counts;
 * authors are merged so that a printed email or an ORCID found in either record is kept.
 */

function sameAuthor(a: Author, b: Author): boolean {
  if (a.orcid && b.orcid) return a.orcid === b.orcid;
  const key = (name: string) => name.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(Boolean);
  const [aParts, bParts] = [key(a.name), key(b.name)];
  return aParts.at(-1) === bParts.at(-1) && aParts[0]?.[0] === bParts[0]?.[0];
}

function mergeAuthors(primary: Paper, secondary: Paper): Pick<Paper, "authors" | "paper_authors"> {
  const authors = primary.authors.map((author) => {
    const match = secondary.authors.find((other) => sameAuthor(author, other));
    if (!match) return author;
    return {
      ...author,
      orcid: author.orcid ?? match.orcid,
      institution: author.institution ?? match.institution,
      public_email: author.public_email ?? match.public_email,
      profile_url: author.profile_url ?? match.profile_url,
    };
  });

  const paper_authors = primary.paper_authors.map((link, index) => ({
    ...link,
    paper_id: primary.id,
    author_id: authors[index]?.id ?? link.author_id,
    is_corresponding: link.is_corresponding || Boolean(authors[index]?.public_email),
  }));

  return { authors, paper_authors };
}

function mergePair(a: Paper, b: Paper): Paper {
  // PubMed first: its indexers' publication types are the better source for study type.
  const [primary, secondary] = a.sources.includes("pubmed") ? [a, b] : [b, a];
  const preferIndexed = primary.study_type_source === "index" || secondary.study_type_source !== "index";
  const classified = preferIndexed ? primary : secondary;

  return {
    ...primary,
    doi: primary.doi ?? secondary.doi,
    pmid: primary.pmid ?? secondary.pmid,
    pmcid: primary.pmcid ?? secondary.pmcid,
    id: primary.doi || secondary.doi ? `doi:${primary.doi ?? secondary.doi}` : primary.id,
    journal: primary.journal ?? secondary.journal,
    published_date: primary.published_date ?? secondary.published_date,
    open_access: primary.open_access || secondary.open_access,
    abstract: (primary.abstract?.length ?? 0) >= (secondary.abstract?.length ?? 0) ? primary.abstract : secondary.abstract,
    study_type: classified.study_type,
    study_type_source: classified.study_type_source,
    strength_level: classified.strength_level,
    sample_size: classified.sample_size ?? primary.sample_size ?? secondary.sample_size,
    topics: [...new Set([...primary.topics, ...secondary.topics])].slice(0, 12),
    ...(primary.authors.length > 0
      ? mergeAuthors(primary, secondary)
      : { authors: secondary.authors, paper_authors: secondary.paper_authors }),
    sources: [...new Set([...primary.sources, ...secondary.sources])],
    cited_by: secondary.cited_by ?? primary.cited_by,
  };
}

interface Ranked {
  paper: Paper;
  /** Best position this paper held in any source's own ranking, from 0. */
  bestRank: number;
  hits: number;
}

/**
 * Merge the ranked lists from each source into one. Relevance order: best position in any
 * source, and a paper both sources found comes before one only a single source found at the
 * same position. This is search relevance — how well a record matches the words — and says
 * nothing about whether the paper is right.
 */
export function mergeResults(lists: Paper[][]): Paper[] {
  const merged: Ranked[] = [];

  for (const list of lists) {
    list.forEach((paper, rank) => {
      const existing = merged.find(
        (entry) =>
          (paper.doi && entry.paper.doi === paper.doi) || (paper.pmid && entry.paper.pmid === paper.pmid),
      );
      if (existing) {
        existing.paper = mergePair(existing.paper, paper);
        existing.bestRank = Math.min(existing.bestRank, rank);
        existing.hits += 1;
      } else {
        merged.push({ paper, bestRank: rank, hits: 1 });
      }
    });
  }

  return merged
    .sort((a, b) => a.bestRank - b.bestRank || b.hits - a.hits)
    .map((entry) => fixAuthorLinks(entry.paper));
}

/** After merging, make sure every author link points at this paper's final id. */
function fixAuthorLinks(paper: Paper): Paper {
  return { ...paper, paper_authors: paper.paper_authors.map((link) => ({ ...link, paper_id: paper.id })) };
}

export function sortPapers(papers: Paper[], sort: "relevance" | "newest"): Paper[] {
  if (sort === "relevance") return papers;
  return [...papers].sort((a, b) => (b.published_date ?? "").localeCompare(a.published_date ?? ""));
}
