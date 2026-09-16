import type { Metadata } from "next";
import Link from "next/link";

import { signOutAction } from "@/components/auth/actions";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sign out" };

export default async function SignOutPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-display">You are signed out</h1>
        <p className="text-lead text-ink-soft">Nothing is showing on this device any more.</p>
        <Button asChild size="lg">
          <Link href="/">Back to the site</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-display">Sign out</h1>
      <p className="text-lead text-ink-soft">
        Everything you have recorded stays exactly as it is. You can sign back in whenever you want.
      </p>
      <form action={signOutAction} className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" size="lg">
          Sign out
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/settings">Stay signed in</Link>
        </Button>
      </form>
    </div>
  );
}
