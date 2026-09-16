"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { SideEffectFormState } from "@/components/tracking/side-effect-form-state";
import { requireAdult } from "@/lib/auth/guards";
import { fieldErrorsFrom, type FormState } from "@/lib/onboarding/form-state";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { reportSideEffect, sideEffectSchema } from "@/lib/tracking/side-effects";
import {
  addTreatmentCourse,
  restartTreatmentCourse,
  stopTreatmentCourse,
  stopTreatmentSchema,
  TrackingError,
  treatmentCourseSchema,
  updateTreatmentCourse,
} from "@/lib/tracking/treatments";

/**
 * Treatment and side effect actions.
 *
 * Every one of them starts with `requireAdult` and `requireTrackingConsent`, because an
 * action is a request in its own right and the page that rendered the form is not a guard.
 *
 * `courseId` arrives in the form and is treated as untrusted: every domain function looks
 * the course up by (id, userId), so a tampered id finds nothing rather than somebody else's
 * treatment.
 */

function readCourseForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    type: String(formData.get("type") ?? ""),
    dose: String(formData.get("dose") ?? ""),
    frequency: String(formData.get("frequency") ?? ""),
    route: String(formData.get("route") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    adherenceRating: String(formData.get("adherenceRating") ?? ""),
  };
}

function failure(error: { issues: { path: PropertyKey[]; message: string }[] }): FormState {
  const fieldErrors = fieldErrorsFrom(error.issues);
  return { error: Object.values(fieldErrors)[0], fieldErrors };
}

function trackingFailure(error: unknown): FormState {
  if (error instanceof TrackingError) {
    return { error: error.message, fieldErrors: { [error.field]: error.message } };
  }
  throw error;
}

export async function addTreatmentAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdult("/treatments/new");
  await requireTrackingConsent(user.id);

  const parsed = treatmentCourseSchema.safeParse(readCourseForm(formData));
  if (!parsed.success) return failure(parsed.error);

  const course = await addTreatmentCourse(user.id, parsed.data);
  redirect(`/treatments/${course.id}?saved=added`);
}

export async function updateTreatmentAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdult("/treatments");
  await requireTrackingConsent(user.id);

  const courseId = String(formData.get("courseId") ?? "");
  const parsed = treatmentCourseSchema.safeParse(readCourseForm(formData));
  if (!parsed.success) return failure(parsed.error);

  try {
    await updateTreatmentCourse(user.id, courseId, parsed.data);
  } catch (error) {
    return trackingFailure(error);
  }

  redirect(`/treatments/${courseId}?saved=changed`);
}

export async function stopTreatmentAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdult("/treatments");
  await requireTrackingConsent(user.id);

  const courseId = String(formData.get("courseId") ?? "");
  const parsed = stopTreatmentSchema.safeParse({
    endDate: String(formData.get("endDate") ?? ""),
    stopReason: String(formData.get("stopReason") ?? ""),
    stopReasonNote: String(formData.get("stopReasonNote") ?? ""),
    adherenceRating: String(formData.get("adherenceRating") ?? ""),
  });
  if (!parsed.success) return failure(parsed.error);

  try {
    await stopTreatmentCourse(user.id, courseId, parsed.data);
  } catch (error) {
    return trackingFailure(error);
  }

  redirect(`/treatments/${courseId}?saved=stopped`);
}

/** Undoing a stop. People mis-tap, and the alternative is losing the course's history. */
export async function restartTreatmentAction(formData: FormData): Promise<void> {
  const user = await requireAdult("/treatments");
  await requireTrackingConsent(user.id);

  const courseId = String(formData.get("courseId") ?? "");
  await restartTreatmentCourse(user.id, courseId);

  redirect(`/treatments/${courseId}?saved=restarted`);
}

/**
 * Recording a side effect.
 *
 * `showYellowCard` comes back true on every successful save, and the form renders the MHRA
 * Yellow Card note from it in the same response. `yellowCardShownAt` is stamped by the same
 * write that created the report, so the record and the screen cannot disagree.
 */
export async function reportSideEffectAction(
  _state: SideEffectFormState,
  formData: FormData,
): Promise<SideEffectFormState> {
  const user = await requireAdult("/treatments");
  await requireTrackingConsent(user.id);

  const courseId = String(formData.get("courseId") ?? "");
  const parsed = sideEffectSchema.safeParse({
    description: String(formData.get("description") ?? ""),
    severity: String(formData.get("severity") ?? ""),
  });
  if (!parsed.success) return failure(parsed.error);

  try {
    const report = await reportSideEffect(user.id, courseId, parsed.data);
    // So the list of what has already been recorded on this page includes the new one.
    revalidatePath(`/treatments/${courseId}`);
    return { showYellowCard: true, savedReportId: report.id };
  } catch (error) {
    return trackingFailure(error);
  }
}
