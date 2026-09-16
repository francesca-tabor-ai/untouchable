"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { draftScopeForCheckIn, ownCheckIn } from "@/lib/questionnaires/check-ins";
import { clearDraft, saveDraft } from "@/lib/questionnaires/drafts";
import { answersFromFormData } from "@/lib/questionnaires/form";
import {
  INTENT_DRAFT,
  SUBMIT_INTENT,
  type QuestionnaireFormState,
} from "@/lib/questionnaires/form-state";
import { saveResponse } from "@/lib/questionnaires/responses";

/**
 * Answering a scheduled check-in.
 *
 * Both actions re-check who is asking and whether they still consent to us keeping anything.
 * The check-in is looked up scoped to that person, so somebody else's is simply not found.
 */

export async function saveCheckInAction(
  _state: QuestionnaireFormState,
  formData: FormData,
): Promise<QuestionnaireFormState> {
  const checkInId = String(formData.get("checkInId") ?? "");
  const user = await requireAdult(`/check-ins/${checkInId}`);
  await requireTrackingConsent(user.id);

  const found = await ownCheckIn(user.id, checkInId);
  if (!found) return { status: "error", problems: { form: "We could not find that check-in." } };

  const answers = answersFromFormData(found.version.definition.items, formData);

  if (formData.get(SUBMIT_INTENT) === INTENT_DRAFT) {
    const kept = await saveDraft(draftScopeForCheckIn(checkInId), found.version.definition.items, answers);
    return {
      status: "draft_saved",
      message: kept
        ? "Saved. You can close this and come back to it whenever you like."
        : "That was too long to keep for later, so it has not been saved. Finishing the questions will save them properly.",
    };
  }

  const result = await saveResponse({
    userId: user.id,
    versionId: found.version.id,
    answers,
    checkInId,
  });
  if (!result.ok) return { status: "error", problems: result.problems };

  await clearDraft(draftScopeForCheckIn(checkInId));
  revalidatePath("/check-ins");
  redirect(`/check-ins/recorded?response=${result.responseId}`);
}

export async function autosaveCheckInAction(formData: FormData): Promise<void> {
  const checkInId = String(formData.get("checkInId") ?? "");
  const user = await requireAdult(`/check-ins/${checkInId}`);
  await requireTrackingConsent(user.id);

  const found = await ownCheckIn(user.id, checkInId);
  if (!found) return;

  await saveDraft(
    draftScopeForCheckIn(checkInId),
    found.version.definition.items,
    answersFromFormData(found.version.definition.items, formData),
  );
}
