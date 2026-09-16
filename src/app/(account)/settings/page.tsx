import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/guards";
import { onboardingProgress } from "@/lib/onboarding";
import { getProfile } from "@/lib/profile";
import { canTrack } from "@/lib/profile/consent";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireUser("/settings");
  const { saved } = await searchParams;

  const [profile, tracking, progress] = await Promise.all([
    getProfile(user.id),
    canTrack(user.id),
    onboardingProgress(user.id),
  ]);

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Settings</h1>
      <p className="mt-4 text-lead text-ink-soft">
        {profile?.displayName ? `Signed in as ${profile.displayName}.` : "Signed in."} {user.email}
      </p>

      {saved === "profile" ? (
        <Callout tone="care" className="mt-6" title="Saved">
          <p>Your details are up to date.</p>
        </Callout>
      ) : null}

      <div className="mt-10 space-y-5">
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-title">Your choices about your data</h2>
            {tracking ? <Badge tone="forest">Tracking on</Badge> : <Badge>Tracking off</Badge>}
          </div>
          <p className="mt-2 text-muted">
            Five separate decisions. View and change any of them — a change takes effect straight
            away.
          </p>
          <p className="mt-4">
            <Link
              href="/settings/consent"
              className="font-medium text-forest-600 underline underline-offset-2"
            >
              View and change your data choices
            </Link>
          </p>
        </Card>

        <Card>
          <h2 className="text-title">Your details</h2>
          <p className="mt-2 text-muted">
            What we call you, and the optional things you have told us. Year of birth only — never a
            full date of birth, and never an address.
          </p>
          <p className="mt-4">
            <Link
              href="/settings/profile"
              className="font-medium text-forest-600 underline underline-offset-2"
            >
              Change your details
            </Link>
          </p>
        </Card>

        {!progress.finished ? (
          <Card>
            <h2 className="text-title">Setting up your account</h2>
            <p className="mt-2 text-muted">
              {progress.completedCount} of {progress.readyCount} steps done. Nothing is lost — you
              can pick it up whenever you like.
            </p>
            <p className="mt-4">
              <Link
                href="/onboarding"
                className="font-medium text-forest-600 underline underline-offset-2"
              >
                Carry on setting up
              </Link>
            </p>
          </Card>
        ) : null}
      </div>
    </Container>
  );
}
