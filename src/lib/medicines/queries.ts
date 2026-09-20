import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

/**
 * Every public read of the medicines hub.
 *
 * Two rules run through all of it.
 *
 * **Only `status = "published"` stories are ever counted or listed.** Same promise as the
 * stories hub: a draft, a story in review, or a retracted one appears nowhere, on the next
 * request, with no cache and no denormalised copy to go stale. Retracting a story takes it
 * off the medicine page immediately — tested in tests/unit/medicine-visibility.test.ts.
 *
 * **Only a medicine an editor has written up is public at all.** `Intervention` rows are
 * created two ways: by an editor here, and by `findOrCreateIntervention` when a person logs
 * a treatment in their own tracking (DECISIONS.md D-043). The second kind is somebody's
 * private medicine cabinet and must never appear on a public index. The marker that
 * separates them is the plain-English `summary`: a person logging a treatment never writes
 * one, and a medicine cannot be published without one, because a name on its own tells a
 * frightened reader nothing. A slug is required too, since without one there is no page.
 * See DECISIONS.md D-046 — this is the medicines equivalent of "an unverified charity is
 * never publicly visible".
 */

/** A medicine is public only when an editor has given it a page and written what it is. */
const PUBLISHABLE = {
  slug: { not: null },
  summary: { not: null },
} satisfies Prisma.InterventionWhereInput;

const PUBLISHED_STORY = { story: { status: "published" } } as const;

export type MedicineType = "rx" | "otc" | "supplement" | "device" | "non_drug";

export const MEDICINE_TYPE_LABELS: Record<MedicineType, string> = {
  rx: "Prescription medicine",
  otc: "Available without a prescription",
  supplement: "Supplement",
  device: "Device",
  non_drug: "Treatment, not a medicine",
};

export interface MedicineCard {
  id: string;
  name: string;
  slug: string;
  type: MedicineType;
  summary: string;
  isSensitiveTopic: boolean;
  /** Published stories only. */
  storyCount: number;
}

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  type: true,
  summary: true,
  isSensitiveTopic: true,
  _count: { select: { stories: { where: PUBLISHED_STORY } } },
} satisfies Prisma.InterventionSelect;

type CardRow = Prisma.InterventionGetPayload<{ select: typeof cardSelect }>;

function toCard(row: CardRow): MedicineCard {
  return {
    id: row.id,
    name: row.name,
    // Both are guaranteed by PUBLISHABLE; the assertions are for the type system only.
    slug: row.slug as string,
    type: row.type,
    summary: row.summary as string,
    isSensitiveTopic: row.isSensitiveTopic,
    storyCount: row._count.stories,
  };
}

/** The public index, alphabetical — there is no ranking of medicines and never will be. */
export async function listPublicMedicines(): Promise<MedicineCard[]> {
  const rows = await db.intervention.findMany({
    where: PUBLISHABLE,
    select: cardSelect,
    orderBy: { name: "asc" },
  });
  return rows.map(toCard);
}

export interface MedicineSource {
  id: string;
  url: string;
  title: string;
  publisher: string;
  publishedDate: Date | null;
}

/** One published story that talked about this medicine. */
export interface MedicineStory {
  id: string;
  slug: string;
  title: string;
  figureName: string | null;
  publishedAt: Date | null;
  /** How they came to it, in our own words. Never a dose. */
  context: string | null;
  /** Where the claim that they took it comes from. Null is a gap, not a default. */
  source: MedicineSource | null;
  conditions: { name: string; slug: string }[];
}

export interface MedicineDetail extends MedicineCard {
  stories: MedicineStory[];
  /** The conditions these stories are about, most common first. */
  conditions: { name: string; slug: string; storyCount: number }[];
}

/** One medicine, or null. A medicine with no summary is a null here, not a thin page. */
export async function getPublicMedicine(slug: string): Promise<MedicineDetail | null> {
  const row = await db.intervention.findFirst({
    // The spread comes first: `PUBLISHABLE` carries its own `slug` clause, and spreading it
    // after the lookup slug would silently replace it and serve an arbitrary medicine at
    // every address. Caught by tests/unit/medicine-visibility.test.ts.
    where: { ...PUBLISHABLE, slug },
    select: {
      ...cardSelect,
      stories: {
        where: PUBLISHED_STORY,
        select: {
          context: true,
          source: {
            select: { id: true, url: true, title: true, publisher: true, publishedDate: true },
          },
          story: {
            select: {
              id: true,
              slug: true,
              title: true,
              publishedAt: true,
              publicFigure: { select: { name: true } },
              conditions: { select: { condition: { select: { name: true, slug: true } } } },
            },
          },
        },
        orderBy: { story: { publishedAt: "desc" } },
      },
    },
  });

  if (!row) return null;

  const stories: MedicineStory[] = row.stories.map((link) => ({
    id: link.story.id,
    slug: link.story.slug,
    title: link.story.title,
    figureName: link.story.publicFigure?.name ?? null,
    publishedAt: link.story.publishedAt,
    context: link.context,
    source: link.source,
    conditions: link.story.conditions.map((c) => c.condition),
  }));

  // Which conditions this medicine keeps coming up alongside. Counted from the published
  // stories and nothing else, so it is a description of what people have said here — not a
  // claim that the medicine treats any of them.
  const counts = new Map<string, { name: string; slug: string; storyCount: number }>();
  for (const story of stories) {
    for (const condition of story.conditions) {
      const existing = counts.get(condition.slug);
      if (existing) existing.storyCount += 1;
      else counts.set(condition.slug, { ...condition, storyCount: 1 });
    }
  }

  return {
    ...toCard(row),
    stories,
    conditions: [...counts.values()].sort(
      (a, b) => b.storyCount - a.storyCount || a.name.localeCompare(b.name),
    ),
  };
}

/** A medicine as it appears on a story page. */
export interface StoryMedicine {
  id: string;
  name: string;
  /** Null when this medicine has no public page — then the name is plain text, not a link. */
  slug: string | null;
  type: MedicineType;
  isSensitiveTopic: boolean;
  context: string | null;
  source: MedicineSource | null;
}

/**
 * The medicines one published story is about.
 *
 * Takes a story id and checks the status itself rather than trusting the caller: this is a
 * public read, and a public read that depends on its caller having checked is a retraction
 * bug waiting to happen.
 */
export async function medicinesForPublishedStory(storyId: string): Promise<StoryMedicine[]> {
  const rows = await db.storyIntervention.findMany({
    where: { storyId, story: { status: "published" } },
    select: {
      context: true,
      source: { select: { id: true, url: true, title: true, publisher: true, publishedDate: true } },
      intervention: {
        select: { id: true, name: true, slug: true, summary: true, type: true, isSensitiveTopic: true },
      },
    },
    orderBy: { intervention: { name: "asc" } },
  });

  return rows.map((row) => ({
    id: row.intervention.id,
    name: row.intervention.name,
    // A medicine with no summary has no page, so there is nothing to link to.
    slug: row.intervention.summary ? row.intervention.slug : null,
    type: row.intervention.type,
    isSensitiveTopic: row.intervention.isSensitiveTopic,
    context: row.context,
    source: row.source,
  }));
}

/**
 * The medicines several published stories are about, keyed by story id.
 *
 * The same read as `medicinesForPublishedStory`, for a surface that shows a list of stories
 * rather than one — the front page grid asks for every card at once rather than opening a
 * query per card. Six cards made a query each invisible; forty would not. The published
 * check is still made here, on every row, rather than being taken on trust from the caller.
 *
 * A story with no medicines is absent from the map, not an empty array, so callers read it
 * with `?? []` and cannot tell "nothing recorded" apart from "not asked for" by accident.
 */
export async function medicinesForPublishedStories(
  storyIds: string[],
): Promise<Map<string, StoryMedicine[]>> {
  const byStory = new Map<string, StoryMedicine[]>();
  if (storyIds.length === 0) return byStory;

  const rows = await db.storyIntervention.findMany({
    where: { storyId: { in: storyIds }, story: { status: "published" } },
    select: {
      storyId: true,
      context: true,
      source: { select: { id: true, url: true, title: true, publisher: true, publishedDate: true } },
      intervention: {
        select: { id: true, name: true, slug: true, summary: true, type: true, isSensitiveTopic: true },
      },
    },
    orderBy: { intervention: { name: "asc" } },
  });

  for (const row of rows) {
    const medicines = byStory.get(row.storyId) ?? [];
    medicines.push({
      id: row.intervention.id,
      name: row.intervention.name,
      // A medicine with no summary has no page, so there is nothing to link to.
      slug: row.intervention.summary ? row.intervention.slug : null,
      type: row.intervention.type,
      isSensitiveTopic: row.intervention.isSensitiveTopic,
      context: row.context,
      source: row.source,
    });
    byStory.set(row.storyId, medicines);
  }

  return byStory;
}

/** Paths for the sitemap. Published-only, for the same reason as everything else here. */
export async function publicMedicinePaths(): Promise<{ path: string; lastModified: Date }[]> {
  const rows = await db.intervention.findMany({
    where: PUBLISHABLE,
    select: { slug: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => ({ path: `/medicines/${row.slug}`, lastModified: row.updatedAt }));
}
