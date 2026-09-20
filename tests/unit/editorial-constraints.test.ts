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

/**
 * A licence must belong to the image it is attached to.
 *
 * The original rule asked only whether a licence existed. Once a figure had one licensed
 * photograph, the URL could be swapped for any other and the old credit stayed attached —
 * which published a press photograph falsely credited to a named photographer under a
 * Creative Commons licence he had never granted for it. That is a false statement about
 * somebody's work, made under our name, and it is worse than having no picture.
 */
describe("a photograph's licence cannot outlive the photograph", () => {
  beforeEach(resetDatabase);

  const licence = JSON.stringify({
    author: "A Photographer",
    licence: "CC BY 2.0",
    licenceUrl: "https://creativecommons.org/licenses/by/2.0",
    source: "https://commons.wikimedia.org/wiki/File:Example.jpg",
  });

  async function figureWithPhotograph() {
    return testDb.publicFigure.create({
      data: {
        name: "Fictional Person",
        slug: `licensed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        shortBio: "Invented.",
        imageUrl: "/figures/example.jpg",
        imageLicence: licence,
      },
    });
  }

  it("refuses a new image that keeps the old credit", async () => {
    const figure = await figureWithPhotograph();

    await expect(
      testDb.publicFigure.update({
        where: { id: figure.id },
        data: { imageUrl: "/figures/somebody-elses.jpg" },
      }),
    ).rejects.toThrow();
  });

  it("allows the image and its licence to change together", async () => {
    const figure = await figureWithPhotograph();

    const updated = await testDb.publicFigure.update({
      where: { id: figure.id },
      data: {
        imageUrl: "/figures/replacement.jpg",
        imageLicence: JSON.stringify({ author: "Someone Else", licence: "CC BY-SA 4.0" }),
      },
    });

    expect(updated.imageUrl).toBe("/figures/replacement.jpg");
  });

  it("refuses an image hosted somewhere else, licence or no licence", async () => {
    // Hot-linking would tell that server the IP of everyone reading about a diagnosis, and
    // a remote file is not one we can licence. Both press images offered have been remote.
    await expect(
      testDb.publicFigure.create({
        data: {
          name: "Fictional Person",
          slug: `remote-${Date.now()}`,
          shortBio: "Invented.",
          imageUrl: "https://m.media-amazon.com/images/M/example.jpg",
          imageLicence: licence,
        },
      }),
    ).rejects.toThrow();
  });
});
