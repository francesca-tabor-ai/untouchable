"use server";

import { redirect } from "next/navigation";

import { requireAdult } from "@/lib/auth/guards";
import { nextHrefAfter } from "@/lib/onboarding";
import { fieldErrorsFrom, type FormState } from "@/lib/onboarding/form-state";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { confirmTreatments } from "@/lib/tracking/onboarding-step";
import { addTreatmentCourse, treatmentCourseSchema } from "@/lib/tracking/treatments";

/**
 * The treatments onboarding step — brief 7.1.
 *
 * These live here rather than in the shared `onboarding/actions.ts` so that finishing this
 * step never means editing a file another team is also finishing a step in.
 *
 * **The step is finished by answering, not by having something to record.** Both actions
 * below are legitimate endings: adding treatments and then confirming the list, or saying
 * straight out that you are not on anything. `confirmTreatments` writes the same timestamp
 * either way, and null goes on meaning "we have never asked".
 */

export async function addOnboardingTreatmentAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdult("/onboarding/treatments");
  await requireTrackingConsent(user.id);

  const parsed = treatmentCourseSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
    dose: String(formData.get("dose") ?? ""),
    frequency: String(formData.get("frequency") ?? ""),
    route: String(formData.get("route") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    adherenceRating: String(formData.get("adherenceRating") ?? ""),
  });

  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    return { error: Object.values(fieldErrors)[0], fieldErrors };
  }

  await addTreatmentCourse(user.id, parsed.data);
  // Back to the step, where the new one is on the list and another can be added. Adding does
  // not finish the step: the person says when the list is complete.
  redirect("/onboarding/treatments?added=1");
}

/**
 * "This is all of it" — including when all of it is nothing.
 *
 * One tap, no typing, no extra screen. Somebody who takes nothing must be able to finish
 * this step as easily as somebody with four medicines, and more easily than they would
 * finish it by inventing an entry.
 */
export async function confirmTreatmentsAction(): Promise<void> {
  const user = await requireAdult("/onboarding/treatments");
  await requireTrackingConsent(user.id);

  await confirmTreatments(user.id);
  redirect(await nextHrefAfter(user.id, "treatments"));
}
