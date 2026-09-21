"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { fieldErrorsFrom, type FormState } from "@/lib/onboarding/form-state";
import { createAccount, SIGN_UP_PROBLEM, signUpSchema } from "@/lib/profile/account";

export async function signUpAction(_state: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
    displayName: formData.get("displayName") ?? "",
  });

  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  const account = await createAccount(parsed.data);
  if (!account) return { error: SIGN_UP_PROBLEM };

  try {
    // Sign in straight away: asking someone to type the password they just chose, on the
    // next screen, is a pointless piece of friction.
    //
    // And then home, signed in, rather than into a setup flow. The header says whose
    // account it is, which is the evidence somebody wants that it worked. The account area
    // asks for consent and the rest when a page there actually needs it.
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    // signIn signals the redirect by throwing. Only a real auth failure is ours to handle.
    if (error instanceof AuthError) return { error: SIGN_UP_PROBLEM };
    throw error;
  }

  return {};
}
