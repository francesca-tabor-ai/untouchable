"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { baselineVersion, saveBaselineResponse } from "@/lib/questionnaires/baseline";
import { clearDraft, saveDraft, type DraftScope } from "@/lib/questionnaires/drafts";
import { answersFromFormData } from "@/lib/questionnaires/form";
import {
  INTENT_DRAFT,
  SUBMIT_INTENT,
  type QuestionnaireFormState,
} from "@/lib/questionnaires/form-state";

/**
 * The baseline assessment's actions.
 *
 * Both of them check who is asking and whether they have said we may keep anything, every
 * time. The page having rendered the form is not a permission check — AGENTS.md rule 10 and
 * section 8. Nothing about anybody's health is written without `core_tracking`.
 */

const PATH = "/onboarding/baseline";

function scopeFor(versionId: string): DraftScope {
  return { key: `baseline-${versionId}`, path: PATH };
}

export async function saveBaselineAction(
  _state: QuestionnaireFormState,
  formData: FormData,
): Promise<QuestionnaireFormState> {
  const user = await requireAdult(PATH);
  await requireTrackingConsent(user.id);

  const version = await baselineVersion();
  if (!version) {
    return {
      status: "error",
      problems: { form: "There are no baseline questions set up yet. Nothing has been saved." },
    };
  }

  const answers = answersFromFormData(version.definition.items, formData);

  if (formData.get(SUBMIT_INTENT) === INTENT_DRAFT) {
    const kept = await saveDraft(scopeFor(version.id), version.definition.items, answers);
    return {
      status: "draft_saved",
      message: kept
        ? "Saved. You can close this and come back to it whenever you like."
        : "That was too long to keep for later, so it has not been saved. Finishing the questions will save them properly.",
    };
  }

  const result = await saveBaselineResponse(user.id, answers);
  if (!result.ok) return { status: "error", problems: result.problems };

  await clearDraft(scopeFor(version.id));
  revalidatePath("/onboarding");
  redirect(`${PATH}?recorded=${result.responseId}`);
}

/**
 * Keeps a half-finished set of answers. Called quietly as answers change when JavaScript is
 * running; the "save and come back later" button does the same thing when it is not.
 */
export async function autosaveBaselineAction(formData: FormData): Promise<void> {
  const user = await requireAdult(PATH);
  await requireTrackingConsent(user.id);

  const version = await baselineVersion();
  if (!version) return;

  await saveDraft(
    scopeFor(version.id),
    version.definition.items,
    answersFromFormData(version.definition.items, formData),
  );
}
