import type { Metadata } from "next";
import Link from "next/link";

import { StepHeader } from "@/components/onboarding/step-header";
import { TreatmentForm } from "@/components/tracking/treatment-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { ONBOARDING_STEPS } from "@/lib/onboarding";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { formatDate, toDateInputValue, ukToday } from "@/lib/tracking/dates";
import { interventionOptions, interventionTypeLabel } from "@/lib/tracking/interventions";
import { listTreatmentCourses } from "@/lib/tracking/treatments";

import { addOnboardingTreatmentAction, confirmTreatmentsAction } from "./actions";

export const metadata: Metadata = { title: "Treatments you are on now" };

const POSITION = ONBOARDING_STEPS.findIndex((step) => step.key === "treatments") + 1;

/**
 * "Treatments you are on now" — brief 7.1, step five.
 *
 * **The whole design question here is the person who takes nothing.** That is a real and
 * common answer, it is not a failure to complete the step, and it must not be harder to give
 * than a list of four medicines. So the step has two endings and both are one tap:
 *
 * - "I am not on any treatment at the moment", when nothing is recorded, or
 * - "That is all of them", when something is.
 *
 * Both write `Profile.treatmentsConfirmedAt`. Null keeps meaning "we have never asked" — the
 * distinction the completeness check depends on, and one that a count of treatment rows
 * cannot make.
 */
export default async function TreatmentsStepPage({
  searchParams,
}: {
  searchParams: Promise<{ added?: string }>;
}) {
  const user = await requireAdult("/onboarding/treatments");
  await requireTrackingConsent(user.id);

  const { added } = await searchParams;

  const [{ current }, options] = await Promise.all([
    listTreatmentCourses(user.id),
    interventionOptions(),
  ]);

  const suggestions = [...new Set(options.map((option) => option.name))].sort((a, b) =>
    a.localeCompare(b),
  );

  const hasAny = current.length > 0;

  return (
    <Container reading className="py-12 sm:py-16">
      <StepHeader
        position={POSITION}
        total={ONBOARDING_STEPS.length}
        title="Treatments you are on now"
        lead="Medicines, supplements, devices, and things that are not medicines at all — physiotherapy, talking therapy, exercise. If you are not on anything, say so and carry on."
      />

      <div role="status" aria-live="polite" className="mt-6 empty:mt-0">
        {added === "1" ? (
          <Callout tone="care" title="Added">
            <p>It is on your list below. Add another, or say that is all of them.</p>
          </Callout>
        ) : null}
      </div>

      <section className="mt-8">
        <h2 className="text-title">What you have told us so far</h2>
        {hasAny ? (
          <ul className="mt-4 space-y-3">
            {current.map((course) => (
              <li key={course.id}>
                <Card className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-body font-semibold text-ink">
                      {course.intervention.name}
                    </h3>
                    <Badge tone="forest">Current</Badge>
                  </div>
                  <p className="mt-2 text-small text-muted">
                    {interventionTypeLabel(course.intervention.type)} · started{" "}
                    {formatDate(course.startDate)}
                    {course.dose ? ` · ${course.dose}` : ""}
                    {course.frequency ? ` · ${course.frequency}` : ""}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-ink-soft">Nothing yet.</p>
        )}
      </section>

      {/* One tap to finish, before the add form rather than after it — the person who has
          nothing to add should not have to scroll past a form to say so. */}
      <form action={confirmTreatmentsAction} className="mt-8">
        <Button type="submit" size="lg" block>
          {hasAny ? "That is all of them" : "I am not on any treatment at the moment"}
        </Button>
      </form>

      <p className="mt-3 text-small text-muted">
        {hasAny
          ? "You can add more, change them, or record that you have stopped one, at any time."
          : "Saying this is a real answer and we record it as one. You can add treatments at any time."}
      </p>

      <details className="mt-8 rounded-card border border-line bg-white" open={!hasAny}>
        <summary className="cursor-pointer rounded-card px-5 py-4 text-body font-medium text-ink">
          {hasAny ? "Add another treatment" : "Add a treatment"}
        </summary>
        <div className="border-t border-line px-5 py-5">
          <TreatmentForm
            action={addOnboardingTreatmentAction}
            values={{
              name: "",
              type: "",
              dose: "",
              frequency: "",
              route: "",
              startDate: toDateInputValue(ukToday()),
              adherenceRating: "",
            }}
            suggestions={suggestions}
            submitLabel="Add this treatment"
            legend="About this treatment"
          />
        </div>
      </details>

      <Callout className="mt-10" title="If it is not in the suggestions">
        <p>
          Type it in anyway. The suggestions are a short sample list, not a limit. We do not hold a
          standard medicine code unless we have a real one, so there is nothing to match against.
        </p>
      </Callout>

      <p className="mt-8">
        <Link
          href="/onboarding"
          className="text-small font-medium text-forest-600 underline underline-offset-2"
        >
          Back to setting up
        </Link>
      </p>
    </Container>
  );
}
