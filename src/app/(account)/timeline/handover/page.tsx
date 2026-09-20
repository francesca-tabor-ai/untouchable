import type { Metadata } from "next";
import Link from "next/link";

import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { flagAreasFor } from "@/lib/timeline/areas";
import {
  buildLongScript,
  buildShortScript,
  SHORT_SCRIPT_MAX_WORDS,
  type HandoverInput,
} from "@/lib/timeline/handover";
import { loadTimeline } from "@/lib/timeline/queries";
import { ukToday } from "@/lib/tracking/dates";

export const metadata: Metadata = { title: "Your handover" };

/**
 * The two things a person leaves with — brief 7.7, "download a summary to share with my GP".
 *
 * Both are generated from the record and neither can be edited here. That is the point: a
 * handover somebody has tidied up is a handover with the awkward bits smoothed off, and the
 * awkward bits — the date nobody is sure of, the result nobody ever read back — are the
 * parts a clinician most needs.
 *
 * The short one is first because it is the one used at three in the morning, and it is the
 * one somebody is holding when they are least able to scroll.
 *
 * Printing is the browser's own. No print stylesheet framework, no PDF library, no
 * third-party anything on a page with health content on it (AGENTS.md rule 11).
 */
export default async function HandoverPage() {
  const user = await requireAdult("/timeline/handover");
  await requireTrackingConsent(user.id);

  const [timeline, profile] = await Promise.all([
    loadTimeline(user.id),
    db.profile.findUnique({
      where: { userId: user.id },
      select: { displayName: true, yearOfBirth: true },
    }),
  ]);

  const today = ukToday();
  const input: HandoverInput = {
    person: {
      displayName: profile?.displayName ?? null,
      // Year of birth only — we never hold a full date of birth, so this is the age they
      // will be this year and is honest about being that.
      age: profile?.yearOfBirth ? today.getUTCFullYear() - profile.yearOfBirth : null,
    },
    today,
    symptoms: timeline.symptoms,
    observations: timeline.observations,
    events: timeline.events,
    standingFacts: timeline.standingFacts,
    candidates: timeline.candidates,
    areas: flagAreasFor(timeline.symptoms.map((symptom) => symptom.name)),
    reason: null,
    asking: null,
  };

  const short = buildShortScript(input);
  const long = buildLongScript(input);

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Your handover</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Two versions, made from what you have written down. Both are meant to be read out
        loud, so they are written the way you would say them.
      </p>

      <section className="mt-14" aria-labelledby="short">
        <h2 id="short" className="text-title">
          For a phone call
        </h2>
        <p className="mt-2 text-small text-ink-soft">
          NHS 111, out of hours, or a receptionist. About fifty seconds. Read it, then stop.
        </p>

        <Card className="mt-6">
          <div className="space-y-3 text-lead text-ink">
            {short.sentences.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          <p className="mt-5 text-body font-semibold text-forest-800">{short.stopLine}</p>
          <p className="mt-4 text-small text-muted">
            {short.wordCount} words, out of {SHORT_SCRIPT_MAX_WORDS}.
          </p>
        </Card>

        {short.omitted ? <p className="mt-4 text-small text-muted">{short.omitted}</p> : null}

        {short.exactPhrases.length > 0 ? (
          <Callout tone="care" className="mt-6" title="Say these words in particular">
            <ul className="space-y-3">
              {short.exactPhrases.map((phrase) => (
                <li key={phrase.say}>
                  <p className="text-body text-ink">&ldquo;{phrase.say}&rdquo;</p>
                  <p className="mt-1 text-small">{phrase.why}</p>
                </li>
              ))}
            </ul>
          </Callout>
        ) : null}

        <div className="mt-6">
          <h3 className="text-title">What they will probably ask</h3>
          <p className="mt-2 text-small text-ink-soft">
            These are not in the script, and there are no answers written here. Answer them as
            they are on the day.
          </p>
          <dl className="mt-4 space-y-4">
            {short.likelyQuestions.map((item) => (
              <div key={item.question}>
                <dt className="text-body font-medium text-ink">{item.question}</dt>
                <dd className="mt-1 text-small text-muted">Have ready: {item.haveReady}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mt-16" aria-labelledby="long">
        <h2 id="long" className="text-title">
          For an appointment
        </h2>
        <p className="mt-2 text-small text-ink-soft">
          One side of A4. Print it, or hand over your phone.
        </p>

        <Card className="mt-6 space-y-6">
          <p className="text-body font-medium text-ink">{long.header}</p>

          <div>
            {long.standingFacts.map((group) => (
              <p key={group.label} className="text-body text-ink">
                <span className="font-semibold">{group.label}:</span> {group.values.join("; ")}
              </p>
            ))}
          </div>

          <div>
            <h3 className="text-small font-semibold uppercase tracking-wide text-muted">
              What happened, in order
            </h3>
            <ul className="mt-2 space-y-2 text-body text-ink">
              {long.chronology.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            {long.omitted ? <p className="mt-2 text-small text-muted">{long.omitted}</p> : null}
          </div>

          <div>
            <h3 className="text-small font-semibold uppercase tracking-wide text-muted">
              Where it is now
            </h3>
            <ul className="mt-2 space-y-2 text-body text-ink">
              {long.currentStatus.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-small font-semibold uppercase tracking-wide text-muted">
              Things I do not have
            </h3>
            <ul className="mt-2 space-y-2 text-body text-ink">
              {long.keyNegatives.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-small font-semibold uppercase tracking-wide text-muted">
              What I want to ask
            </h3>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-body text-ink">
              {long.questions.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          </div>
        </Card>

        <p className="mt-4 text-small text-muted">
          {long.wordCount} words. Anything marked as coming from memory is marked that way on
          purpose — a remembered result written down flatly reads as a clinical record, and it
          is not one.
        </p>
      </section>

      <section className="mt-16" aria-labelledby="take">
        <h2 id="take" className="text-title">
          What to take with you
        </h2>
        <ul className="mt-4 space-y-2 text-body text-ink">
          {long.takeWithYou.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <Callout tone="neutral" className="mt-14" title="What is not in here">
        <p>
          The list of things you have been wondering about is not in this document, and will
          not be. It comes across as questions instead, which is what you want answered.
        </p>
        <p className="mt-3">
          <Link href="/timeline" className="underline underline-offset-2">
            Back to your timeline
          </Link>
        </p>
      </Callout>
    </Container>
  );
}
