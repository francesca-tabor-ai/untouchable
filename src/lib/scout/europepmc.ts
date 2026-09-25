import { affiliationWithoutEmail, bareOrcid, emailsIn, institutionFrom, orcidUrl } from "./contact";
import { contactEmail, getJson } from "./http";
import { classify, sampleSizeApplies, sampleSizeFrom } from "./study-type";
import type { Author, Paper, PaperAuthor } from "./types";

/**
 * Europe PMC's REST API.
 *
 * It indexes PubMed and more besides (preprints, some journals PubMed does not), says plainly
 * whether a paper is open access, and returns JSON with authors, ORCIDs and affiliations in
 * one call. `resultType=core` is the full record rather than the short one.
 */

const BASE = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

export interface EuropeRecord {
  id?: string;
  source?: string;
  pmid?: string;
  pmcid?: string;
  doi?: string;
  title?: string;
  abstractText?: string;
  journalInfo?: { journal?: { title?: string } };
  firstPublicationDate?: string;
  pubYear?: string;
  isOpenAccess?: "Y" | "N";
  citedByCount?: number;
  pubTypeList?: { pubType?: string[] };
  meshHeadingList?: { meshHeading?: { descriptorName?: string }[] };
  keywordList?: { keyword?: string[] };
  authorList?: {
    author?: {
      fullName?: string;
      firstName?: string;
      lastName?: string;
      collectiveName?: string;
      authorId?: { type?: string; value?: string };
      authorAffiliationDetailsList?: { authorAffiliation?: { affiliation?: string }[] };
    }[];
  };
}

interface EuropeResponse {
  hitCount?: number;
  resultList?: { result?: EuropeRecord[] };
}

export async function searchEuropePmc(
  query: string,
  options: { sort: "relevance" | "newest"; limit?: number },
): Promise<{ papers: Paper[]; total: number }> {
  const search = new URLSearchParams({
    query: options.sort === "newest" ? `${query} sort_date:y` : query,
    format: "json",
    resultType: "core",
    pageSize: String(options.limit ?? 20),
  });
  const email = contactEmail();
  if (email) search.set("email", email);

  const response = await getJson<EuropeResponse>("Europe PMC", `${BASE}?${search.toString()}`);
  const records = response.resultList?.result ?? [];
  return { papers: records.map(fromEuropeRecord), total: response.hitCount ?? records.length };
}

/** Strip the light HTML Europe PMC leaves in titles and abstracts. */
function plain(value: string | undefined): string {
  return (value ?? "")
    .replace(/<\/?(h4|p|br)\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function fromEuropeRecord(record: EuropeRecord): Paper {
  const doi = record.doi?.toLowerCase() ?? null;
  const pmid = record.pmid ?? null;
  const id = doi ? `doi:${doi}` : pmid ? `pmid:${pmid}` : `epmc:${record.source ?? "x"}:${record.id ?? "unknown"}`;

  const title = plain(record.title).replace(/\.$/, "") || "Untitled record";
  const abstract = plain(record.abstractText) || null;
  const publicationTypes = record.pubTypeList?.pubType ?? [];
  const mesh = (record.meshHeadingList?.meshHeading ?? []).map((heading) => heading.descriptorName ?? "").filter(Boolean);
  const classification = classify({ publicationTypes, mesh, title, abstract });

  const authors: Author[] = [];
  const paperAuthors: PaperAuthor[] = [];
  (record.authorList?.author ?? []).forEach((author, index) => {
    const name =
      author.collectiveName ??
      ([author.firstName, author.lastName].filter(Boolean).join(" ") || author.fullName || "");
    if (!name) return;
    const affiliations = (author.authorAffiliationDetailsList?.authorAffiliation ?? []).map((entry) => entry.affiliation ?? "");
    const email = affiliations.flatMap(emailsIn)[0] ?? null;
    const orcid = author.authorId?.type === "ORCID" ? bareOrcid(author.authorId.value) : null;
    const affiliation = affiliations.find(Boolean) ?? null;
    const authorId = orcid ? `orcid:${orcid}` : `${id}:author:${index + 1}`;

    authors.push({
      id: authorId,
      name,
      orcid,
      institution: affiliation ? institutionFrom(affiliationWithoutEmail(affiliation)) : null,
      public_email: email,
      profile_url: orcidUrl(orcid),
    });
    paperAuthors.push({ paper_id: id, author_id: authorId, position: index + 1, is_corresponding: email !== null });
  });

  return {
    id,
    doi,
    pmid,
    pmcid: record.pmcid ?? null,
    title,
    journal: record.journalInfo?.journal?.title ?? null,
    published_date: record.firstPublicationDate ?? record.pubYear ?? null,
    open_access: record.isOpenAccess === "Y",
    url: pmid
      ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`
      : doi
        ? `https://doi.org/${doi}`
        : `https://europepmc.org/article/${record.source ?? "MED"}/${record.id ?? ""}`,
    abstract,
    plain_summary: null,
    ...classification,
    sample_size: sampleSizeApplies(classification.study_type) ? sampleSizeFrom(abstract) : null,
    topics: [...new Set([...mesh.filter((heading) => !/^(humans|animals|male|female|adult|middle aged|aged)$/i.test(heading)), ...(record.keywordList?.keyword ?? [])])].slice(0, 12),
    authors,
    paper_authors: paperAuthors,
    sources: ["europepmc"],
    cited_by: typeof record.citedByCount === "number" ? record.citedByCount : null,
    saved: false,
    notes: "",
  };
}
