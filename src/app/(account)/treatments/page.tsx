import type { Metadata } from "next";
import Link from "next/link";

import { TreatmentSummary } from "@/components/tracking/treatment-summary";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { formatDate } from "@/lib/tracking/dates";
import { treatmentsConfirmedAt } from "@/lib/tracking/onboarding-step";
import { listTreatmentCourses } from "@/lib/tracking/treatments";

export const metadata: Metadata = { title: "Your treatments" };

/**
 * Everything one person is having, and everything they have stopped — brief 7.6.
 *
 * Two lists, in the order somebody actually needs them. No ranking, no scoring, nothing
 * about whether a treatment did anything: this page shows what was recorded and when.
 */
export default async function TreatmentsPage() {
  const user = await requireAdult("/treatments");
  await requireTrackingConsent(user.id);

  const [{ current, stopped }, confirmedAt] = await Promise.all([
    listTreatmentCourses(user.id),
    treatmentsConfirmedAt(user.id),
  ]);

  return (
    <Container reading className="py-10 sm:py-16">
      <header>
        <h1 className="text-display">Your treatments</h1>
        <p className="mt-4 text-lead text-ink-soft">
          Medicines, supplements, devices and everything else you are having — including the
          things that are not medicines at all.
        </p>
        {confirmedAt ? (
          <p className="mt-4 text-small text-muted">
            You last told us this list was up to date on {formatDate(confirmedAt)}.
          </p>
        ) : null}
      </header>

      <div className="mt-8">
        <Button asChild size="lg" block>
          <Link href="/treatments/new">Add a treatment</Link>
        </Button>
      </div>

      <section className="mt-12">
        <h2 className="text-title">What you are having now</h2>
        {current.length === 0 ? (
          <Callout className="mt-4" title="Nothing recorded">
            <p>
              You have not recorded anything you are having at the moment. If you are not on
              anything, that is a real answer and there is nothing to do here.
            </p>
          </Callout>
        ) : (
          <ul className="mt-4 space-y-3">
            {current.map((course) => (
              <li key={course.id}>
                <TreatmentSummary course={course} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {stopped.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-title">What you have stopped</h2>
          <p className="mt-2 text-small text-muted">
            Kept because when something started and stopped is part of your own record.
          </p>
          <ul className="mt-4 space-y-3">
            {stopped.map((course) => (
              <li key={course.id}>
                <TreatmentSummary course={course} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav aria-label="Other tracking pages" className="mt-12">
        <Link
          href="/log"
          className="text-small font-medium text-forest-600 underline underline-offset-2"
        >
          Today&rsquo;s log
        </Link>
      </nav>

      <p className="mt-8 text-small text-muted">
        UnTouchable records and shows what you tell it. It does not give medical advice, it does
        not rank treatments, and nothing here replaces your GP or your clinical team.
      </p>
    </Container>
  );
}
