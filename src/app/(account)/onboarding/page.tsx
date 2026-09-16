import type { Metadata } from "next";
import Link from "next/link";

import { AgeConfirmation } from "@/components/onboarding/age-confirmation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/guards";
import { onboardingProgress } from "@/lib/onboarding";
import { canTrack, hasAnsweredCoreTracking } from "@/lib/profile/consent";

import { confirmAdultAction } from "./actions";

export const metadata: Metadata = { title: "Setting up your account" };

/**
 * The one page that knows how far someone has got.
 *
 * Everything on it is read from what has actually been saved, so closing the tab loses
 * nothing and there is no such thing as a half-finished session to recover.
 */
export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");

  // The only screen in the account area that works without the 18-or-over confirmation,
  // because it is where `requireAdult` sends people to give it.
  if (!user.ageConfirmed) {
    return (
      <Container reading className="py-12 sm:py-16">
        <h1 className="text-display">One thing first</h1>
        <p className="mt-4 text-lead text-ink-soft">
          UnTouchable holds health information, and we hold none at all about under-18s. Before you
          can go any further, please confirm your age.
        </p>
        <div className="mt-8">
          <AgeConfirmation action={confirmAdultAction} />
        </div>
      </Container>
    );
  }

  const progress = await onboardingProgress(user.id);
  const trackingOn = await canTrack(user.id);
  const declinedTracking = !trackingOn && (await hasAnsweredCoreTracking(user.id));

  return (
    <Container reading className="py-12 sm:py-16">
      <header>
        <h1 className="text-display">Setting up your account</h1>
        <p className="mt-4 text-lead text-ink-soft">
          Six short steps. Each one saves as you finish it, so you can stop whenever you like and
          come back to exactly this page.
        </p>
        <p className="mt-4 text-small text-muted">
          {progress.completedCount} of {progress.readyCount} done.
        </p>
      </header>

      {declinedTracking ? (
        <Callout tone="warm" title="Tracking is off" className="mt-8">
          <p>
            You said we may not store your health information, so there is nothing for the tracking
            part of the site to keep. That is a real answer and we have recorded it. You can still
            read stories and follow charities, and you can change your mind at any time in{" "}
            <Link href="/settings/consent">your data choices</Link>.
          </p>
        </Callout>
      ) : null}

      {progress.nextHref ? (
        <div className="mt-8">
          <Button asChild size="lg" block>
            <Link href={progress.nextHref}>
              {progress.completedCount === 0 ? "Start" : "Carry on where I left off"}
            </Link>
          </Button>
        </div>
      ) : (
        <Callout tone="care" title="That is everything for now" className="mt-8">
          <p>
            Your account is set up. The daily log, check-ins and your own charts are being built and
            will appear here as they arrive.
          </p>
        </Callout>
      )}

      <h2 className="mt-12 text-title">The steps</h2>
      <ol className="mt-4 space-y-3">
        {progress.steps.map(({ step, complete, position }) => (
          <li key={step.key} className="rounded-card border border-line bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-body font-semibold text-ink">
                  {position}. {step.title}
                </h3>
                <p className="mt-1 text-small text-muted">{step.summary}</p>
              </div>
              {complete ? (
                <Badge tone="forest">Done</Badge>
              ) : step.status === "coming_soon" ? (
                <Badge tone="clay">Coming soon</Badge>
              ) : (
                <Badge>To do</Badge>
              )}
            </div>
            <p className="mt-3">
              <Link
                href={step.href}
                className="text-small font-medium text-forest-600 underline underline-offset-2"
              >
                {complete ? `Change your answers for ${step.title.toLowerCase()}` : `Go to ${step.title.toLowerCase()}`}
              </Link>
            </p>
          </li>
        ))}
      </ol>

      <p className="mt-10 text-small text-muted">
        UnTouchable records and shows information. It does not give medical advice, and nothing here
        replaces your GP or your clinical team.
      </p>
    </Container>
  );
}
