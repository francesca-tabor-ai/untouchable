import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  BODY_SYSTEMS,
  CONDITION_SYSTEMS,
  countBySystem,
  countStoriesBySystem,
  filterBySystem,
  filterStoriesBySystem,
  parseSystem,
  systemsFor,
} from "@/lib/conditions/body-systems";
import { interpretationProblem } from "@/lib/tracking/no-interpretation";

const KEYS = BODY_SYSTEMS.map((system) => system.key);

describe("the eleven systems", () => {
  it("are eleven, each named in one word", () => {
    expect(BODY_SYSTEMS).toHaveLength(11);
    for (const system of BODY_SYSTEMS) expect(system.label).toMatch(/^[A-Z][a-z]+$/);
  });

  it("have no repeated key or label", () => {
    expect(new Set(KEYS).size).toBe(11);
    expect(new Set(BODY_SYSTEMS.map((system) => system.label)).size).toBe(11);
  });

  it("describe what the system is without saying anything about anybody's health", () => {
    for (const system of BODY_SYSTEMS) expect(interpretationProblem(system.about)).toBeNull();
  });
});

describe("the mapping", () => {
  it("only ever names a real system, and never the same one twice", () => {
    for (const [slug, systems] of Object.entries(CONDITION_SYSTEMS)) {
      for (const system of systems) expect(KEYS, slug).toContain(system);
      expect(new Set(systems).size, slug).toBe(systems.length);
    }
  });

  it.each([
    "depression",
    "postnatal-depression",
    "ptsd",
    "adhd",
    "bulimia",
    "binge-eating-disorder",
    "alcohol-use-disorder",
    "drug-addiction",
    "sexual-abuse",
    "bereavement-by-suicide",
  ])("keeps %s out of every system, on purpose", (slug) => {
    // Filing these under "Nervous" would be a clinical claim. Changing that is a decision
    // for DECISIONS.md, not a line to add here — PL-58.
    expect(slug in CONDITION_SYSTEMS).toBe(true);
    expect(systemsFor(slug)).toEqual([]);
  });

  it("treats a condition nobody has mapped yet as in no system", () => {
    expect(systemsFor("a-condition-added-tomorrow")).toEqual([]);
  });
});

describe("reading the filter from the URL", () => {
  it("accepts a system", () => {
    expect(parseSystem("nervous")).toBe("nervous");
  });

  it("takes the first when a system is given twice", () => {
    expect(parseSystem(["skin", "immune"])).toBe("skin");
  });

  it.each([undefined, "", "Nervous", "brain", "../admin", "nervous "])(
    "treats %j as no filter rather than an error",
    (value) => {
      expect(parseSystem(value)).toBeNull();
    },
  );
});

describe("filtering", () => {
  const conditions = [
    { slug: "brain-aneurysm" },
    { slug: "svt" },
    { slug: "depression" },
    { slug: "a-condition-added-tomorrow" },
  ];

  it("shows everything when no system is chosen", () => {
    expect(filterBySystem(conditions, null)).toEqual(conditions);
  });

  it("shows only the conditions in the chosen system", () => {
    expect(filterBySystem(conditions, "circulatory").map((row) => row.slug)).toEqual([
      "brain-aneurysm",
      "svt",
    ]);
  });

  it("lets a condition that belongs to two systems appear under both", () => {
    expect(filterBySystem(conditions, "nervous").map((row) => row.slug)).toEqual([
      "brain-aneurysm",
    ]);
  });

  it("never shows an unassigned or unmapped condition under a system", () => {
    for (const key of KEYS) {
      const slugs = filterBySystem(conditions, key).map((row) => row.slug);
      expect(slugs).not.toContain("depression");
      expect(slugs).not.toContain("a-condition-added-tomorrow");
    }
  });

  it("counts what each filter would show, including the empty ones", () => {
    const counts = countBySystem(conditions);
    expect(counts.circulatory).toBe(2);
    expect(counts.nervous).toBe(1);
    expect(counts.digestive).toBe(0);
    expect(Object.keys(counts)).toHaveLength(11);
  });
});

describe("the conditions page", () => {
  const page = readFileSync("src/app/(public)/conditions/page.tsx", "utf8");

  it("filters with links in the query string, so it works without JavaScript", () => {
    expect(page).toContain("/conditions?system=");
    expect(page).not.toContain('"use client"');
  });

  it("uses the shared filter, which marks the choice for a screen reader, not only by colour", () => {
    const filter = readFileSync("src/components/conditions/body-system-filter.tsx", "utf8");
    expect(page).toContain("<BodySystemFilter");
    expect(filter).toContain("aria-current");
    expect(filter).toContain("font-semibold");
  });

  it("is still one list for everybody when no filter is chosen", () => {
    expect(page).toContain("filterBySystem(everything, system)");
  });
});

describe("stories, for the front page", () => {
  const story = (name: string, ...slugs: string[]) => ({
    name,
    conditions: slugs.map((slug) => ({ slug })),
  });
  const people = [
    story("a", "breast-cancer", "depression"),
    story("b", "svt", "pots"),
    story("c", "depression"),
    story("d"),
  ];

  it("puts a story under a system when any of its conditions is in it", () => {
    expect(filterStoriesBySystem(people, "reproductive").map((row) => row.name)).toEqual(["a"]);
  });

  it("never puts a story under a system on the strength of a condition that is in none", () => {
    for (const key of KEYS) {
      expect(filterStoriesBySystem(people, key).map((row) => row.name)).not.toContain("c");
    }
  });

  it("counts a person once per system, even with two conditions in it", () => {
    // svt and PoTS are both circulatory; that is one person, not two.
    expect(countStoriesBySystem(people).circulatory).toBe(1);
  });

  it("shows everybody when no system is chosen", () => {
    expect(filterStoriesBySystem(people, null)).toHaveLength(4);
  });
});
