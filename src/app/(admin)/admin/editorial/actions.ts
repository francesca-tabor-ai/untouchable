"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { recordAudit, requireEditor } from "@/lib/auth/guards";
import {
  addSource,
  createPublicFigure,
  createStoryDraft,
  markReviewed,
  removeSource,
  retractStory,
  returnToDraft,
  submitForReview,
  updateStoryDraft,
  verifyAndPublish,
} from "@/lib/stories/editorial";
import { StoryRuleError } from "@/lib/stories/errors";
import { parseKeyMomentsInput } from "@/lib/stories/key-moments";
import {
  fieldErrors,
  publicFigureSchema,
  sourceSchema,
  storyDraftSchema,
  takedownResolutionSchema,
} from "@/lib/stories/schemas";
import { resolveTakedownRequest } from "@/lib/stories/takedowns";

import type { EditorialFormState } from "./form-state";

/**
 * Editorial server actions.
 *
 * Each one does the same four things in the same order: authorise, validate with Zod, call
 * a domain function, record an audit entry. No editorial rule is decided here — the rules
 * live in `src/lib/stories/editorial.ts` and in the database, so that a second interface
 * onto this data cannot quietly have different rules.
 */

function ruleFailure(error: unknown): EditorialFormState {
  if (error instanceof StoryRuleError) {
    return { status: "error", errors: { [error.field ?? "form"]: error.message } };
  }
  throw error;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

const idSchema = z.object({ storyId: z.string().trim().min(1) });

function storyPaths(storyId: string) {
  revalidatePath("/admin/editorial");
  revalidatePath(`/admin/editorial/stories/${storyId}`);
}

// ---------------------------------------------------------------------------
// Drafting
// ---------------------------------------------------------------------------

function readDraft(formData: FormData) {
  return storyDraftSchema.safeParse({
    type: text(formData, "type"),
    publicFigureId: text(formData, "publicFigureId"),
    disclosureType: text(formData, "disclosureType"),
    title: text(formData, "title"),
    slug: text(formData, "slug"),
    summary: text(formData, "summary"),
    keyMoments: parseKeyMomentsInput(text(formData, "keyMoments")),
    quote: text(formData, "quote"),
    quoteSourceId: text(formData, "quoteSourceId"),
    contentNote: text(formData, "contentNote"),
    communityPermissionConfirmed: formData.get("communityPermissionConfirmed") === "on",
    conditionIds: formData.getAll("conditionIds").filter((v): v is string => typeof v === "string"),
  });
}

export async function createStoryAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();

  const parsed = readDraft(formData);
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  if (parsed.data.quote) {
    return {
      status: "error",
      errors: {
        quote:
          "Add the story first, then add its sources, then add the quote. A quote has to name the source it came from.",
      },
    };
  }

  let storyId: string;
  try {
    const story = await createStoryDraft(parsed.data, actor.id);
    storyId = story.id;
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.story.draft_created", { storyId });
  revalidatePath("/admin/editorial");
  redirect(`/admin/editorial/stories/${storyId}`);
}

export async function updateStoryAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();

  const id = idSchema.safeParse({ storyId: text(formData, "storyId") });
  if (!id.success) return { status: "error", errors: { form: "That story no longer exists." } };

  const parsed = readDraft(formData);
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  try {
    await updateStoryDraft(id.data.storyId, parsed.data);
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.story.updated", { storyId: id.data.storyId });
  storyPaths(id.data.storyId);
  return { status: "saved", errors: {}, message: "Saved." };
}

export async function createFigureAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();

  const parsed = publicFigureSchema.safeParse({
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    shortBio: text(formData, "shortBio"),
    isDeceased: formData.get("isDeceased") === "on",
  });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  let figureId: string;
  try {
    const figure = await createPublicFigure(parsed.data);
    figureId = figure.id;
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.figure.created", { figureId });
  revalidatePath("/admin/editorial");
  redirect("/admin/editorial/stories/new");
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function addSourceAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();

  const id = idSchema.safeParse({ storyId: text(formData, "storyId") });
  if (!id.success) return { status: "error", errors: { form: "That story no longer exists." } };

  const parsed = sourceSchema.safeParse({
    url: text(formData, "url"),
    title: text(formData, "title"),
    publisher: text(formData, "publisher"),
    publishedDate: text(formData, "publishedDate"),
    sourceType: text(formData, "sourceType"),
  });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  try {
    await addSource(id.data.storyId, parsed.data);
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.source.added", { storyId: id.data.storyId });
  storyPaths(id.data.storyId);
  return { status: "saved", errors: {}, message: "Source added." };
}

export async function removeSourceAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();
  const sourceId = text(formData, "sourceId");
  if (!sourceId) return { status: "error", errors: { form: "That source no longer exists." } };

  let storyId: string;
  try {
    const result = await removeSource(sourceId);
    storyId = result.storyId;
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.source.removed", { storyId, sourceId });
  storyPaths(storyId);
  return { status: "saved", errors: {}, message: "Source removed." };
}

// ---------------------------------------------------------------------------
// Two-step publishing
// ---------------------------------------------------------------------------

export async function submitForReviewAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();
  const id = idSchema.safeParse({ storyId: text(formData, "storyId") });
  if (!id.success) return { status: "error", errors: { form: "That story no longer exists." } };

  try {
    await submitForReview(id.data.storyId);
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.story.submitted_for_review", {
    storyId: id.data.storyId,
  });
  storyPaths(id.data.storyId);
  return { status: "saved", errors: {}, message: "Sent for review." };
}

export async function publishStoryAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();
  const id = idSchema.safeParse({ storyId: text(formData, "storyId") });
  if (!id.success) return { status: "error", errors: { form: "That story no longer exists." } };

  try {
    await verifyAndPublish(id.data.storyId, actor.id);
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.story.published", { storyId: id.data.storyId });
  storyPaths(id.data.storyId);
  revalidatePath("/stories");
  return { status: "saved", errors: {}, message: "Published." };
}

export async function returnToDraftAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();
  const id = idSchema.safeParse({ storyId: text(formData, "storyId") });
  if (!id.success) return { status: "error", errors: { form: "That story no longer exists." } };

  try {
    await returnToDraft(id.data.storyId);
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.story.returned_to_draft", { storyId: id.data.storyId });
  storyPaths(id.data.storyId);
  return { status: "saved", errors: {}, message: "Back with the drafter." };
}

export async function retractStoryAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();
  const id = idSchema.safeParse({ storyId: text(formData, "storyId") });
  if (!id.success) return { status: "error", errors: { form: "That story no longer exists." } };

  const reason = text(formData, "reason").trim();
  if (reason.length < 3) {
    return {
      status: "error",
      errors: { reason: "Record why this story is being taken down." },
    };
  }

  try {
    await retractStory(id.data.storyId, reason);
  } catch (error) {
    return ruleFailure(error);
  }

  // The reason itself is free text and never leaves the system, so the audit entry records
  // only that it happened and who did it.
  await recordAudit(actor.id, "editorial.story.retracted", { storyId: id.data.storyId });
  storyPaths(id.data.storyId);
  revalidatePath("/stories");
  return { status: "saved", errors: {}, message: "Retracted. It is off the public site now." };
}

export async function markReviewedAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();
  const id = idSchema.safeParse({ storyId: text(formData, "storyId") });
  if (!id.success) return { status: "error", errors: { form: "That story no longer exists." } };

  try {
    await markReviewed(id.data.storyId);
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.story.reviewed", { storyId: id.data.storyId });
  storyPaths(id.data.storyId);
  revalidatePath("/admin/editorial/review");
  return { status: "saved", errors: {}, message: "Marked as reviewed today." };
}

// ---------------------------------------------------------------------------
// Corrections and removals
// ---------------------------------------------------------------------------

export async function resolveRequestAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();

  const parsed = takedownResolutionSchema.safeParse({
    requestId: text(formData, "requestId"),
    status: text(formData, "status"),
    resolutionNote: text(formData, "resolutionNote"),
  });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  try {
    await resolveTakedownRequest(parsed.data);
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.request.resolved", {
    requestId: parsed.data.requestId,
    outcome: parsed.data.status,
  });
  revalidatePath("/admin/editorial/requests");
  revalidatePath("/admin/editorial");
  return { status: "saved", errors: {}, message: "Recorded." };
}
