"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { fieldErrorsFrom, type FormState } from "@/lib/onboarding/form-state";
import { createAccount, SIGN_UP_PROBLEM, signUpSchema } from "@/lib/profile/account";

export async function signUpAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    ageConfirmed: formData.get("ageConfirmed") === "on",
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const account = await createAccount(parsed.data);
  if (!account) return { error: SIGN_UP_PROBLEM };

  try {
    // Sign in straight away: asking someone to type the password they just chose, on the
    // next screen, is a pointless piece of friction.
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    // signIn signals the redirect by throwing. Only a real auth failure is ours to handle.
    if (error instanceof AuthError) return { error: SIGN_UP_PROBLEM };
    throw error;
  }

  return {};
}
