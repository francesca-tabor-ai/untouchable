import type { Metadata } from "next";
import Link from "next/link";

import { BloodTestsTracker } from "@/components/trackers/blood-tests-tracker";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Blood test results" };

/** Records live on the device (DECISIONS.md HT-01); the guard runs here all the same. */
export default async function BloodTestsPage() {
  await requireAdult("/trackers/blood-tests");

  return (
    <Container reading className="py-12 sm:py-16">
      <p className="text-small">
        <Link href="/trackers" className="text-forest-700 underline underline-offset-2">
          Health trackers
        </Link>
      </p>
      <h1 className="mt-2 text-display">Blood test results</h1>
      <p className="mt-4 text-lead text-ink-soft">Your results, written down with the date and where they came from.</p>

      <div className="mt-8">
        <BloodTestsTracker />
      </div>
    </Container>
  );
}
