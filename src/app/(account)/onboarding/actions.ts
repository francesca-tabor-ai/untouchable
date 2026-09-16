"use server";

import { redirect } from "next/navigation";

import type { ConsentPurpose } from "@/generated/prisma";
import { requireAdult, requireUser } from "@/lib/auth/guards";
import { CONSENT_PURPOSES } from "@/lib/consent/text";
import { nextHrefAfter } from "@/lib/onboarding";
import { conditionsStepSchema, saveUserConditions } from "@/lib/onboarding/conditions";
import { fieldErrorsFrom, type FormState } from "@/lib/onboarding/form-state";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { saveUserSymptoms, symptomsStepSchema } from "@/lib/onboarding/symptoms";
import { profileSchema, saveProfile } from "@/lib/profile";
import { confirmAdult } from "@/lib/profile/account";
import { recordConsentDecisions } from "@/lib/profile/consent";

/**
 * Every action here re-checks who is asking. A page having called a guard is not a reason
 * to skip one — AGENTS.md section 8.
 *
 * Anything that writes health data also calls `requireTrackingConsent`, so there is no path
 * through the product that records a symptom for somebody who has not said we may.
 */

export async function confirmAdultAction(): Promise<void> {
  const user = await requireUser("/onboarding");
  await confirmAdult(user.id);
}

export async function saveWelcomeAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdult("/onboarding/welcome");

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    yearOfBirth: formData.get("yearOfBirth") ?? "",
    sex: formData.get("sex") ?? "",
    region: formData.get("region") ?? "",
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await saveProfile(user.id, parsed.data);
  redirect(await nextHrefAfter(user.id, "welcome"));
}

export async function saveConsentAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdult("/onboarding/consent");

  // An unticked box is a decision, not a missing answer. We record every purpose the person
  // was shown, so the record says what they were asked as well as what they said.
  const decisions: Partial<Record<ConsentPurpose, boolean>> = {};
  for (const purpose of CONSENT_PURPOSES) {
    decisions[purpose] = formData.get(`consent-${purpose}`) === "on";
  }

  await recordConsentDecisions(user.id, decisions);

  // Saying no to core tracking is allowed, and it stops onboarding here rather than marching
  // someone through steps that would have nowhere to save to.
  if (!decisions.core_tracking) redirect("/onboarding");

  redirect(await nextHrefAfter(user.id, "consent"));
}

export async function saveConditionsAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdult("/onboarding/conditions");
  await requireTrackingConsent(user.id);

  const conditionIds = formData.getAll("conditionId").map(String);
  const parsed = conditionsStepSchema.safeParse({
    selections: conditionIds.map((conditionId) => ({
      conditionId,
      diagnosedYear: formData.get(`year-${conditionId}`) ?? "",
      // Unticked means "no formal diagnosis", which is the careful assumption for research.
      selfReported: formData.get(`diagnosed-${conditionId}`) !== "on",
    })),
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await saveUserConditions(user.id, parsed.data.selections);
  redirect(await nextHrefAfter(user.id, "conditions"));
}

export async function saveSymptomsAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireAdult("/onboarding/symptoms");
  await requireTrackingConsent(user.id);

  const parsed = symptomsStepSchema.safeParse({
    symptomIds: formData.getAll("symptomId").map(String),
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await saveUserSymptoms(user.id, parsed.data.symptomIds);
  redirect(await nextHrefAfter(user.id, "symptoms"));
}
