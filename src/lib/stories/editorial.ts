import type { Prisma, StoryStatus } from "@/generated/prisma";
import { db } from "@/lib/db";

import { StoryRuleError, withRuleErrors } from "./errors";
import { parseKeyMoments, type KeyMoment } from "./key-moments";
import type {
  PublicFigureInput,
  SourceInput,
  StoryDraftValues,
} from "./schemas";

/**
 * The editorial workflow.
 *
 * Two-step publishing is the rule this module exists to hold: one editor drafts and submits,
 * a **different** editor checks the sources and publishes. Both are checked here and again
 * by the database, and neither layer will let a caller skip the other one. Brief 5.2.
 *
 * Authentication, authorisation and audit happen at the route boundary. Everything here
 * takes an `actorId` that a guard has already established.
 */

/** Stories are re-checked a year after they were last looked at. Brief 5.2. */
export const REVIEW_INTERVAL_MONTHS = 12;

export function reviewDueBefore(now: Date = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - REVIEW_INTERVAL_MONTHS);
  return cutoff;
}

const editorialSelect = {
  id: true,
  type: true,
  slug: true,
  title: true,
  summary: true,
  status: true,
  disclosureType: true,
  quote: true,
  quoteSourceId: true,
  contentNote: true,
  communityPermissionConfirmed: true,
  keyMomentsJson: true,
  publishedAt: true,
  lastReviewedAt: true,
  retractedAt: true,
  retractionReason: true,
  createdAt: true,
  updatedAt: true,
  publicFigureId: true,
  publicFigure: { select: { id: true, name: true, slug: true } },
  draftedById: true,
  draftedBy: { select: { id: true, email: true } },
  verifiedById: true,
  verifiedBy: { select: { id: true, email: true } },
  conditions: { select: { condition: { select: { id: true, name: true, slug: true } } } },
  sources: {
    select: {
      id: true,
      url: true,
      title: true,
      publisher: true,
      publishedDate: true,
      sourceType: true,
    },
    orderBy: { createdAt: "asc" },
  },
  _count: { select: { sources: true, takedowns: { where: { status: "open" } } } },
} satisfies Prisma.StorySelect;

type EditorialRow = Prisma.StoryGetPayload<{ select: typeof editorialSelect }>;

export type EditorialStory = Omit<EditorialRow, "keyMomentsJson" | "_count"> & {
  keyMoments: KeyMoment[];
  sourceCount: number;
  openRequestCount: number;
};

function toEditorialStory(row: EditorialRow): EditorialStory {
  const { keyMomentsJson, _count, ...rest } = row;
  return {
    ...rest,
    keyMoments: parseKeyMoments(keyMomentsJson),
    sourceCount: _count.sources,
    openRequestCount: _count.takedowns,
  };
}

export async function listEditorialStories(filter: { status?: StoryStatus } = {}) {
  const rows = await db.story.findMany({
    where: filter.status ? { status: filter.status } : {},
    select: editorialSelect,
    orderBy: [{ updatedAt: "desc" }],
    take: 200,
  });
  return rows.map(toEditorialStory);
}

export async function getEditorialStory(id: string): Promise<EditorialStory | null> {
  const row = await db.story.findUnique({ where: { id }, select: editorialSelect });
  return row ? toEditorialStory(row) : null;
}

export async function editorialCounts() {
  const [draft, inReview, published, retracted, openRequests, dueForReview] = await Promise.all([
    db.story.count({ where: { status: "draft" } }),
    db.story.count({ where: { status: "in_review" } }),
    db.story.count({ where: { status: "published" } }),
    db.story.count({ where: { status: "retracted" } }),
    db.takedownRequest.count({ where: { status: "open" } }),
    db.story.count({
      where: {
        status: "published",
        OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: reviewDueBefore() } }],
      },
    }),
  ]);

  return { draft, inReview, published, retracted, openRequests, dueForReview };
}

/** Published stories nobody has checked in the last twelve months. */
export async function reviewQueue() {
  const rows = await db.story.findMany({
    where: {
      status: "published",
      OR: [{ lastReviewedAt: null }, { lastReviewedAt: { lt: reviewDueBefore() } }],
    },
    select: editorialSelect,
    orderBy: [{ lastReviewedAt: "asc" }, { publishedAt: "asc" }],
  });
  return rows.map(toEditorialStory);
}

export async function listPublicFigures() {
  return db.publicFigure.findMany({
    select: { id: true, name: true, slug: true, isDeceased: true },
    orderBy: { name: "asc" },
  });
}

export async function listAllConditions() {
  return db.condition.findMany({
    select: { id: true, name: true, slug: true, isSensitiveTopic: true },
    orderBy: { name: "asc" },
  });
}

export async function createPublicFigure(input: PublicFigureInput) {
  return withRuleErrors(() =>
    db.publicFigure.create({
      data: {
        name: input.name,
        slug: input.slug,
        shortBio: input.shortBio,
        isDeceased: input.isDeceased,
      },
      select: { id: true, name: true, slug: true },
    }),
  );
}

function draftData(values: StoryDraftValues) {
  return {
    type: values.type,
    publicFigureId: values.publicFigureId,
    disclosureType: values.disclosureType,
    title: values.title,
    slug: values.slug,
    summary: values.summary,
    keyMomentsJson: values.keyMoments,
    contentNote: values.contentNote,
    communityPermissionConfirmed:
      values.type === "community" ? values.communityPermissionConfirmed : null,
  };
}

/**
 * Start a story. A new story is always a draft: there is no path that creates a published
 * story in one step, because there is no way for one person to be two editors.
 */
export async function createStoryDraft(values: StoryDraftValues, actorId: string) {
  return withRuleErrors(async () => {
    const story = await db.story.create({
      data: {
        ...draftData(values),
        status: "draft",
        draftedById: actorId,
        conditions: { create: values.conditionIds.map((conditionId) => ({ conditionId })) },
      },
      select: { id: true, slug: true },
    });

    // The quote names a source, and sources are added after the story exists, so a quote is
    // attached in a second step once there is something to attribute it to.
    return story;
  });
}

export async function updateStoryDraft(id: string, values: StoryDraftValues) {
  return withRuleErrors(async () => {
    const existing = await db.story.findUnique({
      where: { id },
      select: { id: true, sources: { select: { id: true } } },
    });
    if (!existing) throw new StoryRuleError("That story no longer exists.");

    if (values.quoteSourceId && !existing.sources.some((s) => s.id === values.quoteSourceId)) {
      throw new StoryRuleError(
        "A quote can only be attributed to a source on this story.",
        "quoteSourceId",
      );
    }

    return db.$transaction(async (tx) => {
      await tx.storyCondition.deleteMany({ where: { storyId: id } });
      return tx.story.update({
        where: { id },
        data: {
          ...draftData(values),
          quote: values.quote,
          quoteSourceId: values.quoteSourceId,
          conditions: { create: values.conditionIds.map((conditionId) => ({ conditionId })) },
        },
        select: { id: true, slug: true },
      });
    });
  });
}

export async function addSource(storyId: string, input: SourceInput) {
  return withRuleErrors(() =>
    db.source.create({
      data: {
        storyId,
        url: input.url,
        title: input.title,
        publisher: input.publisher,
        publishedDate: input.publishedDate,
        sourceType: input.sourceType,
      },
      select: { id: true },
    }),
  );
}

/**
 * Remove a source. The database refuses to remove the last source of a published story;
 * we check first so the editor gets a sentence rather than a failed request.
 */
export async function removeSource(sourceId: string) {
  return withRuleErrors(async () => {
    const source = await db.source.findUnique({
      where: { id: sourceId },
      select: { id: true, storyId: true, story: { select: { status: true, quoteSourceId: true } } },
    });
    if (!source) throw new StoryRuleError("That source has already been removed.");

    const remaining = await db.source.count({ where: { storyId: source.storyId } });
    if (source.story.status === "published" && remaining <= 1) {
      throw new StoryRuleError(
        "This is the only source on a published story, so it cannot be removed. Retract the story first.",
        "sources",
      );
    }

    return db.$transaction(async (tx) => {
      if (source.story.quoteSourceId === sourceId) {
        // The quote loses its attribution with the source, so it goes too. A quote with
        // nothing behind it is exactly what we promised never to publish.
        await tx.story.update({
          where: { id: source.storyId },
          data: { quote: null, quoteSourceId: null },
        });
      }
      await tx.source.delete({ where: { id: sourceId } });
      return { storyId: source.storyId };
    });
  });
}

/** Step one of two: the drafter hands the story to someone else. */
export async function submitForReview(storyId: string) {
  return withRuleErrors(async () => {
    const story = await db.story.findUnique({
      where: { id: storyId },
      select: { status: true, draftedById: true, _count: { select: { sources: true } } },
    });
    if (!story) throw new StoryRuleError("That story no longer exists.");
    if (story.status !== "draft") {
      throw new StoryRuleError("Only a draft can be sent for review.");
    }
    if (story._count.sources === 0) {
      throw new StoryRuleError(
        "Add at least one source before sending this for review. Every story needs one.",
        "sources",
      );
    }

    return db.story.update({
      where: { id: storyId },
      data: { status: "in_review" },
      select: { id: true, status: true },
    });
  });
}

/**
 * Back to the drafter, with no fuss and no separate "rejected" state. A retracted story
 * comes back this way too, and then goes round the two-step publishing loop again from the
 * beginning — being published once does not buy a shortcut the second time.
 */
export async function returnToDraft(storyId: string) {
  return withRuleErrors(async () => {
    const story = await db.story.findUnique({ where: { id: storyId }, select: { status: true } });
    if (!story) throw new StoryRuleError("That story no longer exists.");
    if (story.status !== "in_review" && story.status !== "retracted") {
      throw new StoryRuleError(
        "Only a story in review, or one that has been retracted, can be moved back to draft.",
      );
    }
    return db.story.update({
      where: { id: storyId },
      data: { status: "draft" },
      select: { id: true, status: true },
    });
  });
}

/**
 * Step two of two: a different editor checks the sources and publishes.
 *
 * The drafter cannot do this, and neither can anyone else without at least one source on
 * the record. Both rules are also database constraints — this is the friendly copy, not
 * the enforcement.
 */
export async function verifyAndPublish(storyId: string, actorId: string) {
  return withRuleErrors(async () => {
    const story = await db.story.findUnique({
      where: { id: storyId },
      select: {
        status: true,
        type: true,
        draftedById: true,
        communityPermissionConfirmed: true,
        _count: { select: { sources: true } },
      },
    });
    if (!story) throw new StoryRuleError("That story no longer exists.");

    if (story.status !== "in_review") {
      throw new StoryRuleError(
        "Only a story that has been sent for review can be published. Ask the drafter to send it for review first.",
      );
    }
    if (story.draftedById === actorId) {
      throw new StoryRuleError(
        "You drafted this story, so you cannot be the one to verify it. Another editor has to check the sources and publish it.",
      );
    }
    if (story._count.sources === 0) {
      throw new StoryRuleError(
        "A story cannot be published without at least one source.",
        "sources",
      );
    }
    if (story.type === "community" && story.communityPermissionConfirmed !== true) {
      throw new StoryRuleError(
        "A community story can only be published once written permission from the person has been confirmed.",
        "communityPermissionConfirmed",
      );
    }

    const now = new Date();
    return db.story.update({
      where: { id: storyId },
      data: {
        status: "published",
        verifiedById: actorId,
        publishedAt: now,
        lastReviewedAt: now,
        retractedAt: null,
        retractionReason: null,
      },
      select: { id: true, slug: true, status: true },
    });
  });
}

/**
 * Take a story down. Immediately: the public queries only ever read `published`, so the
 * next request to any surface — index, search, condition page, related stories, sitemap,
 * the person's own page — no longer finds it.
 */
export async function retractStory(storyId: string, reason: string) {
  return withRuleErrors(async () => {
    const story = await db.story.findUnique({ where: { id: storyId }, select: { status: true } });
    if (!story) throw new StoryRuleError("That story no longer exists.");
    if (story.status === "retracted") {
      throw new StoryRuleError("This story has already been retracted.");
    }
    if (!reason.trim()) {
      throw new StoryRuleError("Record why this story is being taken down.", "reason");
    }

    return db.story.update({
      where: { id: storyId },
      data: {
        status: "retracted",
        retractedAt: new Date(),
        retractionReason: reason.trim(),
        // `verifiedById` and `publishedAt` stay. Brief 5.2 asks us to record who did what
        // and when, and that includes a story we later took down.
      },
      select: { id: true, status: true },
    });
  });
}

/** The twelve-month check: an editor has looked at it again and it still stands. */
export async function markReviewed(storyId: string) {
  return withRuleErrors(async () => {
    const story = await db.story.findUnique({ where: { id: storyId }, select: { status: true } });
    if (!story) throw new StoryRuleError("That story no longer exists.");
    if (story.status !== "published") {
      throw new StoryRuleError("Only a published story is in the review cycle.");
    }
    return db.story.update({
      where: { id: storyId },
      data: { lastReviewedAt: new Date() },
      select: { id: true, lastReviewedAt: true },
    });
  });
}
