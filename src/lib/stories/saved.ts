import { db } from "@/lib/db";

import { StoryRuleError } from "./errors";

/**
 * Saving a story.
 *
 * What someone saves says something about their health, so it is theirs alone: a saved
 * story is never shown to anyone else and never counted in public. Signed-out visitors are
 * invited to join, never blocked from reading.
 */

export async function isStorySaved(userId: string, storyId: string): Promise<boolean> {
  const row = await db.savedStory.findUnique({
    where: { userId_storyId: { userId, storyId } },
    select: { storyId: true },
  });
  return row !== null;
}

/** Save if it is not saved, remove it if it is. Returns the state afterwards. */
export async function toggleSavedStory(userId: string, storyId: string): Promise<boolean> {
  const story = await db.story.findFirst({
    where: { id: storyId, status: "published" },
    select: { id: true },
  });
  if (!story) throw new StoryRuleError("That story is no longer available.");

  const existing = await db.savedStory.findUnique({
    where: { userId_storyId: { userId, storyId } },
    select: { storyId: true },
  });

  if (existing) {
    await db.savedStory.delete({ where: { userId_storyId: { userId, storyId } } });
    return false;
  }

  await db.savedStory.create({ data: { userId, storyId } });
  return true;
}

/** The stories someone has saved. Published only — a retracted story leaves every list. */
export async function listSavedStories(userId: string) {
  const rows = await db.savedStory.findMany({
    where: { userId, story: { status: "published" } },
    select: {
      createdAt: true,
      story: { select: { id: true, slug: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({ ...row.story, savedAt: row.createdAt }));
}
