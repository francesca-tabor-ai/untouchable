// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { Regulator } from "@/generated/prisma";
import {
  charitiesForCondition,
  charitiesForStory,
  charityConditionFilters,
  getPublicCharity,
  getPublicCharityDonationTarget,
  listPublicCharities,
  publicCharityWhere,
} from "@/lib/charities/queries";
import { isPubliclyVisible, verificationState } from "@/lib/charities/verification";
import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * AGENTS.md rule 4 and brief 6.6: an unverified charity is never publicly visible.
 *
 * Enforced in the query layer, so a page cannot show one by forgetting to filter. These
 * tests go through the same functions the pages use.
 */

const MONTH = 30 * 24 * 60 * 60 * 1000;

let counter = 0;

async function makeCharity(
  overrides: Partial<{
    name: string;
    slug: string;
    verifiedAt: Date | null;
    verifiedById: string | null;
    active: boolean;
    conditionId: string;
  }> = {},
) {
  counter += 1;
  const slug = overrides.slug ?? `charity-${counter}`;
  return testDb.charity.create({
    data: {
      name: overrides.name ?? `Invented Charity ${counter}`,
      slug,
      registeredNumber: String(1000000 + counter),
      regulator: Regulator.CCEW,
      websiteUrl: `https://${slug}.example.test`,
      donationUrl: `https://${slug}.example.test/donate`,
      description: "An invented charity, used only in tests. Nothing here describes a real one.",
      active: overrides.active ?? true,
      verifiedAt: overrides.verifiedAt ?? null,
      verifiedById: overrides.verifiedById ?? null,
      ...(overrides.conditionId
        ? { conditions: { create: { conditionId: overrides.conditionId } } }
        : {}),
    },
  });
}

async function makeCondition(slug: string) {
  return testDb.condition.create({
    data: { name: slug, slug, summary: "An invented condition used only in tests." },
  });
}

describe("an unverified charity is never publicly visible", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("keeps the verification filter in the query itself", () => {
    // If someone loosens this, every test below fails — but so does this one, loudly.
    expect(publicCharityWhere).toEqual({
      active: true,
      verifiedAt: { not: null },
      verifiedById: { not: null },
    });
  });

  it("leaves an unverified charity out of the public directory", async () => {
    const editor = await makeUser({ role: "editor" });
    const condition = await makeCondition("breast-cancer");

    const verified = await makeCharity({
      slug: "verified-one",
      verifiedAt: new Date(),
      verifiedById: editor.id,
      conditionId: condition.id,
    });
    const unverified = await makeCharity({ slug: "unverified-one", conditionId: condition.id });

    const listed = await listPublicCharities();

    expect(listed.map((charity) => charity.slug)).toEqual([verified.slug]);
    expect(listed.map((charity) => charity.slug)).not.toContain(unverified.slug);
  });

  it("gives an unverified charity no public page and no donation hand-off", async () => {
    const unverified = await makeCharity({ slug: "no-check-yet" });

    expect(await getPublicCharity(unverified.slug)).toBeNull();
    expect(await getPublicCharityDonationTarget(unverified.slug)).toBeNull();
  });

  it("leaves an unverified charity off condition pages and story pages", async () => {
    const editor = await makeUser({ role: "editor" });
    const condition = await makeCondition("depression");

    const verified = await makeCharity({
      slug: "verified-two",
      verifiedAt: new Date(),
      verifiedById: editor.id,
      conditionId: condition.id,
    });
    const unverified = await makeCharity({ slug: "unverified-two", conditionId: condition.id });

    const story = await testDb.story.create({
      data: {
        type: "community",
        disclosureType: "own",
        title: "An invented story",
        slug: "an-invented-story",
        summary: "Written for tests only. Nobody in it is real.",
        draftedById: editor.id,
        communityPermissionConfirmed: true,
      },
    });
    await testDb.storyCharity.createMany({
      data: [
        { storyId: story.id, charityId: verified.id },
        { storyId: story.id, charityId: unverified.id },
      ],
    });

    const onCondition = await charitiesForCondition(condition.id);
    const onStory = await charitiesForStory(story.id);

    expect(onCondition.map((charity) => charity.slug)).toEqual(["verified-two"]);
    expect(onStory.map((link) => link.charity.slug)).toEqual(["verified-two"]);
  });

  it("leaves a withdrawn charity out, even though an editor once verified it", async () => {
    const editor = await makeUser({ role: "editor" });
    await makeCharity({
      slug: "withdrawn",
      active: false,
      verifiedAt: new Date(),
      verifiedById: editor.id,
    });

    expect(await listPublicCharities()).toHaveLength(0);
    expect(await getPublicCharity("withdrawn")).toBeNull();
  });

  it("does not count unverified charities in the condition filters", async () => {
    const editor = await makeUser({ role: "editor" });
    const condition = await makeCondition("type-2-diabetes");

    await makeCharity({
      slug: "counted",
      verifiedAt: new Date(),
      verifiedById: editor.id,
      conditionId: condition.id,
    });
    await makeCharity({ slug: "not-counted", conditionId: condition.id });

    const filters = await charityConditionFilters();

    expect(filters).toHaveLength(1);
    expect(filters[0].charityCount).toBe(1);
  });

  it("still shows a charity whose yearly re-check is overdue, and marks it as lapsed", async () => {
    // DECISIONS.md D-013: overdue means "an editor must look again", not "take the support
    // away from people mid-journey". A person on this page still needs the charity.
    const editor = await makeUser({ role: "editor" });
    const lapsedAt = new Date(Date.now() - 14 * MONTH);
    await makeCharity({ slug: "lapsed-one", verifiedAt: lapsedAt, verifiedById: editor.id });

    const listed = await listPublicCharities();

    expect(listed.map((charity) => charity.slug)).toEqual(["lapsed-one"]);
    expect(verificationState({ verifiedAt: lapsedAt, verifiedById: editor.id })).toBe("lapsed");
  });

  it("agrees with the in-memory predicate on every combination", async () => {
    const editor = await makeUser({ role: "editor" });
    const cases = [
      { active: true, verifiedAt: new Date(), verifiedById: editor.id, expected: true },
      { active: true, verifiedAt: null, verifiedById: null, expected: false },
      { active: false, verifiedAt: new Date(), verifiedById: editor.id, expected: false },
      { active: false, verifiedAt: null, verifiedById: null, expected: false },
    ];

    for (const [index, item] of cases.entries()) {
      const charity = await makeCharity({
        slug: `combination-${index}`,
        active: item.active,
        verifiedAt: item.verifiedAt,
        verifiedById: item.verifiedById,
      });

      expect(isPubliclyVisible(charity), charity.slug).toBe(item.expected);
      expect((await getPublicCharity(charity.slug)) !== null, charity.slug).toBe(item.expected);
    }
  });
});

describe("a support claim about a person needs a source", () => {
  beforeEach(resetDatabase);

  it("returns the source with the link when there is one, and null when there is not", async () => {
    const editor = await makeUser({ role: "editor" });
    const sourced = await makeCharity({
      slug: "sourced",
      verifiedAt: new Date(),
      verifiedById: editor.id,
    });
    const unsourced = await makeCharity({
      slug: "unsourced",
      verifiedAt: new Date(),
      verifiedById: editor.id,
    });

    const story = await testDb.story.create({
      data: {
        type: "community",
        disclosureType: "own",
        title: "Another invented story",
        slug: "another-invented-story",
        summary: "Written for tests only. Nobody in it is real.",
        draftedById: editor.id,
        communityPermissionConfirmed: true,
      },
    });
    const source = await testDb.source.create({
      data: {
        storyId: story.id,
        url: "https://example.test/interview",
        title: "An invented interview",
        publisher: "The Invented Times",
        sourceType: "interview",
      },
    });

    await testDb.storyCharity.createMany({
      data: [
        { storyId: story.id, charityId: sourced.id, sourceId: source.id },
        { storyId: story.id, charityId: unsourced.id, sourceId: null },
      ],
    });

    const links = await charitiesForStory(story.id);
    const bySlug = Object.fromEntries(links.map((link) => [link.charity.slug, link]));

    expect(bySlug["sourced"].source?.title).toBe("An invented interview");
    expect(bySlug["unsourced"].source).toBeNull();
  });
});
