import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth/guards";
import { safeReturnPath } from "@/lib/profile/account";

import { signInAction } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const returnPath = safeReturnPath(next);

  const user = await getCurrentUser();
  if (user) redirect(returnPath);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-display">Sign in</h1>
        <p className="mt-4 text-lead text-ink-soft">Welcome back.</p>
      </header>

      <SignInForm action={signInAction} next={returnPath} />

      <p className="text-small text-muted">
        No account yet?{" "}
        <Link href="/sign-up" className="text-forest-600 underline underline-offset-2">
          Create one
        </Link>
        .
      </p>
    </div>
  );
}
