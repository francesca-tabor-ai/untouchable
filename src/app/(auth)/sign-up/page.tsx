import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { Callout } from "@/components/ui/callout";
import { getCurrentUser } from "@/lib/auth/guards";

import { signUpAction } from "./actions";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/onboarding");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display">Create an account</h1>
        <p className="mt-4 text-lead text-ink-soft">
          An account lets you save stories, follow charities, and keep a record of your own health
          over time. You choose what we do with that record, one decision at a time, and you can
          change your mind whenever you like.
        </p>
      </header>

      <SignUpForm action={signUpAction} />

      <Callout title="What we ask for, and what we do not">
        <p>
          An email address, a password, and that you are 18 or over. We do not ask for your date of
          birth, your address or your postcode — not now and not later.
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
