import type { Paper } from "@/lib/scout/types";

/**
 * Fictional records for the Research Scout's tests.
 *
 * AGENTS.md rule 1: no real people. Every researcher here is invented, every address is on
 * example.org (reserved for exactly this), and every DOI uses the 10.5555 test prefix.
 */

export const PUBMED_XML = `<?xml version="1.0" ?>
<!DOCTYPE PubmedArticleSet PUBLIC "-//NLM//DTD PubMedArticle, 1st January 2025//EN" "https://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd">
<PubmedArticleSet>
<PubmedArticle>
  <MedlineCitation Status="MEDLINE" Owner="NLM">
    <PMID Version="1">90000001</PMID>
    <Article PubModel="Print-Electronic">
      <Journal>
        <JournalIssue CitedMedium="Internet"><PubDate><Year>2025</Year><Month>Mar</Month></PubDate></JournalIssue>
        <Title>Journal of Imaginary Otology</Title>
      </Journal>
      <ArticleTitle>Jaw clenching and somatic tinnitus: a randomised trial of splint therapy in <i>adults</i>.</ArticleTitle>
      <Abstract>
        <AbstractText Label="BACKGROUND" NlmCategory="BACKGROUND">Somatic tinnitus can change with jaw movement.</AbstractText>
        <AbstractText Label="METHODS" NlmCategory="METHODS">We randomly assigned 120 participants (n = 120) to a splint or to usual care &amp; followed them for six months.</AbstractText>
        <AbstractText Label="RESULTS" NlmCategory="RESULTS">Loudness ratings fell in both groups; the difference was &#x3c; 5 points.</AbstractText>
      </Abstract>
      <AuthorList CompleteYN="Y">
        <Author ValidYN="Y">
          <LastName>Carraway</LastName><ForeName>Imogen</ForeName><Initials>I</Initials>
          <Identifier Source="ORCID">0000-0001-2345-6789</Identifier>
          <AffiliationInfo><Affiliation>Department of Hearing Science, University of Nowhere, London, UK. Electronic address: i.carraway@example.org.</Affiliation></AffiliationInfo>
        </Author>
        <Author ValidYN="Y">
          <LastName>Wren</LastName><ForeName>Tobias</ForeName><Initials>T</Initials>
          <AffiliationInfo><Affiliation>Dental Institute, Imaginary College, Bristol, UK.</Affiliation></AffiliationInfo>
        </Author>
      </AuthorList>
      <PublicationTypeList>
        <PublicationType UI="D016428">Journal Article</PublicationType>
        <PublicationType UI="D016449">Randomized Controlled Trial</PublicationType>
      </PublicationTypeList>
      <ArticleDate DateType="Electronic"><Year>2025</Year><Month>02</Month><Day>14</Day></ArticleDate>
    </Article>
    <MeshHeadingList>
      <MeshHeading><DescriptorName UI="D006801">Humans</DescriptorName></MeshHeading>
      <MeshHeading><DescriptorName UI="D014012">Tinnitus</DescriptorName></MeshHeading>
      <MeshHeading><DescriptorName UI="D002012">Bruxism</DescriptorName></MeshHeading>
    </MeshHeadingList>
  </MedlineCitation>
  <PubmedData>
    <ArticleIdList>
      <ArticleId IdType="pubmed">90000001</ArticleId>
      <ArticleId IdType="doi">10.5555/IMAGINARY.2025.001</ArticleId>
    </ArticleIdList>
    <ReferenceList>
      <Reference><Citation>An earlier paper.</Citation>
        <ArticleIdList><ArticleId IdType="doi">10.5555/someone-else.1999</ArticleId><ArticleId IdType="pmc">PMC0000001</ArticleId></ArticleIdList>
      </Reference>
    </ReferenceList>
  </PubmedData>
</PubmedArticle>
<PubmedArticle>
  <MedlineCitation Status="MEDLINE" Owner="NLM">
    <PMID Version="1">90000002</PMID>
    <Article PubModel="Print">
      <Journal><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue><Title>Imaginary Neuroscience Letters</Title></Journal>
      <ArticleTitle>Trigeminal input to the cochlear nucleus in guinea pigs</ArticleTitle>
      <Abstract><AbstractText>Recordings from twelve animals showed responses to jaw stimulation.</AbstractText></Abstract>
      <AuthorList><Author ValidYN="Y"><LastName>Okonkwo-Hale</LastName><ForeName>Priya</ForeName></Author></AuthorList>
      <PublicationTypeList><PublicationType UI="D016428">Journal Article</PublicationType></PublicationTypeList>
    </Article>
    <MeshHeadingList>
      <MeshHeading><DescriptorName UI="D000818">Animals</DescriptorName></MeshHeading>
      <MeshHeading><DescriptorName UI="D014012">Tinnitus</DescriptorName></MeshHeading>
    </MeshHeadingList>
  </MedlineCitation>
  <PubmedData><ArticleIdList><ArticleId IdType="pubmed">90000002</ArticleId></ArticleIdList></PubmedData>
</PubmedArticle>
</PubmedArticleSet>`;

export function paper(overrides: Partial<Paper> = {}): Paper {
  const id = overrides.id ?? "doi:10.5555/imaginary.2025.001";
  return {
    id,
    doi: "10.5555/imaginary.2025.001",
    pmid: "90000001",
    pmcid: null,
    title: "Jaw clenching and somatic tinnitus",
    journal: "Journal of Imaginary Otology",
    published_date: "2025-02-14",
    open_access: false,
    url: "https://pubmed.ncbi.nlm.nih.gov/90000001/",
    abstract: "We randomly assigned 120 participants to a splint or to usual care.",
    plain_summary: null,
    study_type: "randomised_trial",
    study_type_source: "index",
    strength_level: 2,
    sample_size: 120,
    topics: ["Tinnitus"],
    authors: [
      {
        id: "orcid:0000-0001-2345-6789",
        name: "Imogen Carraway",
        orcid: "0000-0001-2345-6789",
        institution: "University of Nowhere",
        public_email: null,
        profile_url: "https://orcid.org/0000-0001-2345-6789",
      },
    ],
    paper_authors: [{ paper_id: id, author_id: "orcid:0000-0001-2345-6789", position: 1, is_corresponding: false }],
    sources: ["pubmed"],
    cited_by: null,
    saved: false,
    notes: "",
    ...overrides,
  };
}

/** A Messages API response carrying `payload` as its structured JSON answer. */
export function claudeResponse(payload: unknown, stopReason = "end_turn") {
  return new Response(
    JSON.stringify({ stop_reason: stopReason, content: [{ type: "text", text: JSON.stringify(payload) }] }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}
