import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SearchResults } from "@/components/search/search-results";
import { SiteSearch } from "@/components/search/site-search";
import { parseSearchParams } from "@/lib/search/schema";
import type { SearchOutcome } from "@/lib/search";

/**
 * The search box has to work before the JavaScript arrives, and for somebody who has it
 * switched off entirely. That is not a nicety on this platform: the front page is where a
 * frightened person on a bad connection arrives, and a search box that needs a script to
 * submit is a search box that is sometimes just a dead input.
 *
 * So it is a plain GET form, and these tests assert the properties that make it one.
 */

describe("the search box works with no JavaScript", () => {
  it("is a GET form pointed at a real address", () => {
    const { container } = render(<SiteSearch />);
    const form = container.querySelector("form")!;

    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/");
    expect(form.getAttribute("role")).toBe("search");
  });

  it("submits the query under a name the server reads", () => {
    render(<SiteSearch />);
    expect(screen.getByRole("searchbox").getAttribute("name")).toBe("q");
  });

  it("has a real label, not a placeholder standing in for one", () => {
    render(<SiteSearch />);
    expect(screen.getByLabelText(/search conditions/i)).toBeInTheDocument();
  });

  it("submits with a real button rather than a click handler", () => {
    render(<SiteSearch />);
    expect(screen.getByRole("button", { name: "Search" }).getAttribute("type")).toBe("submit");
  });

  it("keeps what the person typed in the box after a search", () => {
    render(<SiteSearch query="tinnitus" />);
    expect(screen.getByRole("searchbox")).toHaveValue("tinnitus");
  });
});

describe("the search looks at conditions and nothing else", () => {
  it("says so, rather than offering a row of things to choose between", () => {
    render(<SiteSearch />);

    expect(screen.getByText("Conditions")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /narrow the search/i })).toBeNull();
  });

  it("offers no way to widen the search to medicines, charities or stories", () => {
    render(<SiteSearch query="tinnitus" />);

    for (const label of ["Everything", "Medicines", "Charities", "Stories"]) {
      expect(screen.queryByRole("link", { name: label })).toBeNull();
    }
  });

  it("sends nothing but the query, so a submit cannot widen it either", () => {
    const { container } = render(<SiteSearch query="tinnitus" />);
    const named = Array.from(container.querySelectorAll("form [name]")).map((node) =>
      node.getAttribute("name"),
    );

    expect(named).toEqual(["q"]);
  });
});

describe("reading what arrives in the query string", () => {
  it("takes the query, and trims it", () => {
    expect(parseSearchParams({ q: " tinnitus " })).toEqual({ q: "tinnitus" });
  });

  it("ignores a kind somebody has typed into the address bar", () => {
    // The home page fixes the kind itself. Nothing here reads one, so nothing here can be
    // widened by hand-editing the URL.
    expect(parseSearchParams({ q: "x", kind: "stories" })).toEqual({ q: "x" });
    expect(parseSearchParams({ q: "x", kind: "../../etc/passwd" })).toEqual({ q: "x" });
  });

  it("ignores repeated parameters rather than throwing", () => {
    expect(parseSearchParams({ q: ["a", "b"], kind: ["stories"] })).toEqual({
      q: undefined,
    });
  });

  it("caps a very long query rather than passing it through", () => {
    const parsed = parseSearchParams({ q: "x".repeat(5000) });
    expect(parsed.q!.length).toBeLessThanOrEqual(100);
  });
});

describe("results", () => {
  const outcome: SearchOutcome = {
    query: "invented",
    kind: "all",
    total: 2,
    groups: [
      {
        kind: "conditions",
        label: "Conditions",
        results: [
          {
            id: "c1",
            title: "An invented condition",
            description: "An invented summary.",
            href: "/conditions/invented",
            needsContentNote: true,
          },
        ],
      },
      {
        kind: "charities",
        label: "Charities",
        results: [
          {
            id: "h1",
            title: "An invented charity",
            description: "An invented description.",
            href: "/charities/invented",
          },
        ],
      },
    ],
  };

  it("labels each group, so the grouping is not carried by layout alone", () => {
    render(<SearchResults outcome={outcome} />);
    expect(screen.getByRole("heading", { name: "Conditions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Charities" })).toBeInTheDocument();
  });

  it("links every result to its own page", () => {
    render(<SearchResults outcome={outcome} />);
    expect(screen.getByRole("link", { name: /an invented charity/i }).getAttribute("href")).toBe(
      "/charities/invented",
    );
  });

  it("carries a content note onto a sensitive result", () => {
    render(<SearchResults outcome={outcome} />);
    expect(screen.getByText(/content note/i)).toBeInTheDocument();
  });

  it("says plainly when nothing matched, and offers somewhere to go", () => {
    render(
      <SearchResults outcome={{ query: "zzzz", kind: "conditions", total: 0, groups: [] }} />,
    );
    expect(screen.getByRole("heading", { name: /nothing matches/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "conditions" })).toBeInTheDocument();
  });

  it("does not rank results or call any of them popular", () => {
    render(<SearchResults outcome={outcome} />);
    expect(screen.queryByText(/most popular|top |best |recommended|trending/i)).toBeNull();
  });
});
