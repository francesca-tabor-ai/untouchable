import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SideEffectForm } from "@/components/tracking/side-effect-form";
import { StopTreatmentForm } from "@/components/tracking/stop-treatment-form";
import { TreatmentForm } from "@/components/tracking/treatment-form";
import { YellowCardNote } from "@/components/tracking/yellow-card-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { formatDate, toDateInputValue, ukToday } from "@/lib/tracking/dates";
import { interventionOptions, interventionTypeLabel } from "@/lib/tracking/interventions";
import { SEVERITY_OPTIONS } from "@/lib/tracking/side-effects";
import { getTreatmentCourse, stopReasonLabel } from "@/lib/tracking/treatments";

import {
  reportSideEffectAction,
  restartTreatmentAction,
  stopTreatmentAction,
  updateTreatmentAction,
} from "../actions";

export const metadata: Metadata = { title: "A treatment" };

const SAVED_MESSAGES: Record<string, string> = {
  added: "Added to your treatments.",
  changed: "Your changes are saved.",
  stopped: "Recorded as stopped.",
  restarted: "Recorded as current again.",
};

/**
 * One treatment course: what was recorded, how to change it, how to record that it stopped,
 * and how to record a side effect — brief 7.6.
 *
 * A course that has ended is shown with its end date and the reason the person chose from the
 * list. The page does not say the treatment failed, or worked, or suited anybody. It says
 * what they told us and when they told us.
 */
export default async function TreatmentCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireAdult("/treatments");
  await requireTrackingConsent(user.id);

  const { id } = await params;
  const { saved } = await searchParams;

  const course = await getTreatmentCourse(user.id, id);
  // Not theirs, or not there. The same answer either way — a "you may not see this" would
  // confirm that somebody else's treatment exists.
  if (!course) notFound();

  const options = await interventionOptions();
  const suggestions = [...new Set(options.map((option) => option.name))].sort((a, b) =>
    a.localeCompare(b),
  );

  const savedMessage = saved ? SAVED_MESSAGES[saved] : undefined;

  return (
    <Container reading className="py-10 sm:py-16">
      <p>
        <Link
          href="/treatments"
          className="text-small font-medium text-forest-600 underline underline-offset-2"
        >
          Back to your treatments
        </Link>
      </p>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-display">{course.intervention.name}</h1>
          {course.endDate ? <Badge>Stopped</Badge> : <Badge tone="forest">Current</Badge>}
        </div>
        <p className="mt-3 text-ink-soft">
          {interventionTypeLabel(course.intervention.type)} · started{" "}
          {formatDate(course.startDate)}
          {course.endDate ? ` · stopped ${formatDate(course.endDate)}` : ""}
        </p>
        {course.intervention.dmdCode ? null : (
          <p className="mt-2 text-legal text-muted">
            No dm+d code is recorded against this. We only hold a code where we have a real one.
          </p>
        )}
      </header>

      <div role="status" aria-live="polite" className="mt-6 empty:mt-0">
        {savedMessage ? (
          <Callout tone="care" title="Saved">
            <p>{savedMessage}</p>
          </Callout>
        ) : null}
      </div>

      {course.endDate ? (
        <section className="mt-10">
          <h2 className="text-title">What you recorded about stopping</h2>
          <Card className="mt-4 p-5">
            <dl className="grid gap-x-6 gap-y-1 text-small sm:grid-cols-[auto_1fr]">
              <div className="sm:contents">
                <dt className="text-muted sm:text-right">Stopped</dt>
                <dd className="text-ink-soft">{formatDate(course.endDate)}</dd>
              </div>
              {course.stopReason ? (
                <div className="sm:contents">
                  <dt className="text-muted sm:text-right">What led to stopping</dt>
                  <dd className="text-ink-soft">{stopReasonLabel(course.stopReason)}</dd>
                </div>
              ) : null}
            </dl>
            {course.stopReasonNote ? (
              <div className="mt-4 border-t border-line pt-4">
                <p className="text-legal text-muted">
                  Your own words. Never included in research, never shown to anybody else.
                </p>
                <p className="mt-2 text-small text-ink-soft">{course.stopReasonNote}</p>
              </div>
            ) : null}
          </Card>

          <form action={restartTreatmentAction} className="mt-4">
            <input type="hidden" name="courseId" value={course.id} />
            <Button type="submit" variant="secondary">
              I am having this again
            </Button>
          </form>
        </section>
      ) : null}

      <section className="mt-12">
        <h2 className="text-title">Change what you recorded</h2>
        <div className="mt-4">
          <TreatmentForm
            action={updateTreatmentAction}
            courseId={course.id}
            values={{
              name: course.intervention.name,
              type: course.intervention.type,
              dose: course.dose ?? "",
              frequency: course.frequency ?? "",
              route: course.route ?? "",
              startDate: toDateInputValue(course.startDate),
              adherenceRating:
                course.adherenceRating === null ? "" : String(course.adherenceRating),
            }}
            suggestions={suggestions}
            submitLabel="Save my changes"
            legend={`About ${course.intervention.name}`}
          />
        </div>
      </section>

      {course.endDate ? null : (
        <section className="mt-12">
          <h2 className="text-title">Have you stopped this?</h2>
          <p className="mt-2 text-small text-muted">
            Recording when something stopped, and what led to it, is one of the few things this
            platform is placed to find out. Stopping is an ordinary thing to do.
          </p>
          <div className="mt-4">
            <StopTreatmentForm
              action={stopTreatmentAction}
              courseId={course.id}
              defaultEndDate={toDateInputValue(ukToday())}
              defaultAdherence={
                course.adherenceRating === null ? "" : String(course.adherenceRating)
              }
            />
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-title">Side effects</h2>
        <p className="mt-2 text-small text-muted">
          Anything you think this has caused. What you write stays in your own record.
        </p>

        {course.sideEffectReports.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {course.sideEffectReports.map((report) => (
              <li key={report.id}>
                <Card className="p-5">
                  <h3 className="text-small font-semibold text-ink">
                    {formatDate(report.createdAt)}
                  </h3>
                  <p className="mt-1 text-small text-muted">
                    {SEVERITY_OPTIONS.find((option) => option.value === report.severity)?.label ??
                      `${report.severity} out of 5`}
                  </p>
                  <p className="mt-2 text-small text-ink-soft">{report.description}</p>
                </Card>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Brief 7.8. Always on the page, not only after a report: there is then no state in
            which a side effect has been recorded and the signpost is missing. */}
        <div className="mt-6">
          <YellowCardNote />
        </div>

        <div className="mt-6">
          <SideEffectForm
            action={reportSideEffectAction}
            courseId={course.id}
            treatmentName={course.intervention.name}
          />
        </div>

      </section>

      <p className="mt-10 text-small text-muted">
        UnTouchable records and shows what you tell it. It does not give medical advice, it does
        not rank treatments, and nothing here replaces your GP or your clinical team.
      </p>
    </Container>
  );
}
