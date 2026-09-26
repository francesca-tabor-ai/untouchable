import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { TRACKERS } from "@/lib/trackers/records";

export const metadata: Metadata = { title: "Health trackers" };

/**
 * The four everyday trackers, and the way in for a phone or watch.
 *
 * Every record behind these links is held on the person's device and never reaches the
 * server — DECISIONS.md HT-01. The guard still runs on every page: a client component
 * holding the data is not a permission check.
 */
export default async function TrackersPage() {
  await requireAdult("/trackers");

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Health trackers</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Write down the everyday things, so you have the dates and the details when someone
        asks. We show you what you wrote. We do not tell you what it means.
      </p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {TRACKERS.map((tracker) => (
          <li key={tracker.key}>
            <Link
              href={tracker.href}
              className="block h-full rounded-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
            >
              <Card interactive className="h-full">
                <CardTitle as="h2">{tracker.name}</CardTitle>
                <CardBody>{tracker.about}</CardBody>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="wearables" className="mt-12">
        <h2 id="wearables" className="text-title">
          Phones and watches
        </h2>
        <p className="mt-2 text-ink-soft">
          Bring in sleep and water from Apple Health, Fitbit or a spreadsheet. The file is read
          on this device and never uploaded.
        </p>
        <p className="mt-3">
          <Link
            href="/trackers/wearables"
            className="font-medium text-forest-700 underline underline-offset-2"
          >
            Connect a wearable
          </Link>
        </p>
      </section>

      <p className="mt-12 text-small text-muted">
        Everything here is kept on this device only. It is not part of your account, and it is
        not used for research.
      </p>
    </Container>
  );
}
