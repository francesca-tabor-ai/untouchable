import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { Callout } from "@/components/ui/callout";
import { getCurrentUser } from "@/lib/auth/guards";
import { AGE_CONFIRMATION_STATEMENT } from "@/lib/profile/account";

import { signUpAction } from "./actions";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display">Create an account</h1>
        <p className="mt-4 text-lead text-ink-soft">
          Three things and you are in. An account lets you save stories, follow charities, and keep
          a record of your own health over time. You choose what we do with that record, one
          decision at a time, and you can change your mind whenever you like.
        </p>
      </header>

      <SignUpForm action={signUpAction} ageStatement={AGE_CONFIRMATION_STATEMENT} />

      <Callout title="What we ask for, and what we do not">
        <p>
          A name to call you by, an email address and a password. That is the whole of it. We do not
          ask for your date of birth, your address or your postcode — not now and not later, and
          nothing about your health until you decide to tell us.
        </p>
      </Callout>

      <p className="text-small text-muted">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-forest-600 underline underline-offset-2">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
