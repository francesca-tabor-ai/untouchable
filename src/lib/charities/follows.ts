import { db } from "@/lib/db";

import { publicCharitySelect, publicCharityWhere, type PublicCharity } from "./queries";

/**
 * Following a charity.
 *
 * **A follow is health data.** Someone following a single-condition charity has effectively
 * told us their diagnosis. Follows are visible to the person who made them and to nobody
 * else: not to charities, not to other users, not to admins, and never in the referral
 * report or any research export. Brief 6.4, docs/privacy.md.
 *
 * Nothing here takes an "on behalf of" argument. Every function is scoped to one user id,
 * supplied by an auth guard at the call site.
 */

export interface FollowedCharity {
  charity: PublicCharity;
  followedAt: Date;
}

/** The causes one person follows. Only ever called with the signed-in person's own id. */
export async function followedCharities(userId: string): Promise<FollowedCharity[]> {
  const rows = await db.charityFollow.findMany({
    where: { userId, charity: publicCharityWhere },
    select: { createdAt: true, charity: { select: publicCharitySelect } },
    orderBy: { charity: { name: "asc" } },
  });

  return rows.map((row) => ({ charity: row.charity, followedAt: row.createdAt }));
}

export async function isFollowing(userId: string, charityId: string): Promise<boolean> {
  const follow = await db.charityFollow.findUnique({
    where: { userId_charityId: { userId, charityId } },
    select: { userId: true },
  });
  return follow !== null;
}

/**
 * Start following. A charity that is not publicly visible cannot be followed — otherwise an
 * unverified listing would reappear through the back door of someone's account page.
 */
export async function followCharity(userId: string, charityId: string): Promise<void> {
  const charity = await db.charity.findFirst({
    where: { ...publicCharityWhere, id: charityId },
    select: { id: true },
  });
  if (!charity) return;

  await db.charityFollow.upsert({
    where: { userId_charityId: { userId, charityId } },
    update: {},
    create: { userId, charityId },
  });
}

export async function unfollowCharity(userId: string, charityId: string): Promise<void> {
  await db.charityFollow.deleteMany({ where: { userId, charityId } });
}

/**
 * Follower counts exist nowhere in this module on purpose. A charity never learns who — or
 * how many — of our users follow it, because a follower count for a single-condition charity
 * is a count of people with that diagnosis. If a partner dashboard is built later (brief
 * 6.5), it reports referral clicks, which are anonymous, and nothing else.
 */
