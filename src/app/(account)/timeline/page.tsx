import type { Metadata } from "next";
import Link from "next/link";

import { Chronology, toEntries } from "@/components/timeline/chronology";
import { ContradictionCard } from "@/components/timeline/contradiction-card";
import {
  EventForm,
  ObservationForm,
  StandingFactForm,
} from "@/components/timeline/entry-forms";
import { OpenItemsList } from "@/components/timeline/open-items-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { loadTimeline, reviewTimeline } from "@/lib/timeline/queries";
import {
  STANDING_FACT_LABELS,
  STANDING_FACT_ORDER,
  SYMPTOM_STATUS_LABELS,
  UNCONFIRMED,
} from "@/lib/timeline/records";
import { formatDate, toDateInputValue, ukToday } from "@/lib/tracking/dates";

import {
  addEventAction,
  addObservationAction,
  addStandingFactAction,
  deleteTimelineAction,
  resolveContradictionAction,
  retireStandingFactAction,
} from "./actions";

export const metadata: Metadata = { title: "Your timeline" };

/**
 * The symptom timeline.
 *
 * The daily log answers "how bad was it today" in under thirty seconds. This answers a
 * different question — what has actually happened since March, and what do I say in the
 * eleven minutes I get with a GP.
 *
 * The order of the page is the order of the work. Disagreements first, because a
 * contradiction found after an appointment is a contradiction that went to the appointment.
 * Then the things nobody knows, ordered by what they would change. Then the record itself.
 * The forms are last: adding is the easy part, and putting it at the top would make this
 * look like a diary rather than something you take with you.
 *
 * Nothing on this page interprets anything, and nothing on it asks anybody for money
 * (AGENTS.md rules 5 and 9).
 */
export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const user = await requireAdult("/timeline");
  await requireTrackingConsent(user.id);

  const { saved, deleted } = await searchParams;
  const timeline = await loadTimeline(user.id);
  const { contradictions, openItems } = reviewTimeline(timeline);

  const today = toDateInputValue(ukToday());
  const trackable = timeline.symptoms.filter((symptom) => symptom.active);
  const names = new Map(timeline.symptoms.map((symptom) => [symptom.id, symptom.name]));
  const entries = toEntries(timeline.observations, timeline.events, names);

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Your timeline</h1>
      <p className="mt-4 text-lead text-ink-soft">
        A dated record of what has happened, kept so that you can hand it over rather than
        remember it under pressure.
      </p>

      {saved ? (
        <p className="mt-6 text-small text-forest-700" role="status">
          Saved.
        </p>
      ) : null}
      {deleted ? (
        <p className="mt-6 text-small text-forest-700" role="status">
          Your timeline has been deleted. Nothing of it is left.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/timeline/handover">Make a handover</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/timeline/questions">Questions to ask</Link>
        </Button>
      </div>

      {contradictions.length > 0 ? (
        <section className="mt-14" aria-labelledby="disagreements">
          <h2 id="disagreements" className="text-title">
            Two entries disagree
          </h2>
          <p className="mt-2 text-small text-ink-soft">
            Both versions are kept. Choosing one marks the other as replaced — it is never
            deleted, because the fact that your record once said something else is worth
            knowing on its own.
          </p>
          <div className="mt-6 space-y-5">
            {contradictions.map((contradiction) => (
              <ContradictionCard
                key={contradiction.key}
                contradiction={contradiction}
                resolveAction={resolveContradictionAction}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-14" aria-labelledby="open-items">
        <h2 id="open-items" className="text-title">
          Still to pin down
        </h2>
        <p className="mt-2 text-small text-ink-soft">
          Anything marked {UNCONFIRMED} reaches a clinician as something nobody has checked.
          These are in the order of how much each one would change the conversation.
        </p>
        <div className="mt-6">
          <OpenItemsList items={openItems} />
        </div>
      </section>

      <section className="mt-14" aria-labelledby="symptoms">
        <h2 id="symptoms" className="text-title">
          What you are tracking
        </h2>
        <ul className="mt-6 space-y-3">
          {trackable.map((symptom) => (
            <li key={symptom.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body font-medium text-ink">{symptom.name}</p>
                <Badge>{SYMPTOM_STATUS_LABELS[symptom.status]}</Badge>
              </div>
              <p className="mt-1 text-small text-muted">
                Started{" "}
                {symptom.firstOnset
                  ? `${formatDate(symptom.firstOnset)}${
                      symptom.firstOnsetConfidence === "unconfirmed" ? ` ${UNCONFIRMED}` : ""
                    }`
                  : UNCONFIRMED}
              </p>
            </li>
          ))}
          {trackable.length === 0 ? (
            <li className="text-body text-muted">
              You have not chosen any symptoms yet.{" "}
              <Link href="/onboarding/symptoms" className="underline underline-offset-2">
                Choose them here
              </Link>
              .
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-14" aria-labelledby="standing-facts">
        <h2 id="standing-facts" className="text-title">
          Things that go at the top of every handover
        </h2>
        <p className="mt-2 text-small text-ink-soft">
          Allergies, what you take, and the things you do <em>not</em> have. The last of those
          is the one clinicians ask for and nobody thinks to write down.
        </p>

        <div className="mt-6 space-y-5">
          {STANDING_FACT_ORDER.map((category) => {
            const facts = timeline.standingFacts.filter(
              (fact) => fact.active && fact.category === category,
            );
            return (
              <div key={category}>
                <h3 className="text-small font-semibold text-ink">
                  {STANDING_FACT_LABELS[category]}
                </h3>
                {facts.length === 0 ? (
                  <p className="mt-1 text-small text-muted">Nothing recorded.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {facts.map((fact) => (
                      <li key={fact.id} className="flex items-center justify-between gap-4">
                        <span className="text-body text-ink">{fact.value}</span>
                        <form action={retireStandingFactAction}>
                          <input type="hidden" name="id" value={fact.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Remove
                          </Button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <details className="mt-6 rounded-card border border-line bg-cream-50 p-5">
          <summary className="cursor-pointer text-small font-medium text-ink">Add one</summary>
          <div className="mt-5">
            <StandingFactForm action={addStandingFactAction} />
          </div>
        </details>
      </section>

      <section className="mt-14" aria-labelledby="record">
        <h2 id="record" className="text-title">
          The record
        </h2>
        <div className="mt-6">
          <Chronology entries={entries} />
        </div>
      </section>

      <section className="mt-14" aria-labelledby="add">
        <h2 id="add" className="text-title">
          Add something
        </h2>

        <Card className="mt-6">
          <h3 className="text-title">Something a symptom did</h3>
          <div className="mt-5">
            {trackable.length > 0 ? (
              <ObservationForm
                action={addObservationAction}
                symptoms={trackable.map((symptom) => ({ id: symptom.id, name: symptom.name }))}
                today={today}
              />
            ) : (
              <p className="text-body text-muted">
                Choose the symptoms you want to track first, and they will appear here.
              </p>
            )}
          </div>
        </Card>

        <Card className="mt-6">
          <h3 className="text-title">Something that happened</h3>
          <p className="mt-2 text-small text-muted">
            An appointment, a test, a change of medicine, a fall, a house move. Anything a
            clinician might connect to the dates.
          </p>
          <div className="mt-5">
            <EventForm action={addEventAction} today={today} />
          </div>
        </Card>
      </section>

      <section className="mt-14" aria-labelledby="your-data">
        <h2 id="your-data" className="text-title">
          Your data
        </h2>
        <p className="mt-2 text-small text-ink-soft">
          All of it, whenever you want it, without being asked why. The download includes the
          entries you have replaced, because what you used to believe about your own illness is
          part of the record.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="secondary">
            <a href="/timeline/export?format=markdown" download>
              Download as a document
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href="/timeline/export?format=json" download>
              Download as data
            </a>
          </Button>
        </div>

        <details className="mt-6 rounded-card border border-line bg-cream-50 p-5">
          <summary className="cursor-pointer text-small font-medium text-ink">
            Delete your timeline
          </summary>
          <div className="mt-4">
            <p className="text-small text-ink-soft">
              This removes every entry, every possibility you listed and everything you have
              replaced. It cannot be undone, and there is no copy kept. Your account, your daily
              log and your check-ins are not touched.
            </p>
            <form action={deleteTimelineAction} className="mt-5">
              <Button type="submit" variant="dark">
                Delete my timeline
              </Button>
            </form>
          </div>
        </details>
      </section>

      <Callout tone="neutral" className="mt-14" title="What this is not">
        <p>
          UnTouchable records what you tell it and shows it back to you. It does not work out
          what is wrong, and nothing here is medical advice. If you are worried about your
          health, contact your GP or NHS 111. In an emergency, call 999.
        </p>
      </Callout>
    </Container>
  );
}
