import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

/**
 * Reading charities.
 *
 * **Every public read goes through this file.** The rule that an unverified charity is never
 * publicly visible (AGENTS.md rule 4, brief 6.6) is enforced here, in the query, not in a
 * component — a page cannot show an unverified charity by forgetting a check, because the
 * row never reaches it. `publicCharityWhere` is exported so tests can assert the shape of
 * the filter as well as its effect.
 */

/**
 * The filter that makes a listing public: an editor verified it, and it has not been
 * withdrawn. `verifiedAt` and `verifiedById` are required together by a database
 * constraint, so both are checked here rather than trusting one to imply the other.
 */
export const publicCharityWhere = {
  active: true,
  verifiedAt: { not: null },
  verifiedById: { not: null },
} satisfies Prisma.CharityWhereInput;

export const publicCharitySelect = {
  id: true,
  name: true,
  slug: true,
  registeredNumber: true,
  regulator: true,
  websiteUrl: true,
  donationUrl: true,
  description: true,
  logoUrl: true,
  logoPermission: true,
  verifiedAt: true,
} satisfies Prisma.CharitySelect;

export type PublicCharity = Prisma.CharityGetPayload<{ select: typeof publicCharitySelect }>;

export type PublicCharityWithConditions = PublicCharity & {
  conditions: { condition: { id: string; name: string; slug: string } }[];
};

const byName = { name: "asc" } satisfies Prisma.CharityOrderByWithRelationInput;

/**
 * Defence in depth. The query above already excludes unverified listings; this re-checks
 * anything on its way out, so a future refactor that loosens the filter fails loudly here
 * rather than quietly publishing a charity nobody checked.
 */
function assertVerified<T extends { verifiedAt: Date | null; slug: string }>(rows: T[]): T[] {
  for (const row of rows) {
    if (!row.verifiedAt) {
      throw new Error(
        `Refusing to show charity "${row.slug}": no editor has verified it against the register.`,
      );
    }
  }
  return rows;
}

/** The public directory, optionally narrowed to one condition. */
export async function listPublicCharities(
  options: { conditionSlug?: string | null } = {},
): Promise<PublicCharity[]> {
  const conditionSlug = options.conditionSlug?.trim() || null;

  const rows = await db.charity.findMany({
    where: {
      ...publicCharityWhere,
      ...(conditionSlug ? { conditions: { some: { condition: { slug: conditionSlug } } } } : {}),
    },
    select: publicCharitySelect,
    orderBy: byName,
  });

  return assertVerified(rows);
}

/** One public listing, or null. Null covers "does not exist" and "not verified" alike. */
export async function getPublicCharity(slug: string): Promise<PublicCharityWithConditions | null> {
  const charity = await db.charity.findFirst({
    where: { ...publicCharityWhere, slug },
    select: {
      ...publicCharitySelect,
      conditions: {
        select: { condition: { select: { id: true, name: true, slug: true } } },
        orderBy: { condition: { name: "asc" } },
      },
    },
  });

  if (!charity) return null;
  return assertVerified([charity])[0];
}

/** Just the donation URL, for the hand-off. Null if the charity is not publicly visible. */
export async function getPublicCharityDonationTarget(
  slug: string,
): Promise<{ id: string; name: string; donationUrl: string } | null> {
  return db.charity.findFirst({
    where: { ...publicCharityWhere, slug },
    select: { id: true, name: true, donationUrl: true },
  });
}

/** Verified charities tagged with a condition. Used on condition pages. */
export async function charitiesForCondition(conditionId: string): Promise<PublicCharity[]> {
  if (!conditionId) return [];

  const rows = await db.charity.findMany({
    where: { ...publicCharityWhere, conditions: { some: { conditionId } } },
    select: publicCharitySelect,
    orderBy: byName,
  });

  return assertVerified(rows);
}

export interface StoryCharityLink {
  charity: PublicCharity;
  /**
   * The source for the claim that this public figure supports this charity. Null means there
   * is no source, and the link must not be presented as a claim about that person.
   */
  source: {
    id: string;
    url: string;
    title: string;
    publisher: string;
    publishedDate: Date | null;
  } | null;
}

/**
 * Charities linked to a story.
 *
 * A claim that a named person supports a charity is a factual claim about them, so the link
 * carries its own source (schema: `StoryCharity.sourceId`). Rows with no source are still
 * returned — the charity is relevant to the condition — but the caller must not render them
 * as that person's support. See `StoryCharities` in src/components/charities.
 */
export async function charitiesForStory(storyId: string): Promise<StoryCharityLink[]> {
  if (!storyId) return [];

  const rows = await db.storyCharity.findMany({
    where: { storyId, charity: publicCharityWhere },
    select: {
      charity: { select: publicCharitySelect },
      source: {
        select: { id: true, url: true, title: true, publisher: true, publishedDate: true },
      },
    },
    orderBy: { charity: { name: "asc" } },
  });

  assertVerified(rows.map((row) => row.charity));
  return rows;
}

/** Conditions that have at least one publicly visible charity — the directory's filter. */
export async function charityConditionFilters(): Promise<
  { id: string; name: string; slug: string; charityCount: number }[]
> {
  const links = await db.charityCondition.findMany({
    where: { charity: publicCharityWhere },
    select: { condition: { select: { id: true, name: true, slug: true } } },
  });

  const tally = new Map<string, { id: string; name: string; slug: string; charityCount: number }>();
  for (const { condition } of links) {
    const existing = tally.get(condition.id);
    if (existing) existing.charityCount += 1;
    else tally.set(condition.id, { ...condition, charityCount: 1 });
  }

  return [...tally.values()].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
}
