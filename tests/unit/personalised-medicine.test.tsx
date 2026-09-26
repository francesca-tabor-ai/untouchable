// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import PersonalisedMedicinePage from "@/app/(public)/personalised-medicine/page";
import WomensHealthPage from "@/app/(public)/personalised-medicine/womens-health/page";
import { doseLanguageProblems } from "@/lib/medicines/dose-language";
import { PERSONALISED_TOPICS } from "@/lib/personalised-medicine/topics";
import {
  WOMENS_HEALTH,
  WOMENS_HEALTH_SECTIONS,
  womensHealthSources,
} from "@/lib/personalised-medicine/womens-health";

/**
 * Personalised medicine, and Women's health under it.
 *
 * These pages talk about medicines and conditions without a story behind them, so the rules
 * that protect the medicine pages have to hold here on their own: every point has an
 * independent source (rule 14), nothing reads as a dose (rule 17), and nothing says a
 * treatment works or tells the reader what to do (rule 9).
 */

const INDEPENDENT = /^https:\/\/www\.(nhs\.uk|gov\.uk)\//;

const allText = [
  WOMENS_HEALTH.lead,
  WOMENS_HEALTH.summary,
  WOMENS_HEALTH.whoThisIsFor,
  ...WOMENS_HEALTH_SECTIONS.flatMap((section) => [
    section.heading,
    section.intro,
    ...section.points.flatMap((point) => [point.title, point.body]),
  ]),
];

describe("the women's health content", () => {
  it("covers cycles, what women are more likely to get, symptoms and treatment", () => {
    expect(WOMENS_HEALTH_SECTIONS.map((section) => section.id)).toEqual([
      "cycles-and-hormones",
      "more-likely",
      "symptoms",
      "treatment",
    ]);
  });

  it("gives every point at least one source, and only NHS or UK Government ones", () => {
    for (const section of WOMENS_HEALTH_SECTIONS) {
      for (const point of section.points) {
        expect(point.sources.length, point.title).toBeGreaterThan(0);
        for (const source of point.sources) expect(source.href).toMatch(INDEPENDENT);
      }
    }
  });

  it("contains no dose, no strength and no regimen", () => {
    for (const text of allText) expect(doseLanguageProblems(text), text).toEqual([]);
  });

  it("never says a treatment works, and never tells the reader what to take", () => {
    for (const text of allText) {
      for (const claim of [
        /\bworks?\b/i,
        /\bsafe(ly)?\b/i,
        /\bdangerous\b/i,
        /\brecommend/i,
        /\bcures?\b/i,
        /\bimprov/i,
        /\beffective\b/i,
        /\bbest\b/i,
        /\byou should\b/i,
        /\btry\b/i,
      ]) {
        expect(text).not.toMatch(claim);
      }
    }
  });

  it("gives no percentages or ratios that read as someone's own odds", () => {
    for (const text of allText) {
      expect(text).not.toMatch(/\d+\s?%|\bper cent\b|\b\d+ (in|out of) \d+\b|\btimes more\b/i);
    }
  });

  it("says who the page is about without shutting anyone out", () => {
    expect(WOMENS_HEALTH.whoThisIsFor).toMatch(/trans men and non-binary people/);
  });
});

describe("the personalised medicine hub", () => {
  it("links only to pages that exist, and the page says it is not advice", () => {
    render(<PersonalisedMedicinePage />);

    expect(screen.getByRole("heading", { level: 1, name: "Personalised medicine" })).toBeVisible();
    expect(screen.getByText("This is not medical advice")).toBeInTheDocument();
    for (const topic of PERSONALISED_TOPICS) {
      expect(screen.getByRole("link", { name: topic.title })).toHaveAttribute("href", topic.href);
    }
  });
});

describe("the women's health page", () => {
  it("has one h1, then an h2 per section in order", () => {
    render(<WomensHealthPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const h2s = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    const sectionHeadings = WOMENS_HEALTH_SECTIONS.map((section) => section.heading);
    expect(h2s.filter((text) => sectionHeadings.includes(text ?? ""))).toEqual(sectionHeadings);
  });

  it("lets someone jump to each section from the top", () => {
    render(<WomensHealthPage />);

    const contents = screen.getByRole("navigation", { name: "On this page" });
    for (const section of WOMENS_HEALTH_SECTIONS) {
      expect(within(contents).getByRole("link", { name: section.heading })).toHaveAttribute(
        "href",
        `#${section.id}`,
      );
      expect(document.getElementById(section.id)).not.toBeNull();
    }
  });

  it("shows where each point comes from, and lists every source at the end", () => {
    render(<WomensHealthPage />);

    const sources = within(
      screen.getByRole("heading", { name: "Where this comes from" }).closest("section")!,
    );
    for (const source of womensHealthSources()) {
      expect(sources.getByRole("link", { name: source.label })).toHaveAttribute(
        "href",
        source.href,
      );
    }
  });

  it("says it is not advice, and runs clean through the dose detector as rendered", () => {
    const { container } = render(<WomensHealthPage />);

    expect(screen.getByText("This is not medical advice")).toBeInTheDocument();
    expect(doseLanguageProblems(container.textContent ?? "")).toEqual([]);
  });

  it("carries no donation prompt", () => {
    const { container } = render(<WomensHealthPage />);
    expect(container.textContent).not.toMatch(/\bdonat/i);
  });
});
