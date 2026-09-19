import { render, screen, within } from "@testing-library/react";
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
    expect(
      screen.getByLabelText(/search conditions, medicines, charities and stories/i),
    ).toBeInTheDocument();
  });

  it("submits with a real button rather than a click handler", () => {
    render(<SiteSearch />);
    expect(screen.getByRole("button", { name: "Search" }).getAttribute("type")).toBe("submit");
  });

  it("keeps the chosen filter through a submit, without a script", () => {
    const { container } = render(<SiteSearch query="tinnitus" kind="charities" />);
    const hidden = container.querySelector('input[type="hidden"][name="kind"]');
    expect(hidden?.getAttribute("value")).toBe("charities");
  });

  it("keeps what the person typed in the box after a search", () => {
    render(<SiteSearch query="tinnitus" />);
    expect(screen.getByRole("searchbox")).toHaveValue("tinnitus");
  });
});

describe("the filter chips", () => {
  it("are links, so they work without a script too", () => {
    render(<SiteSearch query="tinnitus" kind="all" />);
    const chips = within(screen.getByRole("navigation", { name: /narrow the search/i }));

    expect(chips.getAllByRole("link")).toHaveLength(5);
  });

  it("offer everything, conditions, medicines, charities and stories", () => {
    render(<SiteSearch />);
    const nav = within(screen.getByRole("navigation", { name: /narrow the search/i }));

    for (const label of ["Everything", "Conditions", "Medicines", "Charities", "Stories"]) {
      expect(nav.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("carry the query with them, so narrowing does not lose the search", () => {
    render(<SiteSearch query="tinnitus" kind="all" />);
    const nav = within(screen.getByRole("navigation", { name: /narrow the search/i }));

    expect(nav.getByRole("link", { name: "Charities" }).getAttribute("href")).toBe(
      "/?q=tinnitus&kind=charities",
    );
    // "Everything" is the absence of a filter, not a filter of its own.
    expect(nav.getByRole("link", { name: "Everything" }).getAttribute("href")).toBe("/?q=tinnitus");
  });

  it("marks the current one for a screen reader, not only with a colour", () => {
    render(<SiteSearch query="tinnitus" kind="medicines" />);
    const nav = within(screen.getByRole("navigation", { name: /narrow the search/i }));

    expect(nav.getByRole("link", { name: "Medicines" })).toHaveAttribute("aria-current", "true");
    expect(nav.getByRole("link", { name: "Everything" })).not.toHaveAttribute("aria-current");
  });
});

describe("reading what arrives in the query string", () => {
  it("takes a query and a kind", () => {
    expect(parseSearchParams({ q: " tinnitus ", kind: "charities" })).toEqual({
      q: "tinnitus",
      kind: "charities",
    });
  });

  it("falls back to everything when the kind is not one of ours", () => {
    expect(parseSearchParams({ q: "x", kind: "wibble" }).kind).toBe("all");
    expect(parseSearchParams({ q: "x", kind: "../../etc/passwd" }).kind).toBe("all");
  });

  it("ignores repeated parameters rather than throwing", () => {
    expect(parseSearchParams({ q: ["a", "b"], kind: ["stories"] })).toEqual({
      q: undefined,
      kind: "all",
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
      <SearchResults outcome={{ query: "zzzz", kind: "all", total: 0, groups: [] }} />,
    );
    expect(screen.getByRole("heading", { name: /nothing matches/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "conditions" })).toBeInTheDocument();
  });

  it("does not rank results or call any of them popular", () => {
    render(<SearchResults outcome={outcome} />);
    expect(screen.queryByText(/most popular|top |best |recommended|trending/i)).toBeNull();
  });
});
