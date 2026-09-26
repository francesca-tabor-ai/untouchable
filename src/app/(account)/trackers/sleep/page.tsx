import type { Metadata } from "next";
import Link from "next/link";

import { SleepTracker } from "@/components/trackers/sleep-tracker";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Sleep" };

/** Records live on the device (DECISIONS.md HT-01); the guard runs here all the same. */
export default async function SleepPage() {
  await requireAdult("/trackers/sleep");

  return (
    <Container reading className="py-12 sm:py-16">
      <p className="text-small">
        <Link href="/tracker" className="text-forest-700 underline underline-offset-2">
          Health tracker
        </Link>
      </p>
      <h1 className="mt-2 text-display">Sleep</h1>
      <p className="mt-4 text-lead text-ink-soft">How long and how well you slept.</p>

      <div className="mt-8">
        <SleepTracker />
      </div>
    </Container>
  );
}
