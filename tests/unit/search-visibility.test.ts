// @vitest-environment node
import { readFileSync } from "node:fs";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { Regulator } from "@/generated/prisma";
import { retractStory } from "@/lib/stories/editorial";
import { search } from "@/lib/search";
import { makeUser, resetDatabase, testDb } from "../helpers/db";
import { makeDraft, makeFixtures, publishViaWorkflow, type StoryFixtures } from "./stories-fixtures";

/**
 * One search box covers conditions, medicines, charities and stories — which makes it the
 * widest public surface on the platform, and therefore the easiest place to leak something
 * that is not supposed to be public at all.
 *
 * So the rule these tests hold down is the one from AGENTS.md rules 3, 4 and D-046:
 * **a retracted story, a draft, an unverified or withdrawn charity, and a medicine no editor
 * has written up must never appear in a result.** Search gets that by reading through the
 * same query modules every other public surface uses. These tests go in through `search()`,
 * the way the page does.
 *
 * Everything here is invented, as everywhere else in this repository.
 */

let counter = 0;
const unique = (prefix: string) => {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
};

/** A word that appears in every fixture below and nowhere in the seed. */
const NEEDLE = "zephyrine";

async function makeCharity(
  overrides: { verified?: boolean; active?: boolean; name?: string } = {},
) {
  const slug = unique("invented-charity");
  const verifier = overrides.verified === false ? null : await makeUser({ role: "editor" });

  return testDb.charity.create({
    data: {
      name: overrides.name ?? `Invented ${NEEDLE} Trust`,
      slug,
      registeredNumber: String(2_000_000 + ++counter),
      regulator: Regulator.CCEW,
      websiteUrl: `https://${slug}.example.test`,
      donationUrl: `https://${slug}.example.test/give`,
      description: `An invented charity used only in tests. It mentions ${NEEDLE}.`,
      active: overrides.active ?? true,
      verifiedAt: verifier ? new Date() : null,
      verifiedById: verifier?.id ?? null,
    },
    select: { id: true, name: true, slug: true },
  });
}

async function makeMedicine(overrides: { written?: boolean; name?: string } = {}) {
  const written = overrides.written ?? true;
  return testDb.intervention.create({
    data: {
      name: overrides.name ?? `Invented ${NEEDLE}ine`,
      slug: unique("invented-medicine"),
      type: "rx",
      // The marker that separates an editor's write-up from somebody's private medicine
      // cabinet. No summary means no public page. D-046.
      summary: written
        ? `An invented medicine used only in tests. It mentions ${NEEDLE}.`
        : null,
    },
    select: { id: true, name: true, slug: true },
  });
}

function titles(outcome: Awaited<ReturnType<typeof search>>, kind: string): string[] {
  return outcome.groups.find((group) => group.kind === kind)?.results.map((r) => r.title) ?? [];
}

describe("search finds each kind of thing", () => {
  let fixtures: StoryFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeFixtures();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("finds a condition, a medicine, a charity and a story from one box", async () => {
    await testDb.condition.create({
      data: {
        name: `Invented ${NEEDLE} syndrome`,
        slug: unique("invented-condition"),
        summary: "An invented condition used only in tests.",
      },
    });
    await makeMedicine();
    await makeCharity();
    const story = await makeDraft(fixtures, { title: `An invented story about ${NEEDLE}` });
    await publishViaWorkflow(fixtures, story.id);

    const outcome = await search({ q: NEEDLE });

    expect(outcome.groups.map((group) => group.kind)).toEqual([
      "conditions",
      "medicines",
      "charities",
      "stories",
    ]);
    expect(outcome.total).toBe(4);
    expect(titles(outcome, "conditions")).toHaveLength(1);
    expect(titles(outcome, "medicines")).toHaveLength(1);
    expect(titles(outcome, "charities")).toHaveLength(1);
    expect(titles(outcome, "stories")).toEqual([`An invented story about ${NEEDLE}`]);
  });

  it("matches without regard to case", async () => {
    await makeMedicine();
    expect((await search({ q: NEEDLE.toUpperCase() })).total).toBe(1);
  });

  it("finds a story by the person's name, not only by its title", async () => {
    const figure = await testDb.publicFigure.create({
      data: {
        name: `Invented ${NEEDLE} Person`,
        slug: unique("invented-figure"),
        shortBio: "Entirely invented, for tests.",
      },
    });
    const story = await makeDraft(fixtures, {
      title: "An invented story with an unrelated title",
      publicFigureId: figure.id,
    });
    await publishViaWorkflow(fixtures, story.id);

    expect(titles(await search({ q: NEEDLE }), "stories")).toHaveLength(1);
  });

  it("returns nothing for an empty box rather than the whole database", async () => {
    await makeMedicine();
    await makeCharity();

    for (const q of ["", "   ", undefined, null]) {
      const outcome = await search({ q });
      expect(outcome.total).toBe(0);
      expect(outcome.groups).toEqual([]);
    }
  });

  it("narrows to one kind when a filter chip is chosen", async () => {
    await makeMedicine();
    await makeCharity();

    const onlyCharities = await search({ q: NEEDLE, kind: "charities" });
    expect(onlyCharities.groups.map((group) => group.kind)).toEqual(["charities"]);

    const onlyMedicines = await search({ q: NEEDLE, kind: "medicines" });
    expect(onlyMedicines.groups.map((group) => group.kind)).toEqual(["medicines"]);
  });
});

describe("search never returns something that is not publicly visible", () => {
  let fixtures: StoryFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeFixtures();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("does not return a retracted story — the worst one to find on the front page", async () => {
    const story = await makeDraft(fixtures, { title: `An invented ${NEEDLE} story` });
    await publishViaWorkflow(fixtures, story.id);

    expect(titles(await search({ q: NEEDLE }), "stories")).toHaveLength(1);

    await retractStory(story.id, "An invented reason, for a test.");

    expect(await search({ q: NEEDLE })).toMatchObject({ total: 0, groups: [] });
  });

  it("does not return a draft, or a story still in review", async () => {
    const draft = await makeDraft(fixtures, { title: `An invented draft about ${NEEDLE}` });
    const inReview = await makeDraft(fixtures, { title: `An invented review of ${NEEDLE}` });
    const { submitForReview } = await import("@/lib/stories/editorial");
    await submitForReview(inReview.id);

    expect(await search({ q: NEEDLE })).toMatchObject({ total: 0 });
    // And still not when the caller asks for stories specifically.
    expect(await search({ q: NEEDLE, kind: "stories" })).toMatchObject({ total: 0 });
    expect(draft.id).toBeTruthy();
  });

  it("does not return a charity no editor has verified", async () => {
    await makeCharity({ verified: false });
    expect(await search({ q: NEEDLE })).toMatchObject({ total: 0 });
    expect(await search({ q: NEEDLE, kind: "charities" })).toMatchObject({ total: 0 });
  });

  it("does not return a charity that has been withdrawn", async () => {
    const charity = await makeCharity();
    expect(titles(await search({ q: NEEDLE }), "charities")).toHaveLength(1);

    await testDb.charity.update({ where: { id: charity.id }, data: { active: false } });

    expect(await search({ q: NEEDLE })).toMatchObject({ total: 0 });
  });

  it("does not return a medicine no editor has written up", async () => {
    // The shape `findOrCreateIntervention` leaves behind when a person logs a treatment in
    // their own tracking: a name and nothing else. That is somebody's medicine cabinet.
    await makeMedicine({ written: false });

    expect(await search({ q: NEEDLE })).toMatchObject({ total: 0 });
    expect(await search({ q: NEEDLE, kind: "medicines" })).toMatchObject({ total: 0 });
  });

  it("keeps the content note on a sensitive result", async () => {
    const story = await makeDraft(fixtures, {
      title: `An invented ${NEEDLE} story`,
      conditionIds: [fixtures.depression.id],
    });
    await publishViaWorkflow(fixtures, story.id);

    const outcome = await search({ q: NEEDLE });
    const storyResult = outcome.groups.find((group) => group.kind === "stories")!.results[0]!;
    expect(storyResult.needsContentNote).toBe(true);
  });
});

/**
 * The rule above is only durable while this module keeps reading through the query layer.
 * A hand-rolled Prisma query here would re-implement the published, verified and written-up
 * filters in a second place — and the second place is the one that gets it wrong later.
 */
describe("the search module owns no queries of its own", () => {
  const source = readFileSync("src/lib/search/index.ts", "utf8");

  it("never touches the database directly", () => {
    expect(source).not.toContain("@/lib/db");
    expect(source).not.toContain("PrismaClient");
    expect(source).not.toMatch(/\bdb\.\w+\.(findMany|findFirst|findUnique|count)\b/);
  });

  it("reads through the public query modules instead", () => {
    expect(source).toContain("listPublishedStories");
    expect(source).toContain("listPublicCharities");
    expect(source).toContain("listPublicMedicines");
    expect(source).toContain("listConditions");
  });

  it("does not re-state the filters those modules apply", () => {
    expect(source).not.toContain('status: "published"');
    expect(source).not.toContain("verifiedAt");
    expect(source).not.toContain("active: true");
  });
});
