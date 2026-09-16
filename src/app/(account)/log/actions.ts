"use server";

import { redirect } from "next/navigation";

import { requireAdult } from "@/lib/auth/guards";
import { fieldErrorsFrom, type FormState } from "@/lib/onboarding/form-state";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { parseDailyLogForm, saveDailyLog } from "@/lib/tracking/daily-log";

/**
 * Saving the daily quick log.
 *
 * Both guards, every time. A page having checked is not a reason for an action to skip it —
 * AGENTS.md section 8 — and nothing about anybody's health is written without
 * `core_tracking` consent.
 *
 * There is no confirmation step and no "are you sure". Saving takes the person straight back
 * to the log, where what they just saved is on the screen.
 */
export async function saveDailyLogAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdult("/log");
  await requireTrackingConsent(user.id);

  const parsed = parseDailyLogForm(formData);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    return { error: Object.values(fieldErrors)[0], fieldErrors };
  }

  await saveDailyLog(user.id, parsed.data);
  redirect("/log?saved=1");
}
