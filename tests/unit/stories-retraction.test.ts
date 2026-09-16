// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { retractStory } from "@/lib/stories/editorial";
import {
  countPublishedStories,
  getCondition,
  getPublicFigure,
  getPublishedStory,
  getRelatedStories,
  listPublishedStories,
  listStoriesForCorrectionForm,
  publishedStoryPaths,
} from "@/lib/stories/queries";
import { listSavedStories, toggleSavedStory } from "@/lib/stories/saved";

import { makeUser, resetDatabase, testDb } from "../helpers/db";
import { makeDraft, makeFixtures, publishViaWorkflow, type StoryFixtures } from "./stories-fixtures";

/**
 * Retraction is immediate. Brief 5.2 and AGENTS.md rule 3: a retracted story disappears
 * from every public surface on the next request — lists, search, condition pages, related
 * stories, the person's own page, the sitemap, and anyone's saved list.
 *
 * Every surface is checked separately here, because "it is gone from the index" is not the
 * same promise as "it is gone".
 */
describe("retracting a story removes it from every public surface", () => {
  let fixtures: StoryFixtures;
  let retracted: { id: string; slug: string };
  let kept: { id: string; slug: string };

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeFixtures();

    retracted = await makeDraft(fixtures, {
      title: "A story about a made-up swimmer",
      summary:
        "An invented summary about an invented swimmer, written in our own words and long enough to be real.",
    });
    kept = await makeDraft(fixtures, {
      title: "A story that stays up",
      summary:
        "Another invented summary, written in our own words and long enough to look like a real one.",
    });

    await publishViaWorkflow(fixtures, retracted.id);
    await publishViaWorkflow(fixtures, kept.id);
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("is on every surface before it is retracted", async () => {
    expect(await getPublishedStory(retracted.slug)).not.toBeNull();
    expect((await listPublishedStories()).map((s) => s.id)).toContain(retracted.id);
    expect(await countPublishedStories()).toBe(2);
  });

  it("is gone from the index, and from search", async () => {
    await retractStory(retracted.id, "The person's representative asked us to.");

    const index = await listPublishedStories();
    expect(index.map((story) => story.id)).toEqual([kept.id]);
    expect(await countPublishedStories()).toBe(1);

    const search = await listPublishedStories({ q: "swimmer" });
    expect(search).toHaveLength(0);
  });

  it("is gone from its own page", async () => {
    await retractStory(retracted.id, "An invented reason.");
    expect(await getPublishedStory(retracted.slug)).toBeNull();
  });

  it("is gone from the condition page", async () => {
    await retractStory(retracted.id, "An invented reason.");

    const onCondition = await listPublishedStories({ condition: fixtures.breastCancer.slug });
    expect(onCondition.map((story) => story.id)).toEqual([kept.id]);

    const condition = await getCondition(fixtures.breastCancer.slug);
    expect(condition?.storyCount).toBe(1);
  });

  it("is gone from related stories", async () => {
    await retractStory(retracted.id, "An invented reason.");

    const related = await getRelatedStories(kept.id, [fixtures.breastCancer.slug]);
    expect(related).toHaveLength(0);
  });

  it("is gone from the sitemap", async () => {
    await retractStory(retracted.id, "An invented reason.");

    const paths = (await publishedStoryPaths()).map((entry) => entry.path);
    expect(paths).not.toContain(`/stories/${retracted.slug}`);
    expect(paths).toContain(`/stories/${kept.slug}`);
  });

  it("is gone from the correction form's list of stories", async () => {
    await retractStory(retracted.id, "An invented reason.");

    const options = await listStoriesForCorrectionForm();
    expect(options.map((option) => option.id)).toEqual([kept.id]);
  });

  it("is gone from the saved list of someone who had saved it", async () => {
    const reader = await makeUser();
    await toggleSavedStory(reader.id, retracted.id);
    expect(await listSavedStories(reader.id)).toHaveLength(1);

    await retractStory(retracted.id, "An invented reason.");

    expect(await listSavedStories(reader.id)).toHaveLength(0);
  });

  it("takes the public figure's page down with their last published story", async () => {
    const before = await getPublicFigure(fixtures.figure.slug);
    expect(before?.stories).toHaveLength(2);

    await retractStory(retracted.id, "An invented reason.");
    const after = await getPublicFigure(fixtures.figure.slug);
    expect(after?.stories.map((story) => story.id)).toEqual([kept.id]);

    await retractStory(kept.id, "An invented reason.");
    expect(await getPublicFigure(fixtures.figure.slug)).toBeNull();
  });

  it("keeps the record of who published it and when", async () => {
    await retractStory(retracted.id, "The representative asked us to.");

    const row = await testDb.story.findUniqueOrThrow({ where: { id: retracted.id } });
    expect(row.status).toBe("retracted");
    expect(row.retractedAt).not.toBeNull();
    expect(row.verifiedById).toBe(fixtures.verifier.id);
    expect(row.retractionReason).toBe("The representative asked us to.");
  });
});

describe("stories that were never published", () => {
  let fixtures: StoryFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeFixtures();
  });

  it("never appear on a public surface", async () => {
    const draft = await makeDraft(fixtures, { title: "An unfinished draft" });

    expect(await getPublishedStory(draft.slug)).toBeNull();
    expect(await listPublishedStories()).toHaveLength(0);
    expect(await listPublishedStories({ q: "unfinished" })).toHaveLength(0);
    expect((await publishedStoryPaths()).map((e) => e.path)).not.toContain(
      `/stories/${draft.slug}`,
    );
    expect(await getPublicFigure(fixtures.figure.slug)).toBeNull();
  });
});
