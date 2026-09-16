import { db } from "@/lib/db";

import { StoryRuleError, withRuleErrors } from "./errors";
import type { TakedownRequestInput } from "./schemas";

/**
 * Corrections and removals.
 *
 * Anyone can ask: the person the story is about, someone representing them, or a reader who
 * has spotted something wrong. A request creates an open task for the editorial team —
 * brief 5.2. It never publishes anything or changes a story on its own.
 */

export async function createTakedownRequest(input: TakedownRequestInput) {
  return withRuleErrors(async () => {
    // A request can only be about a story that is actually public. Anything else would let
    // the form be used to find out whether a draft exists.
    const story = await db.story.findFirst({
      where: { id: input.storyId, status: "published" },
      select: { id: true, title: true },
    });
    if (!story) {
      throw new StoryRuleError(
        "We could not find that story. It may already have been taken down.",
        "storyId",
      );
    }

    return db.takedownRequest.create({
      data: {
        storyId: story.id,
        type: input.type,
        requesterName: input.requesterName,
        requesterEmail: input.requesterEmail,
        relationship: input.relationship,
        reason: input.reason,
        status: "open",
      },
      select: { id: true, type: true, status: true },
    });
  });
}

const requestSelect = {
  id: true,
  type: true,
  status: true,
  requesterName: true,
  requesterEmail: true,
  relationship: true,
  reason: true,
  resolutionNote: true,
  resolvedAt: true,
  createdAt: true,
  story: { select: { id: true, title: true, slug: true, status: true } },
} as const;

export async function listTakedownRequests(status?: "open" | "actioned" | "declined") {
  return db.takedownRequest.findMany({
    where: status ? { status } : {},
    select: requestSelect,
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    take: 200,
  });
}

export async function getTakedownRequest(id: string) {
  return db.takedownRequest.findUnique({ where: { id }, select: requestSelect });
}

export async function resolveTakedownRequest(params: {
  requestId: string;
  status: "actioned" | "declined";
  resolutionNote: string;
}) {
  return withRuleErrors(async () => {
    const existing = await db.takedownRequest.findUnique({
      where: { id: params.requestId },
      select: { status: true },
    });
    if (!existing) throw new StoryRuleError("That request no longer exists.");
    if (existing.status !== "open") {
      throw new StoryRuleError("Somebody has already dealt with this request.");
    }

    return db.takedownRequest.update({
      where: { id: params.requestId },
      data: {
        status: params.status,
        resolutionNote: params.resolutionNote,
        resolvedAt: new Date(),
      },
      select: { id: true, status: true },
    });
  });
}
