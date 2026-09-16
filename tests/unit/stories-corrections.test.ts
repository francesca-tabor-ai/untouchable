// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { editorialCounts } from "@/lib/stories/editorial";
import { takedownRequestSchema } from "@/lib/stories/schemas";
import {
  createTakedownRequest,
  listTakedownRequests,
  resolveTakedownRequest,
} from "@/lib/stories/takedowns";

import { resetDatabase, testDb } from "../helpers/db";
import { makeDraft, makeFixtures, publishViaWorkflow, type StoryFixtures } from "./stories-fixtures";

/**
 * Corrections and removals. Brief 5.2: anyone can ask — the person in the story, their
 * representative, or a reader — and a request creates an admin task.
 */
describe("a correction or removal request from a member of the public", () => {
  let fixtures: StoryFixtures;
  let story: { id: string; slug: string };

  beforeEach(async () => {
    await resetDatabase();
    fixtures = await makeFixtures();
    story = await makeDraft(fixtures);
    await publishViaWorkflow(fixtures, story.id);
  });

  afterAll(async () => {
    await testDb.$disconnect();
  });

  const request = (overrides: Record<string, unknown> = {}) => ({
    storyId: story.id,
    type: "removal" as const,
    requesterName: "Invented Requester",
    requesterEmail: "someone@example.test",
    relationship: "the person in the story",
    reason: "I would rather this was not here. Please take it down.",
    ...overrides,
  });

  it("creates an open task for the editorial team", async () => {
    const created = await createTakedownRequest(takedownRequestSchema.parse(request()));

    expect(created.status).toBe("open");

    const queue = await listTakedownRequests("open");
    expect(queue).toHaveLength(1);
    expect(queue[0].story.id).toBe(story.id);
    expect(queue[0].relationship).toBe("the person in the story");

    const counts = await editorialCounts();
    expect(counts.openRequests).toBe(1);
  });

  it("takes a request from a reader, not only from the person in the story", async () => {
    const created = await createTakedownRequest(
      takedownRequestSchema.parse(
        request({
          type: "correction",
          relationship: "a reader",
          reason: "The date in the second paragraph does not match the source you have linked.",
        }),
      ),
    );

    expect(created.type).toBe("correction");
  });

  it("changes nothing about the story on its own", async () => {
    await createTakedownRequest(takedownRequestSchema.parse(request()));

    const after = await testDb.story.findUniqueOrThrow({ where: { id: story.id } });
    expect(after.status).toBe("published");
  });

  it("refuses a request about a story that is not published", async () => {
    const draft = await makeDraft(fixtures);

    await expect(
      createTakedownRequest(takedownRequestSchema.parse(request({ storyId: draft.id }))),
    ).rejects.toThrow(/could not find that story/i);
  });

  it("records what was decided, and refuses to decide twice", async () => {
    const created = await createTakedownRequest(takedownRequestSchema.parse(request()));

    const resolved = await resolveTakedownRequest({
      requestId: created.id,
      status: "actioned",
      resolutionNote: "Checked against the source and retracted the story the same day.",
    });
    expect(resolved.status).toBe("actioned");

    const row = await testDb.takedownRequest.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.resolvedAt).not.toBeNull();

    await expect(
      resolveTakedownRequest({
        requestId: created.id,
        status: "declined",
        resolutionNote: "A second opinion, too late.",
      }),
    ).rejects.toThrow(/already dealt with/i);
  });

  it("keeps a declined request on the record with the reason", async () => {
    const created = await createTakedownRequest(
      takedownRequestSchema.parse(request({ type: "correction" })),
    );

    await resolveTakedownRequest({
      requestId: created.id,
      status: "declined",
      resolutionNote: "The story matches the source word for word. We wrote back explaining that.",
    });

    const closed = await listTakedownRequests("declined");
    expect(closed).toHaveLength(1);
    expect(closed[0].resolutionNote).toMatch(/matches the source/);
  });
});

describe("the public form's own checks", () => {
  it("asks for an email address it can actually reply to", () => {
    const parsed = takedownRequestSchema.safeParse({
      storyId: "some-id",
      type: "removal",
      requesterName: "Invented Requester",
      requesterEmail: "not-an-address",
      relationship: "a reader",
      reason: "Something is wrong with this story.",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === "requesterEmail")).toBe(true);
  });

  it("asks what is actually wrong", () => {
    const parsed = takedownRequestSchema.safeParse({
      storyId: "some-id",
      type: "correction",
      requesterName: "Invented Requester",
      requesterEmail: "someone@example.test",
      relationship: "a reader",
      reason: "no",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues.some((issue) => issue.path[0] === "reason")).toBe(true);
  });
});
