import { z } from "zod";

import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { displayNameSchema } from "@/lib/profile/display-name";

/**
 * Creating an account, and deciding where to send someone afterwards.
 *
 * Password rules are not ours to invent: `passwordProblem()` is the single source of truth
 * (length, and nothing else — NIST SP 800-63B). Adding a "must contain a symbol" rule here
 * would make passwords worse, not better.
 */

export const AGE_CONFIRMATION_LABEL = "I am 18 or over.";

/**
 * Shown next to the button that creates the account, so nobody can say they were not told.
 *
 * It used to be a tick box on the form. Three fields and a sentence get more people through
 * the door than three fields, a tick box and a screen about it — and the rule the tick box
 * protected is not enforced by the tick box. Nothing about anybody's health is written down
 * until `requireAdult` and `requireTrackingConsent` have both been answered, and the
 * database refuses a year of birth that would make someone under 18.
 */
export const AGE_CONFIRMATION_STATEMENT =
  "By creating an account you confirm you are 18 or over. UnTouchable holds health information, and we hold none at all about under-18s.";

/**
 * Deliberately vague, and identical whatever went wrong. Someone probing the form learns
 * only that it did not work.
 *
 * It is not a complete defence — anyone who can sign up can eventually find out whether an
 * address is taken. Closing that properly needs sign-up by email verification, which needs
 * a real email provider. Recorded in DECISIONS.md.
 */
export const SIGN_UP_PROBLEM =
  "We could not create an account with those details. If you already have an account, sign in instead.";

/**
 * The only thing we ever say when a sign-in fails.
 *
 * Never "we do not know that address" and never "wrong password": having an account here
 * can imply a diagnosis, so the form must not answer the question "is this person a user of
 * a health platform?" for anyone who asks it.
 */
export const SIGN_IN_PROBLEM =
  "That email address and password did not match. Please check both and try again.";

export const signUpSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Please enter your email address.")
    .max(320, "That email address is longer than we can store.")
    .pipe(z.email("Please check that email address.")),
  password: z.string().superRefine((value, ctx) => {
    const problem = passwordProblem(value);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  }),
  displayName: displayNameSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export interface CreatedAccount {
  id: string;
  email: string;
}

/**
 * Create a patient account.
 *
 * Three things are asked for and all three are stored here: an address to sign in with, a
 * password, and a name to call someone by. The name goes straight into the profile, so
 * there is no first screen after sign-up whose only job is to ask for it.
 *
 * The 18-or-over confirmation is stamped here rather than left for later: we hold no data
 * at all about under-18s, so the confirmation is a condition of having an account, not a
 * step in onboarding. It is made by the statement next to the button
 * (AGE_CONFIRMATION_STATEMENT), not by a tick box. Returns null when the address is already
 * in use — the caller shows SIGN_UP_PROBLEM either way.
 */
export async function createAccount(input: SignUpInput): Promise<CreatedAccount | null> {
  const existing = await db.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) return null;

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await db.user.create({
      data: {
        email: input.email,
        passwordHash,
        role: "patient",
        ageConfirmedAt: new Date(),
        profile: { create: { displayName: input.displayName } },
      },
      select: { id: true, email: true },
    });
    return user;
  } catch {
    // Unique violation from a race between the check above and the insert.
    return null;
  }
}

/** Confirm 18-or-over on an account that was created without it. */
export async function confirmAdult(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { ageConfirmedAt: new Date() },
  });
}

export async function isAdultConfirmed(userId: string): Promise<boolean> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { ageConfirmedAt: true } });
  return Boolean(user?.ageConfirmedAt);
}

const DEFAULT_RETURN_PATH = "/onboarding";

/**
 * Where to send someone after they sign in.
 *
 * Only a path on this site, and never a protocol-relative one — `//evil.example` is a valid
 * URL to a different host, and an open redirect on a health platform is a phishing kit.
 */
export function safeReturnPath(next: unknown): string {
  if (typeof next !== "string") return DEFAULT_RETURN_PATH;
  if (!next.startsWith("/")) return DEFAULT_RETURN_PATH;
  if (next.startsWith("//") || next.startsWith("/\\")) return DEFAULT_RETURN_PATH;
  if (next.includes("\n") || next.includes("\r")) return DEFAULT_RETURN_PATH;
  return next;
}
