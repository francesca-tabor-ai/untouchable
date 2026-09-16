// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  getPublishedStory,
  getRelatedStories,
  listConditions,
  listPublishedStories,
} from "@/lib/stories/queries";
import { storySearchSchema } from "@/lib/stories/schemas";

import { resetDatabase, testDb } from "../helpers/db";
import { makeDraft, makeFixtures, publishViaWorkflow, type StoryFixtures } from "./stories-fixtures";

/**
 * Browsing, filtering and searching — the things a visitor does with no account at all.
 * Brief 5.4: "A visitor can browse, filter and search stories on mobile without logging in."
 *
 * None of these functions take a user. That is the point: nothing on this path knows or
 * cares who is asking.
 */
describe("browsing stories without an account", () => {
  let fixtures: StoryFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeFixtures();

    const cancerStory = await makeDraft(fixtures, {
      title: "Marla Quintrell on finishing a tour",
      summary:
        "An invented summary about an invented actor who kept working through treatment, written in our own words.",
      conditionIds: [fixtures.breastCancer.id],
    });
    const moodStory = await makeDraft(fixtures, {
      title: "Ines Vallimar on the year she could not write",
      summary:
        "An invented summary about an invented novelist and a year she did not work, written in our own words.",
      conditionIds: [fixtures.depression.id],
    });
    const bothStory = await makeDraft(fixtures, {
      title: "A story that touches both",
      summary:
        "An invented summary that belongs to two conditions at once, written in our own words for a test.",
      conditionIds: [fixtures.breastCancer.id, fixtures.depression.id],
    });

    for (const story of [cancerStory, moodStory, bothStory]) {
      await publishViaWorkflow(fixtures, story.id);
    }
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("lists every published story, newest first", async () => {
    const stories = await listPublishedStories();
    expect(stories).toHaveLength(3);
  });

  it("filters by condition", async () => {
    const cancer = await listPublishedStories({ condition: fixtures.breastCancer.slug });
    expect(cancer.map((story) => story.title).sort()).toEqual([
      "A story that touches both",
      "Marla Quintrell on finishing a tour",
    ]);

    const mood = await listPublishedStories({ condition: fixtures.depression.slug });
    expect(mood).toHaveLength(2);
  });

  it("searches by the person's name", async () => {
    const results = await listPublishedStories({ q: "invented person" });
    expect(results).toHaveLength(3);
  });

  it("searches by words in the title, whatever the case", async () => {
    const results = await listPublishedStories({ q: "VALLIMAR" });
    expect(results.map((story) => story.title)).toEqual([
      "Ines Vallimar on the year she could not write",
    ]);
  });

  it("searches by condition name", async () => {
    const results = await listPublishedStories({ q: "Invented low mood" });
    expect(results).toHaveLength(2);
  });

  it("combines a search with a condition filter", async () => {
    const results = await listPublishedStories({
      q: "both",
      condition: fixtures.breastCancer.slug,
    });
    expect(results.map((story) => story.title)).toEqual(["A story that touches both"]);
  });

  it("returns nothing rather than everything when nothing matches", async () => {
    expect(await listPublishedStories({ q: "zzzz-nothing-here" })).toHaveLength(0);
  });

  it("counts only published stories against each condition", async () => {
    const conditions = await listConditions();
    const cancer = conditions.find((c) => c.slug === fixtures.breastCancer.slug);
    expect(cancer?.storyCount).toBe(2);
  });

  it("relates stories by shared condition, and never to themselves", async () => {
    const [first] = await listPublishedStories({ condition: fixtures.breastCancer.slug });
    const related = await getRelatedStories(first.id, [fixtures.breastCancer.slug]);

    expect(related.map((story) => story.id)).not.toContain(first.id);
    expect(related).toHaveLength(1);
  });

  it("carries the conditions and the content-note flag onto each card", async () => {
    const [sensitive] = await listPublishedStories({ condition: fixtures.depression.slug });
    expect(sensitive.needsContentNote).toBe(true);

    const onlyCancer = (await listPublishedStories()).find(
      (story) => story.title === "Marla Quintrell on finishing a tour",
    );
    expect(onlyCancer?.needsContentNote).toBe(false);
  });

  it("returns the whole story, its sources and its key moments, by slug", async () => {
    const [card] = await listPublishedStories();
    const story = await getPublishedStory(card.slug);

    expect(story?.sources.length).toBeGreaterThan(0);
    expect(story?.sources[0].url).toMatch(/^https:\/\/example\.test\//);
  });
});

describe("the search parameters from the address bar", () => {
  it("ignores empty values rather than filtering on them", () => {
    const parsed = storySearchSchema.parse({ q: "  ", condition: "" });
    expect(parsed.q).toBeUndefined();
    expect(parsed.condition).toBeUndefined();
  });

  it("refuses a search long enough to be an attack rather than a question", () => {
    const parsed = storySearchSchema.safeParse({ q: "x".repeat(400) });
    expect(parsed.success).toBe(false);
  });
});
