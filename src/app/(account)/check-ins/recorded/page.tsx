import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ResponseRecorded } from "@/components/questionnaires/response-recorded";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { evaluateRedFlags } from "@/lib/questionnaires/red-flags";
import { ownResponse } from "@/lib/questionnaires/responses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your answers are recorded" };

export default async function CheckInRecordedPage({
  searchParams,
}: {
  searchParams: Promise<{ response?: string }>;
}) {
  const user = await requireAdult("/check-ins");
  await requireTrackingConsent(user.id);

  const { response: responseId } = await searchParams;
  if (!responseId) notFound();

  const recorded = await ownResponse(user.id, responseId);
  if (!recorded) notFound();

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Your answers are recorded</h1>
      <p className="mt-4 text-lead text-ink-soft">Thank you for taking the time.</p>

      <div className="mt-8">
        <ResponseRecorded
          summary={recorded.summary}
          redFlags={evaluateRedFlags(recorded.version.row, recorded.answers)}
        />
      </div>

      <div className="mt-8">
        <Button asChild size="lg">
          <Link href="/check-ins">Back to your check-ins</Link>
        </Button>
      </div>

      <p className="mt-10 text-small text-muted">
        UnTouchable records and shows information. It does not tell you what a score means, and
        nothing here replaces your GP or your clinical team.
      </p>
    </Container>
  );
}
