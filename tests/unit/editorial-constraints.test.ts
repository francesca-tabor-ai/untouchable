// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * These rules protect real, named people from having something inaccurate published about
 * their health. They are tested here against the database itself, not against application
 * code, because the database is the layer a future refactor cannot forget.
 */
describe("editorial rules, enforced by the database", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  async function draftStory(overrides: Record<string, unknown> = {}) {
    const drafter = await makeUser({ role: "editor" });
    const figure = await testDb.publicFigure.create({
      data: { name: "Fictional Person", slug: `fictional-${Date.now()}`, shortBio: "Invented." },
    });

    return testDb.story.create({
      data: {
        type: "public_figure",
        publicFigureId: figure.id,
        disclosureType: "own",
        title: "An invented story",
        slug: `invented-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        summary: "Written in our own words.",
        draftedById: drafter.id,
        ...overrides,
      },
    });
  }

  it("refuses to publish a story with no source", async () => {
    const story = await draftStory();
    const verifier = await makeUser({ role: "editor" });

    await expect(
      testDb.story.update({
        where: { id: story.id },
        data: { status: "published", verifiedById: verifier.id, publishedAt: new Date() },
      }),
    ).rejects.toThrow();
  });

  it("refuses to publish when the same editor drafted and verified it", async () => {
    const story = await draftStory();
    await testDb.source.create({
      data: {
        storyId: story.id,
        url: "https://example.test/interview",
        title: "An invented interview",
        publisher: "Example Publisher",
        sourceType: "interview",
      },
    });

    await expect(
      testDb.story.update({
        where: { id: story.id },
        data: {
          status: "published",
          verifiedById: story.draftedById,
          publishedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });

  it("publishes when there is a source and a second editor", async () => {
    const story = await draftStory();
    const verifier = await makeUser({ role: "editor" });
    await testDb.source.create({
      data: {
        storyId: story.id,
        url: "https://example.test/interview",
        title: "An invented interview",
        publisher: "Example Publisher",
        sourceType: "interview",
      },
    });

    const published = await testDb.story.update({
      where: { id: story.id },
      data: { status: "published", verifiedById: verifier.id, publishedAt: new Date() },
    });

    expect(published.status).toBe("published");
  });

  it("refuses to remove the only source of a published story", async () => {
    const story = await draftStory();
    const verifier = await makeUser({ role: "editor" });
    const source = await testDb.source.create({
      data: {
        storyId: story.id,
        url: "https://example.test/interview",
        title: "An invented interview",
        publisher: "Example Publisher",
        sourceType: "interview",
      },
    });
    await testDb.story.update({
      where: { id: story.id },
      data: { status: "published", verifiedById: verifier.id, publishedAt: new Date() },
    });

    await expect(testDb.source.delete({ where: { id: source.id } })).rejects.toThrow();
  });

  it("refuses to store an image with no licence recorded", async () => {
    await expect(
      testDb.publicFigure.create({
        data: {
          name: "Fictional Person",
          slug: `unlicensed-${Date.now()}`,
          shortBio: "Invented.",
          imageUrl: "https://example.test/photo.jpg",
        },
      }),
    ).rejects.toThrow();
  });

  it("refuses a quote longer than twenty-five words", async () => {
    const story = await draftStory();
    const source = await testDb.source.create({
      data: {
        storyId: story.id,
        url: "https://example.test/interview",
        title: "An invented interview",
        publisher: "Example Publisher",
        sourceType: "interview",
      },
    });

    await expect(
      testDb.story.update({
        where: { id: story.id },
        data: { quote: Array.from({ length: 26 }, () => "word").join(" "), quoteSourceId: source.id },
      }),
    ).rejects.toThrow();
  });

  it("refuses a quote with no source to attribute it to", async () => {
    const story = await draftStory();

    await expect(
      testDb.story.update({
        where: { id: story.id },
        data: { quote: "A short invented quote." },
      }),
    ).rejects.toThrow();
  });

  it("refuses to publish a community story without written permission", async () => {
    const drafter = await makeUser({ role: "editor" });
    const verifier = await makeUser({ role: "editor" });
    const story = await testDb.story.create({
      data: {
        type: "community",
        disclosureType: "own",
        title: "An invented community story",
        slug: `community-${Date.now()}`,
        summary: "Written in our own words.",
        draftedById: drafter.id,
        communityPermissionConfirmed: false,
      },
    });
    await testDb.source.create({
      data: {
        storyId: story.id,
        url: "https://example.test/statement",
        title: "Their own statement",
        publisher: "Example",
        sourceType: "statement",
      },
    });

    await expect(
      testDb.story.update({
        where: { id: story.id },
        data: { status: "published", verifiedById: verifier.id, publishedAt: new Date() },
      }),
    ).rejects.toThrow();
  });

  it("refuses to record a charity as verified without naming who verified it", async () => {
    await expect(
      testDb.charity.create({
        data: {
          name: "Invented Charity",
          slug: `invented-${Date.now()}`,
          registeredNumber: "0000000",
          regulator: "CCEW",
          websiteUrl: "https://example.test",
          donationUrl: "https://example.test/donate",
          description: "Invented for development.",
          verifiedAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
});
