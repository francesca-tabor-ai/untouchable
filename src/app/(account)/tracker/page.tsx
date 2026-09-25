import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { orderTrackers, PLANNED, trackerUsage, type Tracker } from "@/lib/my-health/trackers";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Health tracker" };

/**
 * My health → Health tracker. Every tracker on the platform, and whether you are using it.
 *
 * "In use" is read from the data, not from a sign-up switch — see `src/lib/my-health/
 * trackers.ts`. The ones not built yet are listed as not built, with nothing to press.
 */
export default async function TrackerPage() {
  const user = await requireAdult("/tracker");
  await requireTrackingConsent(user.id);

  const usage = await trackerUsage(user.id);
  const { inUse, notStarted } = orderTrackers(usage);

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-display">Health tracker</h1>
      <p className="mt-4 max-w-2xl text-lead text-ink-soft">
        Choose what to keep a record of. Use as many or as few as you like, and stop whenever
        you want. Only you can see what you record.
      </p>

      {inUse.length > 0 ? (
        <TrackerSection id="in-use" title="What you are tracking" trackers={inUse} inUse />
      ) : null}

      <TrackerSection
        id="available"
        title={inUse.length > 0 ? "You could also track" : "What you can track"}
        trackers={notStarted}
        inUse={false}
      />

      <section className="mt-14" aria-labelledby="planned">
        <h2 id="planned" className="text-title">
          Not built yet
        </h2>
        <p className="mt-2 text-small text-ink-soft">
          We plan to add these. There is nothing to sign up to until they work.
        </p>
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {PLANNED.map((tracker) => (
            <li key={tracker.name}>
              <Card className="h-full bg-cream-50">
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle>{tracker.name}</CardTitle>
                  <Badge>Not built yet</Badge>
                </div>
                <p className="mt-2 text-small text-ink-soft">{tracker.what}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}

function TrackerSection({
  id,
  title,
  trackers,
  inUse,
}: {
  id: string;
  title: string;
  trackers: Tracker[];
  inUse: boolean;
}) {
  if (trackers.length === 0) return null;

  return (
    <section className="mt-12" aria-labelledby={id}>
      <h2 id={id} className="text-title">
        {title}
      </h2>
      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {trackers.map((tracker) => (
          <li key={tracker.key}>
            <Card className="flex h-full flex-col">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle>{tracker.name}</CardTitle>
                {inUse ? <Badge tone="forest">In use</Badge> : null}
              </div>
              <p className="mt-2 flex-1 text-small text-ink-soft">{tracker.what}</p>
              <div className="mt-5">
                <Button asChild variant={inUse ? "secondary" : "primary"} size="sm">
                  <Link href={inUse ? tracker.href : tracker.startHref}>
                    {inUse ? "Open" : "Start"}
                    <span className="sr-only"> {tracker.name.toLowerCase()}</span>
                  </Link>
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
