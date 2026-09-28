// @vitest-environment node
import { describe, expect, it } from "vitest";

import { fromEuropeRecord } from "@/lib/scout/europepmc";
import { mergeResults, sortPapers } from "@/lib/scout/merge";
import { parsePubmedXml } from "@/lib/scout/pubmed";
import { anchoredQueries, buildQueries, conceptsIn, relatedTo, withFilters } from "@/lib/scout/query";
import { classify, sampleSizeFrom, studyTypeFromIndex } from "@/lib/scout/study-type";
import { DEFAULT_FILTERS } from "@/lib/scout/types";
import { parseXml, text, child } from "@/lib/scout/xml";

import { paper, PUBMED_XML } from "./scout-fixtures";

/**
 * The Research Scout's search, end to end without the network: question to query, PubMed's
 * XML to paper records, two sources to one list.
 */

describe("turning a question into a search", () => {
  const question = "What is the link between tinnitus and the teeth, jaw and nerves?";

  it("anchors on the first thing named and searches the rest as any-of", () => {
    const { pubmed, europepmc } = buildQueries(question);
    expect(pubmed.startsWith(`("Tinnitus"[MeSH Terms]`)).toBe(true);
    expect(pubmed).toContain(`AND ((`);
    expect(pubmed).toContain(`"Temporomandibular Joint Disorders"[MeSH Terms]`);
    expect(pubmed).toContain(`"Trigeminal Nerve"[MeSH Terms]`);
    expect(europepmc).not.toContain("[MeSH");
    expect(europepmc).toContain("temporomandibular");
  });

  it("offers related territory rather than adding it silently", () => {
    const related = relatedTo(conceptsIn(question)).map((concept) => concept.key);
    expect(related).toEqual(expect.arrayContaining(["bruxism", "malocclusion", "dental-infection"]));
    expect(buildQueries(question).pubmed).not.toContain("Bruxism");
    expect(buildQueries(question, ["bruxism"]).pubmed).toContain(`"Bruxism"[MeSH Terms]`);
  });

  it("falls back to the person's own words when nothing is recognised", () => {
    const { pubmed } = buildQueries("Does lichen planus affect the gums?");
    expect(pubmed).toBe("lichen[tiab] AND planus[tiab] AND affect[tiab] AND gums[tiab]");
  });

  it("adds filters to what is sent, not to the editable query", () => {
    const sent = withFilters(buildQueries(question), { ...DEFAULT_FILTERS, openAccessOnly: true, humansOnly: true, studyType: "randomised_trial" }, new Date("2026-09-25"));
    expect(sent.fromYear).toBe(2022);
    expect(sent.pubmed).toContain(`"free full text"[sb]`);
    expect(sent.pubmed).toContain(`"humans"[MeSH Terms]`);
    expect(sent.pubmed).toContain(`"randomized controlled trial"[pt]`);
    expect(sent.europepmc).toMatch(/^TITLE_ABS:\(/);
    expect(sent.europepmc).toContain("FIRST_PDATE:[2022-01-01");
    expect(sent.europepmc).toContain("OPEN_ACCESS:y");
  });

  it("keeps a condition it does not know as the anchor of a hand-off search", () => {
    const { pubmed } = anchoredQueries("Eagle syndrome", ["tinnitus", "jaw pain"]);
    expect(pubmed.startsWith(`"Eagle syndrome"[tiab] AND (`)).toBe(true);
    expect(pubmed).toContain(`"Tinnitus"[MeSH Terms]`);
  });
});

describe("reading PubMed's XML", () => {
  const [trial, animal] = parsePubmedXml(PUBMED_XML);

  it("reads the record's own identifiers, never one from its reference list", () => {
    expect(trial.doi).toBe("10.5555/imaginary.2025.001");
    expect(trial.pmid).toBe("90000001");
    expect(trial.pmcid).toBeNull();
    expect(trial.id).toBe("doi:10.5555/imaginary.2025.001");
    expect(animal.id).toBe("pmid:90000002");
  });

  it("flattens markup, decodes entities and keeps the abstract's sections", () => {
    expect(trial.title).toBe("Jaw clenching and somatic tinnitus: a randomised trial of splint therapy in adults");
    expect(trial.abstract).toContain("Methods: We randomly assigned");
    expect(trial.abstract).toContain("usual care & followed");
    expect(trial.abstract).toContain("< 5 points");
    expect(trial.published_date).toBe("2025-02-14");
    expect(trial.journal).toBe("Journal of Imaginary Otology");
  });

  it("takes the study type from the indexers' tags, and the population from MeSH", () => {
    expect(trial.study_type).toBe("randomised_trial");
    expect(trial.study_type_source).toBe("index");
    expect(trial.strength_level).toBe(2);
    expect(trial.sample_size).toBe(120);
    expect(animal.study_type).toBe("animal_or_lab");
    expect(animal.sample_size).toBeNull();
  });

  it("keeps a printed email, and marks that author as the contact", () => {
    const [carraway, wren] = trial.authors;
    expect(carraway.public_email).toBe("i.carraway@example.org");
    expect(carraway.institution).toBe("Department of Hearing Science, University of Nowhere, London, UK");
    expect(carraway.orcid).toBe("0000-0001-2345-6789");
    expect(wren.public_email).toBeNull();
    expect(trial.paper_authors.map((link) => link.is_corresponding)).toEqual([true, false]);
  });
});

describe("the XML reader", () => {
  it("survives a stray close tag and CDATA", () => {
    const root = parseXml("<a><b>one</c> two<![CDATA[<three> & four]]></b></a>");
    expect(text(child(child(root, "a"), "b"))).toBe("one two<three> & four");
  });
});

describe("one paper, once", () => {
  it("merges by DOI and by PMID, and takes the best of each source", () => {
    const fromPubmed = paper({ sources: ["pubmed"], open_access: false, cited_by: null });
    const fromEurope = paper({
      id: "doi:10.5555/imaginary.2025.001",
      sources: ["europepmc"],
      open_access: true,
      cited_by: 7,
      study_type: "observational",
      study_type_source: "record",
      authors: [{ ...paper().authors[0], public_email: "i.carraway@example.org" }],
    });
    const other = paper({ id: "pmid:90000009", doi: null, pmid: "90000009", title: "Another" });
    const pmidTwin = paper({ id: "pmid:90000009", doi: null, pmid: "90000009", sources: ["europepmc"], cited_by: 2 });

    const merged = mergeResults([[fromPubmed, other], [fromEurope, pmidTwin]]);
    expect(merged).toHaveLength(2);
    const [first, second] = merged;
    expect(first.sources).toEqual(["pubmed", "europepmc"]);
    expect(first.open_access).toBe(true);
    expect(first.cited_by).toBe(7);
    expect(first.study_type).toBe("randomised_trial");
    expect(first.authors[0].public_email).toBe("i.carraway@example.org");
    expect(first.paper_authors[0].is_corresponding).toBe(true);
    expect(second.cited_by).toBe(2);
  });

  it("orders by date when asked for newest", () => {
    const older = paper({ id: "a", doi: "a", pmid: "1", published_date: "2023" });
    const newer = paper({ id: "b", doi: "b", pmid: "2", published_date: "2026-05-01" });
    expect(sortPapers([older, newer], "newest").map((item) => item.id)).toEqual(["b", "a"]);
    expect(sortPapers([older, newer], "relevance").map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("reads a Europe PMC record, including its open access flag", () => {
    const record = fromEuropeRecord({
      pmid: "90000003",
      doi: "10.5555/IMAGINARY.2026.7",
      title: "A <i>case report</i> of jaw-evoked tinnitus.",
      abstractText: "<h4>Case</h4>A 44-year-old woman reported tinnitus on clenching.",
      isOpenAccess: "Y",
      citedByCount: 3,
      firstPublicationDate: "2026-01-09",
      pubTypeList: { pubType: ["Case Reports", "Journal Article"] },
      authorList: { author: [{ firstName: "Marguerite", lastName: "Dunstable", authorId: { type: "ORCID", value: "0000-0002-0000-000X" } }] },
    });
    expect(record.id).toBe("doi:10.5555/imaginary.2026.7");
    expect(record.title).toBe("A case report of jaw-evoked tinnitus");
    expect(record.open_access).toBe(true);
    expect(record.study_type).toBe("case_report");
    expect(record.authors[0].orcid).toBe("0000-0002-0000-000X");
    expect(record.authors[0].public_email).toBeNull();
  });
});

describe("what kind of study, and how many people", () => {
  it("prefers the most specific index tag", () => {
    expect(studyTypeFromIndex(["Review", "Systematic Review"])).toBe("systematic_review");
    expect(studyTypeFromIndex(["Journal Article", "Review"])).toBe("narrative_review");
    expect(studyTypeFromIndex(["Letter"])).toBe("opinion");
    expect(studyTypeFromIndex(["Journal Article"], ["Animals", "Humans"])).toBeNull();
  });

  it("falls back to the record's words, and admits when it cannot tell", () => {
    expect(classify({ publicationTypes: ["Journal Article"], title: "A cross-sectional study of jaw pain", abstract: null }).study_type).toBe("observational");
    expect(classify({ publicationTypes: ["Journal Article"], title: "Tinnitus", abstract: "Thoughts on the field." })).toEqual({
      study_type: "unclassified",
      study_type_source: "none",
      strength_level: null,
    });
  });

  it("only reads a sample size that is stated plainly", () => {
    expect(sampleSizeFrom("In total, n = 1,204 took part.")).toBe(1204);
    expect(sampleSizeFrom("We recruited 86 adults with tinnitus.")).toBe(86);
    expect(sampleSizeFrom("Many people have tinnitus.")).toBeNull();
    expect(sampleSizeFrom(null)).toBeNull();
  });
});
