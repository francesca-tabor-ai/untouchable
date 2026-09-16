import type { Condition, User } from "@/generated/prisma";

import { makeUser, testDb } from "../helpers/db";

/**
 * Fixtures for the stories hub suites (tests/unit/stories-*.test.ts).
 *
 * Everything invented, as everywhere else in this repository. Owned by the stories team.
 */

export interface StoryFixtures {
  drafter: User;
  verifier: User;
  breastCancer: Condition;
  depression: Condition;
  figure: { id: string; slug: string; name: string };
}

let counter = 0;

function unique(prefix: string) {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export async function makeFixtures(): Promise<StoryFixtures> {
  const [drafter, verifier] = await Promise.all([
    makeUser({ role: "editor" }),
    makeUser({ role: "editor" }),
  ]);

  const breastCancer = await testDb.condition.create({
    data: {
      name: "Invented breast cancer",
      slug: unique("invented-breast-cancer"),
      summary: "An invented condition summary for tests.",
      isSensitiveTopic: false,
    },
  });

  const depression = await testDb.condition.create({
    data: {
      name: "Invented low mood",
      slug: unique("invented-low-mood"),
      summary: "An invented condition summary for tests. Marked sensitive.",
      isSensitiveTopic: true,
    },
  });

  const figure = await testDb.publicFigure.create({
    data: {
      name: "Invented Person",
      slug: unique("invented-person"),
      shortBio: "Entirely invented, for tests.",
    },
    select: { id: true, slug: true, name: true },
  });

  return { drafter, verifier, breastCancer, depression, figure };
}

export async function makeDraft(
  fixtures: StoryFixtures,
  overrides: {
    title?: string;
    summary?: string;
    conditionIds?: string[];
    publicFigureId?: string | null;
    type?: "public_figure" | "community";
    communityPermissionConfirmed?: boolean;
    contentNote?: string | null;
    withSource?: boolean;
  } = {},
) {
  const slug = unique("invented-story");
  const conditionIds = overrides.conditionIds ?? [fixtures.breastCancer.id];
  const type = overrides.type ?? "public_figure";

  const story = await testDb.story.create({
    data: {
      type,
      publicFigureId:
        type === "community" ? null : (overrides.publicFigureId ?? fixtures.figure.id),
      disclosureType: "own",
      title: overrides.title ?? "An invented story",
      slug,
      summary:
        overrides.summary ??
        "Written in our own words for a test. Long enough to be a real summary, and about nobody at all.",
      contentNote: overrides.contentNote ?? null,
      communityPermissionConfirmed:
        type === "community" ? (overrides.communityPermissionConfirmed ?? true) : null,
      status: "draft",
      draftedById: fixtures.drafter.id,
      conditions: { create: conditionIds.map((conditionId) => ({ conditionId })) },
    },
    select: { id: true, slug: true },
  });

  if (overrides.withSource !== false) {
    await addTestSource(story.id);
  }

  return story;
}

export async function addTestSource(storyId: string) {
  return testDb.source.create({
    data: {
      storyId,
      url: `https://example.test/${unique("source")}`,
      title: "An invented interview",
      publisher: "Example Publisher",
      publishedDate: new Date("2024-01-01"),
      sourceType: "interview",
    },
    select: { id: true },
  });
}

/** Take a draft all the way through the two-step route, the way an editor would. */
export async function publishViaWorkflow(fixtures: StoryFixtures, storyId: string) {
  const { submitForReview, verifyAndPublish } = await import("@/lib/stories/editorial");
  await submitForReview(storyId);
  return verifyAndPublish(storyId, fixtures.verifier.id);
}
