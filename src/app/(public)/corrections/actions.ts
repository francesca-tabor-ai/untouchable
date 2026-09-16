"use server";

import { StoryRuleError } from "@/lib/stories/errors";
import { fieldErrors, takedownRequestSchema } from "@/lib/stories/schemas";
import { createTakedownRequest } from "@/lib/stories/takedowns";

import type { CorrectionFormState } from "./form-state";

/**
 * The public correction and removal form. No login: the person in a story, someone
 * representing them, or a reader who has spotted something wrong can all use it.
 *
 * It creates an open task for the editorial team and does nothing else. A form that could
 * change a live page on its own would be a way to take someone else's story down.
 */
export async function submitCorrectionRequest(
  _previous: CorrectionFormState,
  formData: FormData,
): Promise<CorrectionFormState> {
  const parsed = takedownRequestSchema.safeParse({
    storyId: formData.get("storyId"),
    type: formData.get("type"),
    requesterName: formData.get("requesterName"),
    requesterEmail: formData.get("requesterEmail"),
    relationship: formData.get("relationship"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    return { status: "error", errors: fieldErrors(parsed.error) };
  }

  try {
    await createTakedownRequest(parsed.data);
    return { status: "sent", errors: {} };
  } catch (error) {
    if (error instanceof StoryRuleError) {
      return { status: "error", errors: { [error.field ?? "form"]: error.message } };
    }
    throw error;
  }
}
