// @vitest-environment jsdom
import { existsSync } from "node:fs";
import { join } from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EditorialPage from "@/app/(public)/about/editorial/page";
import AboutPage from "@/app/(public)/about/page";
import EvidencePage from "@/app/(public)/about/evidence/page";
import { SafetyFooter } from "@/components/layout/safety-footer";

/**
 * The About pages.
 *
 * They were linked from the footer and the home page's "Why we built this" button for weeks
 * before they existed — DECISIONS.md PL-56. The first test is the one that would have caught
 * that. The rest hold the few things these pages must never stop saying, and the one thing
 * they must never offer: a way to give money. Rule 5 keeps donation prompts in one module,
 * and a page that explains we will not pressure anyone is the last place to start one.
 */

const PAGES = [
  { path: "/about", Page: AboutPage, heading: "Why we exist" },
  { path: "/about/editorial", Page: EditorialPage, heading: "How we write stories" },
  { path: "/about/evidence", Page: EvidencePage, heading: "How the data is used" },
];

describe("the About pages", () => {
  it("exist for every About link in the footer", () => {
    render(<SafetyFooter />);
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) => href.startsWith("/about"));

    expect(hrefs).toEqual(["/about", "/about/editorial", "/about/evidence"]);
    for (const href of hrefs) {
      expect(existsSync(join(process.cwd(), "src/app/(public)", href.slice(1), "page.tsx"))).toBe(
        true,
      );
    }
  });

  it.each(PAGES)("$path has one top-level heading, named for the footer link", ({ Page, heading }) => {
    render(<Page />);
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(heading);
  });

  it.each(PAGES)("$path links only within the site, and never to a donation", ({ Page }) => {
    render(<Page />);
    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href") ?? "";
      expect(href.startsWith("/")).toBe(true);
      expect(href).not.toMatch(/donat/i);
    }
    expect(screen.queryByRole("button", { name: /donate/i })).toBeNull();
  });

  it("says the people in the stories have not endorsed us", () => {
    render(<AboutPage />);
    expect(screen.getByText(/have not endorsed it/)).toBeInTheDocument();
  });

  it("says plainly that there is no medical advice", () => {
    render(<AboutPage />);
    expect(screen.getByText("We will not give medical advice.")).toBeInTheDocument();
  });

  it("promises no children's health, and allows an adult's own childhood", () => {
    render(<EditorialPage />);
    expect(screen.getByText(/health of a living child/)).toBeInTheDocument();
    expect(screen.getByText(/their own childhood/)).toBeInTheDocument();
  });

  it("states the small-group threshold and the free-text rule", () => {
    render(<EvidencePage />);
    expect(screen.getByText("Never fewer than ten people.")).toBeInTheDocument();
    expect(screen.getByText("Never your own words.")).toBeInTheDocument();
  });
});
