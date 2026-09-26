import type { Metadata } from "next";
import Link from "next/link";

import { BowelTracker } from "@/components/trackers/bowel-tracker";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Bowel habits (poo)" };

/** Records live on the device (DECISIONS.md HT-01); the guard runs here all the same. */
export default async function BowelPage() {
  await requireAdult("/trackers/bowel");

  return (
    <Container reading className="py-12 sm:py-16">
      <p className="text-small">
        <Link href="/trackers" className="text-forest-700 underline underline-offset-2">
          Health trackers
        </Link>
      </p>
      <h1 className="mt-2 text-display">Bowel habits (poo)</h1>
      <p className="mt-4 text-lead text-ink-soft">How often, and what it was like.</p>

      <div className="mt-8">
        <BowelTracker />
      </div>
    </Container>
  );
}
