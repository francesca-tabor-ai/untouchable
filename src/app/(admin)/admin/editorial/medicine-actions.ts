"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit, requireEditor } from "@/lib/auth/guards";
import {
  createMedicine,
  linkMedicineToStory,
  unlinkMedicineFromStory,
} from "@/lib/medicines/editorial";
import {
  medicineSchema,
  removeStoryMedicineSchema,
  storyMedicineSchema,
} from "@/lib/medicines/schemas";
import { StoryRuleError } from "@/lib/stories/errors";
import { fieldErrors } from "@/lib/stories/schemas";

import type { EditorialFormState } from "./form-state";

/**
 * Medicine server actions for the editorial admin.
 *
 * Same four steps in the same order as `actions.ts`: authorise, validate with Zod, call a
 * domain function, record an audit entry. No rule is decided here — the dose rule lives in
 * `src/lib/medicines/dose-language.ts` and is applied by the schema and again by the domain
 * layer, so a second interface onto this data cannot quietly have a looser one.
 *
 * A separate file from `actions.ts` because that one is the stories team's; this is the
 * medicine seam, and "use server" files may only export async functions, so there is
 * nothing to share between them but types.
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

function storyPaths(storyId: string) {
  revalidatePath("/admin/editorial");
  revalidatePath(`/admin/editorial/stories/${storyId}`);
}

export async function linkMedicineAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();

  const parsed = storyMedicineSchema.safeParse({
    storyId: text(formData, "storyId"),
    interventionId: text(formData, "interventionId"),
    sourceId: text(formData, "sourceId"),
    context: text(formData, "context"),
  });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  try {
    await linkMedicineToStory(parsed.data);
  } catch (error) {
    return ruleFailure(error);
  }

  // The context line is editorial copy, not free text somebody wrote about themselves, but
  // the audit entry records only that the link happened — the same discipline as everywhere
  // else in this admin.
  await recordAudit(actor.id, "editorial.medicine.linked", {
    storyId: parsed.data.storyId,
    interventionId: parsed.data.interventionId,
    hasSource: parsed.data.sourceId !== null,
  });
  storyPaths(parsed.data.storyId);
  revalidatePath("/medicines");
  return { status: "saved", errors: {}, message: "Medicine saved on this story." };
}

export async function unlinkMedicineAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();

  const parsed = removeStoryMedicineSchema.safeParse({
    storyId: text(formData, "storyId"),
    interventionId: text(formData, "interventionId"),
  });
  if (!parsed.success) {
    return { status: "error", errors: { form: "That medicine is no longer on this story." } };
  }

  try {
    await unlinkMedicineFromStory(parsed.data.storyId, parsed.data.interventionId);
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.medicine.unlinked", {
    storyId: parsed.data.storyId,
    interventionId: parsed.data.interventionId,
  });
  storyPaths(parsed.data.storyId);
  revalidatePath("/medicines");
  return { status: "saved", errors: {}, message: "Removed from this story." };
}

const withStory = z.object({ storyId: z.string().trim().min(1) });

/**
 * Add a medicine that is not in the list, and put it on the story being edited.
 *
 * It lands with no source, which is exactly the state the publishing panel flags — an
 * editor adding a medicine mid-draft should be told to attribute it, not quietly allowed
 * to forget.
 */
export async function createMedicineAction(
  _previous: EditorialFormState,
  formData: FormData,
): Promise<EditorialFormState> {
  const actor = await requireEditor();

  const story = withStory.safeParse({ storyId: text(formData, "storyId") });
  if (!story.success) return { status: "error", errors: { form: "That story no longer exists." } };

  const parsed = medicineSchema.safeParse({
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    type: text(formData, "type"),
    summary: text(formData, "summary"),
    isSensitiveTopic: formData.get("isSensitiveTopic") === "on",
  });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  let medicineId: string;
  try {
    const medicine = await createMedicine(parsed.data);
    medicineId = medicine.id;
    await linkMedicineToStory({
      storyId: story.data.storyId,
      interventionId: medicineId,
      sourceId: null,
      context: null,
    });
  } catch (error) {
    return ruleFailure(error);
  }

  await recordAudit(actor.id, "editorial.medicine.created", {
    interventionId: medicineId,
    storyId: story.data.storyId,
  });
  storyPaths(story.data.storyId);
  revalidatePath("/medicines");
  return {
    status: "saved",
    errors: {},
    message: "Added, and put on this story. Give it a source before anyone publishes it.",
  };
}
