"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ConsentPurpose } from "@/generated/prisma";
import { requireAdult } from "@/lib/auth/guards";
import { fieldErrorsFrom, type FormState } from "@/lib/onboarding/form-state";
import { profileSchema, saveProfile } from "@/lib/profile";
import { recordSingleConsent } from "@/lib/profile/consent";

const consentChangeSchema = z.object({
  purpose: z.enum(ConsentPurpose),
  granted: z.enum(["true", "false"]).transform((value) => value === "true"),
});

/**
 * Change one consent. One purpose, one decision, one new row — never a bulk update, and
 * never a silent one.
 */
export async function setConsentAction(formData: FormData): Promise<void> {
  const user = await requireAdult("/settings/consent");

  const parsed = consentChangeSchema.safeParse({
    purpose: formData.get("purpose"),
    granted: formData.get("granted"),
  });
  if (!parsed.success) redirect("/settings/consent");

  await recordSingleConsent(user.id, parsed.data.purpose, parsed.data.granted);
  revalidatePath("/settings/consent");
  redirect("/settings/consent");
}

/** Withdraw core tracking consent, from the confirmation screen and nowhere else. */
export async function stopTrackingAction(): Promise<void> {
  const user = await requireAdult("/settings/consent");
  await recordSingleConsent(user.id, ConsentPurpose.core_tracking, false);
  revalidatePath("/settings/consent");
  redirect("/settings/consent");
}

export async function saveProfileAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdult("/settings/profile");

  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    yearOfBirth: formData.get("yearOfBirth") ?? "",
    sex: formData.get("sex") ?? "",
    region: formData.get("region") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  await saveProfile(user.id, parsed.data);
  revalidatePath("/settings");
  redirect("/settings?saved=profile");
}
