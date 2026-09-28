import { affiliationWithoutEmail, bareOrcid, emailsIn, institutionFrom, orcidUrl } from "./contact";
import { contactEmail, getJson, getText, throttleNcbi } from "./http";
import { classify, sampleSizeApplies, sampleSizeFrom } from "./study-type";
import type { Author, Paper, PaperAuthor } from "./types";
import { children, child, parseXml, path, text, type XmlElement } from "./xml";

/**
 * PubMed, through NCBI's E-utilities.
 *
 * Two calls: `esearch` for the ids that match, `efetch` for the full records. `esummary` is
 * not used — `efetch` returns everything it would and the abstract and affiliations besides,
 * so it would be a third request for nothing.
 *
 * Every request carries `tool` and, when the operator has set one, `email` (NCBI's terms ask
 * for both) and goes through the NCBI throttle in `http.ts`.
 */

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

function params(extra: Record<string, string>): string {
  const query = new URLSearchParams({ ...extra, tool: "untouchable-research-scout" });
  const email = contactEmail();
  if (email) query.set("email", email);
  if (process.env.NCBI_API_KEY) query.set("api_key", process.env.NCBI_API_KEY);
  return query.toString();
}

interface EsearchResponse {
  esearchresult?: { idlist?: string[]; count?: string; ERROR?: string };
}

export async function searchPubmed(
  term: string,
  options: { fromYear: number; sort: "relevance" | "newest"; limit?: number },
): Promise<{ ids: string[]; total: number }> {
  const url = `${EUTILS}/esearch.fcgi?${params({
    db: "pubmed",
    term,
    retmode: "json",
    retmax: String(options.limit ?? 20),
    sort: options.sort === "newest" ? "pub_date" : "relevance",
    datetype: "pdat",
    mindate: String(options.fromYear),
    maxdate: "3000",
  })}`;
  const response = await throttleNcbi(() => getJson<EsearchResponse>("PubMed", url));
  const result = response.esearchresult;
  return { ids: result?.idlist ?? [], total: Number(result?.count ?? 0) };
}

export async function fetchPubmedRecords(ids: string[]): Promise<Paper[]> {
  if (ids.length === 0) return [];
  const url = `${EUTILS}/efetch.fcgi?${params({ db: "pubmed", id: ids.join(","), retmode: "xml" })}`;
  const xml = await throttleNcbi(() => getText("PubMed", url));
  return parsePubmedXml(xml);
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

function dateFrom(element: XmlElement | undefined): string | null {
  if (!element) return null;
  const year = text(child(element, "Year"));
  if (!year) {
    const medline = /\b(\d{4})\b/.exec(text(child(element, "MedlineDate")));
    return medline ? medline[1] : null;
  }
  const rawMonth = text(child(element, "Month"));
  const month = /^\d+$/.test(rawMonth) ? rawMonth.padStart(2, "0") : MONTHS[rawMonth.slice(0, 3).toLowerCase()];
  const day = text(child(element, "Day"));
  if (!month) return year;
  return day ? `${year}-${month}-${day.padStart(2, "0")}` : `${year}-${month}`;
}

function abstractFrom(article: XmlElement | undefined): string | null {
  const sections = children(child(article, "Abstract"), "AbstractText");
  if (sections.length === 0) return null;
  const parts = sections.map((section) => {
    const label = section.attributes.Label;
    const body = text(section);
    return label && sections.length > 1 ? `${label[0]}${label.slice(1).toLowerCase()}: ${body}` : body;
  });
  const joined = parts.filter(Boolean).join("\n\n");
  return joined || null;
}

function authorsFrom(article: XmlElement | undefined, paperId: string) {
  const authors: Author[] = [];
  const paperAuthors: PaperAuthor[] = [];

  children(child(article, "AuthorList"), "Author").forEach((element, index) => {
    const collective = text(child(element, "CollectiveName"));
    const name = collective || [text(child(element, "ForeName")), text(child(element, "LastName"))].filter(Boolean).join(" ");
    if (!name) return;

    const affiliations = children(element, "AffiliationInfo").map((info) => text(child(info, "Affiliation")));
    const email = affiliations.flatMap(emailsIn)[0] ?? null;
    const orcidElement = children(element, "Identifier").find((identifier) => identifier.attributes.Source === "ORCID");
    const orcid = bareOrcid(orcidElement ? text(orcidElement) : null);
    const affiliation = affiliations.find(Boolean) ?? null;

    const id = orcid ? `orcid:${orcid}` : `${paperId}:author:${index + 1}`;
    authors.push({
      id,
      name,
      orcid,
      institution: affiliation ? institutionFrom(affiliationWithoutEmail(affiliation)) : null,
      public_email: email,
      profile_url: orcidUrl(orcid),
    });
    paperAuthors.push({
      paper_id: paperId,
      author_id: id,
      position: index + 1,
      // PubMed does not flag the corresponding author. The one whose address is printed is
      // the one the journal named as the contact, which is what "corresponding" means.
      is_corresponding: email !== null,
    });
  });

  return { authors, paperAuthors };
}

/** Parse an efetch response. Exported for tests, which feed it fictional records. */
export function parsePubmedXml(xml: string): Paper[] {
  const root = parseXml(xml);
  const set = child(root, "PubmedArticleSet");
  return children(set, "PubmedArticle").map((record) => {
    const citation = child(record, "MedlineCitation");
    const article = child(citation, "Article");
    const pmid = text(child(citation, "PMID"));

    // Only the ids that belong to this article. The reference list further down carries the
    // ids of every paper it cites, and taking the first DOI in the record would take theirs.
    const ownIds = children(path(record, "PubmedData", "ArticleIdList"), "ArticleId");
    const idOf = (type: string) => {
      const found = ownIds.find((id) => id.attributes.IdType === type);
      return found ? text(found) : null;
    };
    const doi = idOf("doi")?.toLowerCase() ?? null;
    const pmcid = idOf("pmc");

    const title = text(child(article, "ArticleTitle")).replace(/\.$/, "") || "Untitled record";
    const abstract = abstractFrom(article);
    const publicationTypes = children(child(article, "PublicationTypeList"), "PublicationType").map(text);
    const mesh = children(child(citation, "MeshHeadingList"), "MeshHeading").map((heading) => text(child(heading, "DescriptorName")));
    const keywords = children(child(citation, "KeywordList"), "Keyword").map(text);

    const electronic = children(article, "ArticleDate").find((date) => date.attributes.DateType === "Electronic");
    const published = dateFrom(electronic) ?? dateFrom(path(article, "Journal", "JournalIssue", "PubDate"));

    const id = doi ? `doi:${doi}` : `pmid:${pmid}`;
    const { authors, paperAuthors } = authorsFrom(article, id);
    const classification = classify({ publicationTypes, mesh, title, abstract });

    return {
      id,
      doi,
      pmid: pmid || null,
      pmcid,
      title,
      journal: text(path(article, "Journal", "Title")) || null,
      published_date: published,
      // PubMed alone cannot say. A PMC copy means free full text; Europe PMC fills in the rest.
      open_access: pmcid !== null,
      url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : `https://doi.org/${doi}`,
      abstract,
      plain_summary: null,
      ...classification,
      sample_size: sampleSizeApplies(classification.study_type) ? sampleSizeFrom(abstract) : null,
      topics: [...new Set([...mesh.filter((heading) => !/^(humans|animals|male|female|adult|middle aged|aged)$/i.test(heading)), ...keywords])].slice(0, 12),
      authors,
      paper_authors: paperAuthors,
      sources: ["pubmed"],
      cited_by: null,
      saved: false,
      notes: "",
    } satisfies Paper;
  });
}
