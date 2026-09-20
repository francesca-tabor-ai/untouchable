import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

import { needsContentNote } from "./safety";

import { parseKeyMoments, type KeyMoment } from "./key-moments";

/**
 * Every public read of the stories hub.
 *
 * One rule runs through all of it: **only `status = "published"` ever leaves this module.**
 * A story that is a draft, in review, or retracted does not appear in a list, a search, a
 * condition page, a related-stories block or the sitemap. Retraction is therefore immediate
 * — there is no cache and no denormalised copy to go stale (DECISIONS.md D-013).
 */

const PUBLISHED = { status: "published" } as const;

const cardSelect = {
  id: true,
  slug: true,
  title: true,
  summary: true,
  type: true,
  disclosureType: true,
  contentNote: true,
  needsSupportSignposting: true,
  publishedAt: true,
  publicFigure: { select: { name: true, slug: true, imageUrl: true, imageLicence: true } },
  conditions: {
    select: { condition: { select: { name: true, slug: true, isSensitiveTopic: true } } },
  },
} satisfies Prisma.StorySelect;

type CardRow = Prisma.StoryGetPayload<{ select: typeof cardSelect }>;

export interface StoryCard {
  id: string;
  slug: string;
  title: string;
  summary: string;
  type: "public_figure" | "community";
  disclosureType: "own" | "loved_one";
  figure: { name: string; slug: string; imageUrl: string | null; imageLicence: string | null } | null;
  conditions: { name: string; slug: string; isSensitiveTopic: boolean }[];
  publishedAt: Date | null;
  /** True when the story carries a content note or touches a sensitive topic. */
  needsContentNote: boolean;
}

function toCard(row: CardRow): StoryCard {
  const conditions = row.conditions.map((link) => link.condition);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    type: row.type,
    disclosureType: row.disclosureType,
    figure: row.publicFigure,
    conditions,
    publishedAt: row.publishedAt,
    // Through the shared decision, never re-derived here: a card, a condition page and a
    // story page must never disagree about whether a warning is needed.
    needsContentNote: needsContentNote({
      conditions,
      contentNote: row.contentNote,
      needsSupportSignposting: row.needsSupportSignposting,
    }),
  };
}

export interface StoryListFilters {
  /** Free text: a person's name, a condition, or words in the story. */
  q?: string;
  /** A condition slug. */
  condition?: string;
  take?: number;
}

function listWhere({ q, condition }: StoryListFilters): Prisma.StoryWhereInput {
  const where: Prisma.StoryWhereInput = { ...PUBLISHED };

  if (condition) {
    where.conditions = { some: { condition: { slug: condition } } };
  }

  if (q) {
    const contains = { contains: q, mode: "insensitive" } as const;
    where.OR = [
      { title: contains },
      { summary: contains },
      { publicFigure: { name: contains } },
      { conditions: { some: { condition: { name: contains } } } },
    ];
  }

  return where;
}

/** The public story index. Newest first, because a hub with no order feels abandoned. */
export async function listPublishedStories(filters: StoryListFilters = {}): Promise<StoryCard[]> {
  const rows = await db.story.findMany({
    where: listWhere(filters),
    select: cardSelect,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: filters.take ?? 60,
  });
  return rows.map(toCard);
}

export async function countPublishedStories(filters: StoryListFilters = {}): Promise<number> {
  return db.story.count({ where: listWhere(filters) });
}

export interface StorySource {
  id: string;
  url: string;
  title: string;
  publisher: string;
  publishedDate: Date | null;
  sourceType: "interview" | "own_social" | "book" | "podcast" | "statement" | "article";
}

export interface PublicStory extends StoryCard {
  keyMoments: KeyMoment[];
  quote: string | null;
  quoteSource: StorySource | null;
  contentNote: string | null;
  needsSupportSignposting: boolean;
  sources: StorySource[];
  lastReviewedAt: Date | null;
}

/** One published story, or null. A retracted story is a null here, not a tombstone. */
export async function getPublishedStory(slug: string): Promise<PublicStory | null> {
  const row = await db.story.findFirst({
    where: { slug, ...PUBLISHED },
    select: {
      ...cardSelect,
      keyMomentsJson: true,
      quote: true,
      quoteSourceId: true,
      lastReviewedAt: true,
      sources: {
        select: {
          id: true,
          url: true,
          title: true,
          publisher: true,
          publishedDate: true,
          sourceType: true,
        },
        orderBy: [{ publishedDate: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!row) return null;

  const sources = row.sources;
  return {
    ...toCard(row),
    keyMoments: parseKeyMoments(row.keyMomentsJson),
    quote: row.quote,
    quoteSource: sources.find((source) => source.id === row.quoteSourceId) ?? null,
    contentNote: row.contentNote,
    needsSupportSignposting: row.needsSupportSignposting,
    sources,
    lastReviewedAt: row.lastReviewedAt,
  };
}

/**
 * Other published stories that touch the same conditions. Used at the foot of a story and
 * nowhere else, so the limit is small on purpose.
 */
export async function getRelatedStories(
  storyId: string,
  conditionSlugs: string[],
  take = 3,
): Promise<StoryCard[]> {
  if (conditionSlugs.length === 0) return [];

  const rows = await db.story.findMany({
    where: {
      ...PUBLISHED,
      id: { not: storyId },
      conditions: { some: { condition: { slug: { in: conditionSlugs } } } },
    },
    select: cardSelect,
    orderBy: [{ publishedAt: "desc" }],
    take,
  });
  return rows.map(toCard);
}

export interface ConditionSummary {
  id: string;
  name: string;
  slug: string;
  summary: string;
  isSensitiveTopic: boolean;
  storyCount: number;
}

/** Every condition, with how many published stories sit behind it. */
export async function listConditions(): Promise<ConditionSummary[]> {
  const rows = await db.condition.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      summary: true,
      isSensitiveTopic: true,
      _count: { select: { stories: { where: { story: PUBLISHED } } } },
    },
  });

  return rows.map(({ _count, ...condition }) => ({ ...condition, storyCount: _count.stories }));
}

export async function getCondition(slug: string): Promise<ConditionSummary | null> {
  const row = await db.condition.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      summary: true,
      isSensitiveTopic: true,
      _count: { select: { stories: { where: { story: PUBLISHED } } } },
    },
  });
  if (!row) return null;
  const { _count, ...condition } = row;
  return { ...condition, storyCount: _count.stories };
}

export interface PublicFigureProfile {
  id: string;
  name: string;
  slug: string;
  shortBio: string;
  isDeceased: boolean;
  conditions: { name: string; slug: string }[];
}

/**
 * A public figure, shown only when at least one of their stories is published. Retracting
 * someone's only story takes their page down with it — otherwise the page would keep
 * asserting that we hold something about their health.
 */
export async function getPublicFigure(
  slug: string,
): Promise<{ figure: PublicFigureProfile; stories: StoryCard[] } | null> {
  const figure = await db.publicFigure.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, shortBio: true, isDeceased: true },
  });
  if (!figure) return null;

  const rows = await db.story.findMany({
    where: { ...PUBLISHED, publicFigureId: figure.id },
    select: cardSelect,
    orderBy: [{ publishedAt: "desc" }],
  });
  if (rows.length === 0) return null;

  const stories = rows.map(toCard);
  const conditions = new Map<string, { name: string; slug: string }>();
  for (const story of stories) {
    for (const condition of story.conditions) conditions.set(condition.slug, condition);
  }

  return { figure: { ...figure, conditions: [...conditions.values()] }, stories };
}

/** Slugs for the sitemap. Published only, for the same reason as everything else here. */
export async function publishedStoryPaths(): Promise<
  { path: string; lastModified: Date }[]
> {
  const [stories, figures, conditions] = await Promise.all([
    db.story.findMany({
      where: PUBLISHED,
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: "desc" },
    }),
    db.publicFigure.findMany({
      where: { stories: { some: PUBLISHED } },
      select: { slug: true, updatedAt: true },
    }),
    db.condition.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  return [
    ...stories.map((s) => ({ path: `/stories/${s.slug}`, lastModified: s.updatedAt })),
    ...figures.map((f) => ({ path: `/public-figures/${f.slug}`, lastModified: f.updatedAt })),
    ...conditions.map((c) => ({ path: `/conditions/${c.slug}`, lastModified: c.updatedAt })),
  ];
}

/** Published stories as options for the public correction form. */
export async function listStoriesForCorrectionForm(): Promise<
  { id: string; title: string; figureName: string | null }[]
> {
  const rows = await db.story.findMany({
    where: PUBLISHED,
    select: { id: true, title: true, publicFigure: { select: { name: true } } },
    orderBy: { title: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    figureName: row.publicFigure?.name ?? null,
  }));
}
