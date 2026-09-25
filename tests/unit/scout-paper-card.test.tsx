import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/(account)/research/actions", () => ({
  summarise: vi.fn(),
  researcher: vi.fn(async () => null),
  draft: vi.fn(),
}));

import { PaperCard } from "@/components/scout/paper-card";
import { SUMMARY_CAVEAT, SUMMARY_LABEL } from "@/lib/scout/copy";
import { EMPTY_STORE } from "@/lib/scout/storage";

import { paper } from "./scout-fixtures";

/**
 * The paper card, rendered. What kind of evidence comes before what it found; the contact for
 * the paper is marked in words, not colour; a small or early study says so on the card.
 */

const withContact = paper({
  authors: [
    { ...paper().authors[0], public_email: "i.carraway@example.org" },
    { id: "a2", name: "Tobias Wren", orcid: null, institution: null, public_email: null, profile_url: null },
  ],
  paper_authors: [
    { paper_id: "doi:10.5555/imaginary.2025.001", author_id: "orcid:0000-0001-2345-6789", position: 1, is_corresponding: true },
    { paper_id: "doi:10.5555/imaginary.2025.001", author_id: "a2", position: 2, is_corresponding: false },
  ],
});

describe("a paper card", () => {
  it("names the kind of study and its weight before anything else", () => {
    render(<PaperCard paper={withContact} store={EMPTY_STORE} claudeOn={false} topicTerms={[]} />);
    expect(screen.getByText(/Randomised trial/)).toBeInTheDocument();
    expect(screen.getByText(/evidence level 2 of 6/)).toBeInTheDocument();
    expect(screen.getByText(/Number of people studied: 120/)).toBeInTheDocument();
  });

  it("marks the contact author in words and offers a draft only to a printed address", () => {
    render(<PaperCard paper={withContact} store={EMPTY_STORE} claudeOn={false} topicTerms={[]} />);
    expect(screen.getByText("Contact for this paper")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Draft an email to Imogen Carraway" })).toBeInTheDocument();
  });

  it("offers no email draft when no address is printed", () => {
    render(<PaperCard paper={paper()} store={EMPTY_STORE} claudeOn={false} topicTerms={[]} />);
    expect(screen.queryByRole("button", { name: /Draft an email/ })).not.toBeInTheDocument();
  });

  it("labels a small, single-patient or animal study on the card", () => {
    const { rerender } = render(<PaperCard paper={paper({ sample_size: 14 })} store={EMPTY_STORE} claudeOn={false} topicTerms={[]} />);
    expect(screen.getByText("A small study")).toBeInTheDocument();
    rerender(<PaperCard paper={paper({ study_type: "animal_or_lab", sample_size: null })} store={EMPTY_STORE} claudeOn={false} topicTerms={[]} />);
    expect(screen.getByText("Not a study in people")).toBeInTheDocument();
  });

  it("says a summary is Claude's, from the abstract, and keeps the authors' abstract beside it", () => {
    const summarised = paper({
      plain_summary: {
        asked: "Whether a splint changes loudness.",
        did: "Two groups, chosen at random.",
        found: "Ratings fell in both groups.",
        why_it_matters: "Few trials have asked this.",
        limits: "Six months only.",
        based_on: "abstract",
      },
    });
    render(<PaperCard paper={summarised} store={EMPTY_STORE} claudeOn topicTerms={[]} />);
    expect(screen.getAllByText(SUMMARY_LABEL).length).toBeGreaterThan(0);
    expect(screen.getByText(SUMMARY_CAVEAT)).toBeInTheDocument();
    expect(screen.getByText(/The authors’ abstract, in their words/)).toBeInTheDocument();
  });

  it("says plainly when summaries are off, instead of showing a dead button", () => {
    render(<PaperCard paper={paper()} store={EMPTY_STORE} claudeOn={false} topicTerms={[]} />);
    expect(screen.queryByRole("button", { name: "Explain in plain English" })).not.toBeInTheDocument();
    expect(screen.getByText(/Plain-English summaries are not switched on here/)).toBeInTheDocument();
  });
});
