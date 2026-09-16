import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { STOP_TRACKING_CONSEQUENCES } from "@/lib/consent/text";
import { canTrack } from "@/lib/profile/consent";

import { stopTrackingAction } from "../../actions";

export const metadata: Metadata = { title: "Turn off tracking" };

/**
 * Withdrawal, said plainly. The rule in the design system is "say the hard thing plainly
 * rather than softening it into vagueness", and this is the screen it was written for.
 *
 * Nothing on this page tries to talk anyone out of it. There is no "are you sure", no guilt,
 * and the confirm button is not made quieter than the one that goes back.
 */
export default async function StopTrackingPage() {
  const user = await requireAdult("/settings/consent/stop-tracking");

  // Nothing to withdraw — do not show a person a consequence screen for a thing they have
  // already done.
  if (!(await canTrack(user.id))) redirect("/settings/consent");

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Turn off tracking</h1>
      <p className="mt-4 text-lead text-ink-soft">
        You are about to tell us we may no longer store or use your health information. Here is
        exactly what that means.
      </p>

      <ul className="mt-8 space-y-4">
        {STOP_TRACKING_CONSEQUENCES.map((line) => (
          <li key={line} className="rounded-card border border-line bg-white p-5 text-ink-soft">
            {line}
          </li>
        ))}
      </ul>

      <Callout tone="care" className="mt-8" title="This takes effect immediately">
        <p>
          The moment you confirm, you are out of every research query, every export and every study
          email. Nothing carries on in the background.
        </p>
      </Callout>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <form action={stopTrackingAction}>
          <Button type="submit" size="lg">
            Turn off tracking
          </Button>
        </form>
        <Button asChild variant="secondary" size="lg">
          <Link href="/settings/consent">Leave it on</Link>
        </Button>
      </div>
    </Container>
  );
}
