// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

// The components read the session to ask the no-pressure policy. Auth.js cannot be loaded
// outside a request, and who is signed in is not what this file is about: a visitor is the
// case that matters, because the support variant must work with no account at all.
vi.mock("@/lib/auth/guards", () => ({ getCurrentUser: async () => null }));

import { CharitiesForCondition } from "@/components/charities/charities-for-condition";
import { DonateLink } from "@/components/charities/donate-link";
import { StoryCharities } from "@/components/charities/story-charities";
import { Regulator } from "@/generated/prisma";
import {
  DONATION_COPY,
  GIVING_LANGUAGE,
  SUPPORT_COPY,
  givingLanguageProblem,
} from "@/lib/charities/prompt-policy";
import { makeUser, resetDatabase, testDb } from "../helpers/db";

/**
 * The support variant.
 *
 * On a surface that carries a content note and support contacts — a story about suicide, the
 * depression condition page — the charities are shown as places to get help, and there is no
 * way to give from the block at all. That is the guarantee, so it is what this file tests.
 *
 * The support branch renders no async children, so the element tree can be rendered straight
 * to markup and inspected. That is the strongest form of this assertion: not "we did not pass
 * a prop" but "the bytes that reach the browser contain no donate affordance".
 */

let counter = 0;

async function makeVerifiedCharity(editorId: string, conditionId?: string) {
  counter += 1;
  return testDb.charity.create({
    data: {
      name: `Invented Support Charity ${counter}`,
      slug: `support-charity-${counter}`,
      registeredNumber: String(4000000 + counter),
      regulator: Regulator.CCEW,
      websiteUrl: `https://support-${counter}.example.test`,
      donationUrl: `https://support-${counter}.example.test/donate`,
      description:
        "An invented charity, used only in tests. It runs a helpline that does not exist.",
      verifiedAt: new Date(),
      verifiedById: editorId,
      ...(conditionId ? { conditions: { create: { conditionId } } } : {}),
    },
  });
}

/** Everything the block would need in order to ask someone for a donation. */
function donationAffordances(markup: string): string[] {
  const found: string[] = [];
  if (/\/donate/.test(markup)) found.push("a link to the donation hand-off");
  if (/from=(charity|condition|story|causes)/.test(markup)) found.push("a referral origin");
  for (const copy of Object.values(DONATION_COPY)) {
    if (markup.includes(copy)) found.push(`donation copy: "${copy}"`);
  }
  for (const { pattern, problem } of GIVING_LANGUAGE) {
    if (pattern.test(markup)) found.push(`giving language: ${problem}`);
  }
  return found;
}

describe("the support variant renders no donate affordance", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("shows charities on a condition page with nothing to give through", async () => {
    const editor = await makeUser({ role: "editor" });
    const condition = await testDb.condition.create({
      data: {
        name: "Depression",
        slug: "depression",
        summary: "An invented condition used only in tests.",
        isSensitiveTopic: true,
      },
    });
    const charity = await makeVerifiedCharity(editor.id, condition.id);

    const markup = renderToStaticMarkup(
      await CharitiesForCondition({ conditionId: condition.id, variant: "support" }),
    );

    // The charity is there, and so is the way to reach its helpline.
    expect(markup).toContain(charity.name);
    expect(markup).toContain(charity.websiteUrl);
    expect(markup).toContain(SUPPORT_COPY.heading);

    // And there is no way to give from this block.
    expect(donationAffordances(markup)).toEqual([]);
  });

  it("shows charities on a story with nothing to give through, and claims nothing about anyone", async () => {
    const editor = await makeUser({ role: "editor" });
    const sourced = await makeVerifiedCharity(editor.id);
    const unsourced = await makeVerifiedCharity(editor.id);

    const story = await testDb.story.create({
      data: {
        type: "community",
        disclosureType: "own",
        title: "An invented story",
        slug: "an-invented-support-story",
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

    const markup = renderToStaticMarkup(
      await StoryCharities({ storyId: story.id, variant: "support" }),
    );

    expect(markup).toContain(sourced.name);
    expect(markup).toContain(unsourced.name);
    expect(donationAffordances(markup)).toEqual([]);

    // Nothing is presented as this person's support, sourced or not — on a sensitive-topic
    // story the block makes no claim about anybody at all.
    expect(markup).not.toContain("publicly supported");
    expect(markup).not.toContain("Said publicly");
    expect(markup).not.toContain(source.title);
  });

  it("keeps the support block out of a page that has no charities to show", async () => {
    const condition = await testDb.condition.create({
      data: {
        name: "Depression",
        slug: "depression-empty",
        summary: "An invented condition used only in tests.",
      },
    });

    expect(
      await CharitiesForCondition({ conditionId: condition.id, variant: "support" }),
    ).toBeNull();
    expect(await StoryCharities({ storyId: "does-not-exist", variant: "support" })).toBeNull();
  });

  it("still offers the hand-off in the default variant, on the same data", async () => {
    // The two variants differ in what they offer, not in which charities they show.
    const editor = await makeUser({ role: "editor" });
    const condition = await testDb.condition.create({
      data: {
        name: "Type 2 diabetes",
        slug: "type-2-diabetes",
        summary: "An invented condition used only in tests.",
      },
    });
    const charity = await makeVerifiedCharity(editor.id, condition.id);

    const support = renderToStaticMarkup(
      await CharitiesForCondition({ conditionId: condition.id, variant: "support" }),
    );
    const byDefault = renderToStaticMarkup(
      await CharitiesForCondition({ conditionId: condition.id }),
    );

    expect(support).toContain(charity.name);
    expect(byDefault).toContain(charity.name);

    expect(donationAffordances(support)).toEqual([]);
    expect(byDefault).toContain(`/charities/${charity.slug}/donate?from=condition`);
    expect(byDefault).toContain(DONATION_COPY.donateLabel);
  });

  it("proves the detector would catch a donate affordance if one appeared", async () => {
    // Otherwise the assertions above could pass because the detector does nothing.
    const markup = renderToStaticMarkup(
      DonateLink({
        charity: { slug: "support-charity-1", name: "Invented Support Charity 1" },
        origin: "condition",
      }),
    );

    expect(donationAffordances(markup).length).toBeGreaterThan(0);
    expect(markup).toContain("/donate?from=condition");
  });
});

describe("support copy stays out of the giving frame", () => {
  it("holds every support string to the same standard", () => {
    for (const [key, copy] of Object.entries(SUPPORT_COPY)) {
      expect(givingLanguageProblem(copy), `${key}: ${copy}`).toBeNull();
    }
  });

  it("reads as somewhere to get help, not as a cause to support", () => {
    expect(SUPPORT_COPY.heading).toBe("Where to get support");
    expect(SUPPORT_COPY.conditionIntro).toContain("helpline");
    expect(SUPPORT_COPY.clinicalReminder).toContain("GP");
  });

  it("catches giving language if someone reintroduces it", () => {
    expect(givingLanguageProblem("You could also donate to them")).not.toBeNull();
    expect(givingLanguageProblem("Give what you can")).not.toBeNull();
    expect(givingLanguageProblem("Fundraise for them")).not.toBeNull();
    expect(givingLanguageProblem("They run a helpline, open day and night.")).toBeNull();
  });
});
