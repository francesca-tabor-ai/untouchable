import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { orderForStrip, parseShown, photographOf, stripHref } from "@/components/home/figure-strip";

/**
 * The row of people on the home page is a public surface like any other, which means a
 * retracted story has to vanish from it immediately.
 *
 * It gets that for free by reading through `listPublishedStories`, the query that filters to
 * published. The risk is a future change hand-rolling its own query here and forgetting the
 * filter — which would put a retracted person back on the front page, the single worst place
 * for one to reappear. This test makes that mistake fail the build.
 */
const source = readFileSync("src/components/home/figure-strip.tsx", "utf8");

describe("the home page figure strip", () => {
  it("reads through the published-stories query", () => {
    expect(source).toContain("listPublishedStories");
  });

  it("never queries the database directly", () => {
    expect(source).not.toContain("@/lib/db");
    expect(source).not.toMatch(/\bdb\.story\b/);
    expect(source).not.toContain("PrismaClient");
  });

  it("shows only people, not community stories", () => {
    // A community story has no public figure, and this row is about recognising a name.
    expect(source).toContain("story.figure !== null");
  });

  it("does not carry a content note onto the front page", () => {
    // PL-53. The note comes off the card; it stays on the story page, above the story,
    // where `ContentNote` renders it before anything can be read.
    expect(source).not.toContain("needsContentNote");
  });

  it("only ever renders a photograph when a licence is recorded with it", () => {
    // This used to assert that no image rendered at all, because we held a licence for
    // nothing. That is no longer true: five figures now carry Creative Commons photographs
    // from Wikimedia Commons. The durable rule is not "no pictures", it is "no picture
    // without a licence" — the image and the attribution come from the same record and the
    // component refuses to render one without the other.
    expect(source).toContain("parseAttribution");
    expect(source).toMatch(/imageUrl && parseAttribution/);
  });

  it("credits the photographers", () => {
    // CC BY and CC BY-SA require attribution. Showing the picture without naming the
    // photographer is the one thing the licence forbids.
    expect(source).toContain("PhotoCredits");
  });
});

/**
 * The grid used to be a sample of six. It is now everybody with a published story, a page
 * at a time, and the thing that asks for the next page is a link with an address in it.
 *
 * That choice is the point of these tests. A button that fetches would leave somebody with
 * JavaScript switched off — a slow phone, a blocked script, a bad connection on a train —
 * looking at a control that does nothing, on the one surface that is supposed to introduce
 * the platform. It would also make the page unshareable: nobody could send a friend the
 * view they were actually looking at.
 */
describe("asking for more people", () => {
  it("pages through everybody, rather than capping the grid", () => {
    // No slice to a fixed handful before the count is taken: the total on the page has to
    // be the real total, or "Showing 12 of 41" is a lie.
    expect(source).toContain("everyone.slice(0, shown)");
    expect(source).toContain("everyone.length");
  });

  it("asks for the next page with a link, so it works without JavaScript", () => {
    // The address is built by `stripHref`; what matters is that it is an address.
    expect(stripHref(null, 24)).toContain("?people=24");
    expect(source).toContain("<Link href={stripHref(system, figures.length + PAGE)}");
    // A link, not a client component holding state.
    expect(source).not.toContain('"use client"');
    expect(source).not.toContain("useState");
    expect(source).not.toContain("onClick");
  });

  it("returns the reader to the grid rather than the top of the page", () => {
    expect(source).toContain("#people");
    expect(source).toMatch(/id="people"/);
  });

  it("says how many people are shown, and announces it when the number changes", () => {
    expect(source).toContain("aria-live");
    expect(source).toMatch(/Showing \{figures\.length\} of \{everyone\.length\}/);
  });

  it("reads a bounded number of stories, whatever the URL asks for", () => {
    // `?people=999999999` is a URL anybody can type. It must not become the take.
    expect(source).toContain("MOST_WE_WILL_READ");
    expect(source).toMatch(/Math\.min\(parsed, MOST_WE_WILL_READ\)/);
  });
});

describe("parseShown", () => {
  it("starts at the first page for anything that is not a sensible number", () => {
    for (const value of [undefined, "", "banana", "-3", "0", "1.5", "NaN", "Infinity"]) {
      expect(parseShown(value)).toBe(12);
    }
  });

  it("takes the number when it is one", () => {
    expect(parseShown("24")).toBe(24);
    expect(parseShown("36")).toBe(36);
  });

  it("takes the first value when the parameter is repeated", () => {
    expect(parseShown(["24", "36"])).toBe(24);
  });

  it("never asks for more than the ceiling", () => {
    expect(parseShown("999999999")).toBe(300);
  });
});

describe("who comes first", () => {
  // Fictional people throughout — AGENTS.md rule 1.
  const LICENCE = JSON.stringify({ author: "A. Photographer", licence: "CC BY-SA 4.0" });
  const pictured = (name: string) => ({
    name,
    figure: { imageUrl: `/figures/${name}.jpg`, imageLicence: LICENCE },
  });
  const unpictured = (name: string) => ({ name, figure: { imageUrl: null, imageLicence: null } });

  it("puts people with a photograph ahead of people without one", () => {
    const ordered = orderForStrip([unpictured("a"), pictured("b"), unpictured("c"), pictured("d")]);
    expect(ordered.map((row) => row.name)).toEqual(["b", "d", "a", "c"]);
  });

  it("keeps the existing order inside each group, rather than ranking anybody", () => {
    const ordered = orderForStrip([pictured("z"), pictured("a"), unpictured("y"), unpictured("b")]);
    expect(ordered.map((row) => row.name)).toEqual(["z", "a", "y", "b"]);
  });

  it("does not move somebody up for a photograph the card would refuse to show", () => {
    // An image with no readable licence is no image at all, so it must not buy a place.
    const unlicensed = { name: "x", figure: { imageUrl: "/figures/x.jpg", imageLicence: null } };
    const garbled = { name: "y", figure: { imageUrl: "/figures/y.jpg", imageLicence: "not json" } };

    expect(photographOf(unlicensed.figure)).toBeNull();
    expect(photographOf(garbled.figure)).toBeNull();
    expect(orderForStrip([unlicensed, pictured("p"), garbled]).map((row) => row.name)).toEqual([
      "p",
      "x",
      "y",
    ]);
  });

  it("orders before it pages, so the first page is the photographed people", () => {
    const source = readFileSync("src/components/home/figure-strip.tsx", "utf8");
    expect(source.indexOf("orderForStrip(")).toBeLessThan(source.indexOf("everyone.slice(0, shown)"));
  });
});

describe("the body-system filter on the front page", () => {
  const source = readFileSync("src/components/home/figure-strip.tsx", "utf8");

  it("builds every address in one place, returning the reader to the grid", () => {
    expect(stripHref(null)).toBe("/#people");
    expect(stripHref("nervous")).toBe("/?system=nervous#people");
  });

  it("keeps the chosen system when somebody asks for more people", () => {
    expect(stripHref("nervous", 24)).toBe("/?system=nervous&people=24#people");
    expect(source).toContain("stripHref(system, figures.length + PAGE)");
  });

  it("leaves the unfiltered View more address as it was", () => {
    expect(stripHref(null, 24)).toBe("/?people=24#people");
  });

  it("applies the smallest-grid rule before filtering, so a filter can never hide itself", () => {
    // After filtering, a system with two people in it would remove the whole section,
    // filter row included, leaving no way back to everybody.
    const guard = source.indexOf("allPeople.length < FEWEST_CARDS");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(source.indexOf("filterStoriesBySystem(allPeople, system)"));
    expect(source).not.toContain("everyone.length < FEWEST_CARDS");
  });

  it("says so, with a way back, when a system has nobody in it", () => {
    expect(source).toContain("figure-strip-empty");
    expect(source).toContain("See everybody");
  });

  it("reads the system from the URL on the home page, never erroring on a bad one", () => {
    const home = readFileSync("src/app/(public)/page.tsx", "utf8");
    expect(home).toContain("parseSystem(params.system)");
    expect(home).toContain("system={system}");
  });
});
