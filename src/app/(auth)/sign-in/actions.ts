"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import type { FormState } from "@/lib/onboarding/form-state";
import { safeReturnPath, SIGN_IN_PROBLEM } from "@/lib/profile/account";

export async function signInAction(_state: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = safeReturnPath(formData.get("next"));

  // No field-level validation here on purpose. "That is not a valid email address" and
  // "that email address is not registered" are one careless step apart, and the sign-in
  // form must never be a way to find out who has an account on a health platform.
  try {
    await signIn("credentials", { email, password, redirectTo: next });
  } catch (error) {
    if (error instanceof AuthError) return { error: SIGN_IN_PROBLEM };
    throw error;
  }

  return {};
}
