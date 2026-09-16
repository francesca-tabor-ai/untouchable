// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  markReviewed,
  removeSource,
  retractStory,
  returnToDraft,
  reviewQueue,
  submitForReview,
  updateStoryDraft,
  verifyAndPublish,
} from "@/lib/stories/editorial";
import { StoryRuleError } from "@/lib/stories/errors";
import { storyDraftSchema } from "@/lib/stories/schemas";

import { resetDatabase, testDb } from "../helpers/db";
import {
  addTestSource,
  makeDraft,
  makeFixtures,
  publishViaWorkflow,
  type StoryFixtures,
} from "./stories-fixtures";

/**
 * The editorial workflow, and the two rules that keep it honest: a story needs a source,
 * and it needs two different editors. Brief 5.2 and 5.4.
 *
 * The database enforces both as well (tests/unit/editorial-constraints.test.ts). These tests
 * are about what an editor is told when they try, because an error nobody can read is a
 * rule nobody can follow.
 */
describe("two-step publishing", () => {
  let fixtures: StoryFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeFixtures();
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("refuses to send a story with no source for review", async () => {
    const story = await makeDraft(fixtures, { withSource: false });

    await expect(submitForReview(story.id)).rejects.toBeInstanceOf(StoryRuleError);
    await expect(submitForReview(story.id)).rejects.toThrow(/at least one source/i);

    const after = await testDb.story.findUniqueOrThrow({ where: { id: story.id } });
    expect(after.status).toBe("draft");
  });

  it("refuses to publish a story that has no source", async () => {
    const story = await makeDraft(fixtures);
    await submitForReview(story.id);

    // The source is pulled after review started — the story is not published, so this is
    // allowed, and publishing must then fail.
    const sources = await testDb.source.findMany({ where: { storyId: story.id } });
    await removeSource(sources[0].id);

    await expect(verifyAndPublish(story.id, fixtures.verifier.id)).rejects.toThrow(
      /without at least one source/i,
    );

    const after = await testDb.story.findUniqueOrThrow({ where: { id: story.id } });
    expect(after.status).toBe("in_review");
    expect(after.publishedAt).toBeNull();
  });

  it("refuses to publish a story approved by only one editor", async () => {
    const story = await makeDraft(fixtures);
    await submitForReview(story.id);

    await expect(verifyAndPublish(story.id, fixtures.drafter.id)).rejects.toBeInstanceOf(
      StoryRuleError,
    );
    await expect(verifyAndPublish(story.id, fixtures.drafter.id)).rejects.toThrow(
      /you drafted this story/i,
    );

    const after = await testDb.story.findUniqueOrThrow({ where: { id: story.id } });
    expect(after.status).toBe("in_review");
    expect(after.verifiedById).toBeNull();
  });

  it("refuses to publish a story that has not been sent for review", async () => {
    const story = await makeDraft(fixtures);

    await expect(verifyAndPublish(story.id, fixtures.verifier.id)).rejects.toThrow(
      /sent for review/i,
    );
  });

  it("publishes when there is a source and a second editor", async () => {
    const story = await makeDraft(fixtures);
    const published = await publishViaWorkflow(fixtures, story.id);

    expect(published.status).toBe("published");

    const after = await testDb.story.findUniqueOrThrow({ where: { id: story.id } });
    expect(after.verifiedById).toBe(fixtures.verifier.id);
    expect(after.draftedById).toBe(fixtures.drafter.id);
    expect(after.publishedAt).not.toBeNull();
    expect(after.lastReviewedAt).not.toBeNull();
  });

  it("refuses to publish a community story without written permission", async () => {
    const story = await makeDraft(fixtures, {
      type: "community",
      communityPermissionConfirmed: false,
    });
    await submitForReview(story.id);

    await expect(verifyAndPublish(story.id, fixtures.verifier.id)).rejects.toThrow(
      /written permission/i,
    );
  });

  it("will not let the last source of a published story be removed", async () => {
    const story = await makeDraft(fixtures);
    await publishViaWorkflow(fixtures, story.id);

    const sources = await testDb.source.findMany({ where: { storyId: story.id } });
    await expect(removeSource(sources[0].id)).rejects.toThrow(/only source/i);

    expect(await testDb.source.count({ where: { storyId: story.id } })).toBe(1);
  });

  it("lets a second source go from a published story, and takes the quote with it", async () => {
    const story = await makeDraft(fixtures);
    const second = await addTestSource(story.id);
    await testDb.story.update({
      where: { id: story.id },
      data: { quote: "Eight invented words, attributed to an invented source.", quoteSourceId: second.id },
    });
    await publishViaWorkflow(fixtures, story.id);

    await removeSource(second.id);

    const after = await testDb.story.findUniqueOrThrow({ where: { id: story.id } });
    expect(after.quote).toBeNull();
    expect(after.quoteSourceId).toBeNull();
  });

  it("sends a retracted story round the whole loop again", async () => {
    const story = await makeDraft(fixtures);
    await publishViaWorkflow(fixtures, story.id);
    await retractStory(story.id, "An invented reason.");

    // Straight back to published is not an option.
    await expect(verifyAndPublish(story.id, fixtures.verifier.id)).rejects.toThrow(
      /sent for review/i,
    );

    await returnToDraft(story.id);
    const republished = await publishViaWorkflow(fixtures, story.id);
    expect(republished.status).toBe("published");
  });
});

describe("quotes", () => {
  let fixtures: StoryFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeFixtures();
  });

  const draftInput = (overrides: Record<string, unknown>) => ({
    type: "public_figure",
    publicFigureId: "figure-id",
    disclosureType: "own",
    title: "An invented story",
    slug: "an-invented-story",
    summary:
      "Written in our own words for a test. Long enough to be a real summary, and about nobody at all.",
    keyMoments: [],
    conditionIds: ["condition-id"],
    ...overrides,
  });

  it("turns a quote over twenty-five words into a form error, not a crash", () => {
    const parsed = storyDraftSchema.safeParse(
      draftInput({
        quote: Array.from({ length: 26 }, () => "word").join(" "),
        quoteSourceId: "source-id",
      }),
    );

    expect(parsed.success).toBe(false);
    const issue = parsed.error?.issues.find((i) => i.path[0] === "quote");
    expect(issue?.message).toMatch(/at most 25 words/i);
  });

  it("asks where a quote came from", () => {
    const parsed = storyDraftSchema.safeParse(draftInput({ quote: "Four invented words here." }));

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((i) => i.path[0] === "quoteSourceId")).toBe(true);
  });

  it("refuses a quote attributed to a source on a different story", async () => {
    const story = await makeDraft(fixtures);
    const other = await makeDraft(fixtures);
    const otherSource = await testDb.source.findFirstOrThrow({ where: { storyId: other.id } });

    const values = storyDraftSchema.parse(
      draftInput({
        publicFigureId: fixtures.figure.id,
        slug: `${story.slug}-edited`,
        conditionIds: [fixtures.breastCancer.id],
        quote: "Six invented words, said by nobody.",
        quoteSourceId: otherSource.id,
      }),
    );

    await expect(updateStoryDraft(story.id, values)).rejects.toThrow(/source on this story/i);
  });
});

describe("the twelve-month review queue", () => {
  let fixtures: StoryFixtures;

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeFixtures();
  });

  it("lists published stories nobody has checked for a year", async () => {
    const stale = await makeDraft(fixtures, { title: "Checked a long time ago" });
    const fresh = await makeDraft(fixtures, { title: "Checked last week" });
    await publishViaWorkflow(fixtures, stale.id);
    await publishViaWorkflow(fixtures, fresh.id);

    const longAgo = new Date();
    longAgo.setMonth(longAgo.getMonth() - 13);
    await testDb.story.update({ where: { id: stale.id }, data: { lastReviewedAt: longAgo } });

    const queue = await reviewQueue();
    expect(queue.map((story) => story.id)).toEqual([stale.id]);

    await markReviewed(stale.id);
    expect(await reviewQueue()).toHaveLength(0);
  });

  it("does not put a draft or a retracted story in the review queue", async () => {
    const draft = await makeDraft(fixtures);
    const retracted = await makeDraft(fixtures);
    await publishViaWorkflow(fixtures, retracted.id);
    await retractStory(retracted.id, "An invented reason.");

    const queue = await reviewQueue();
    expect(queue.map((story) => story.id)).not.toContain(draft.id);
    expect(queue.map((story) => story.id)).not.toContain(retracted.id);
  });
});
