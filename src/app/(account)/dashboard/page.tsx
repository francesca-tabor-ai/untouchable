import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { healthSummary } from "@/lib/my-health/summary";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { formatDate } from "@/lib/tracking/dates";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * My health → Dashboard. One page that says what somebody has recorded, and where each
 * thing lives.
 *
 * It repeats what the person wrote down and links to it. It does not compare days, average
 * anything or say what a number means (AGENTS.md rule 9), and it never asks for money
 * (rule 5) — somebody may arrive here straight after a check-in that raised a red flag.
 */
export default async function DashboardPage() {
  const user = await requireAdult("/dashboard");
  await requireTrackingConsent(user.id);

  const summary = await healthSummary(user.id);
  const { log, treatments, checkIns, timeline } = summary;

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-display">Dashboard</h1>
      <p className="mt-4 max-w-2xl text-lead text-ink-soft">
        What you have recorded, in one place. It shows what you wrote down and nothing more. It
        does not tell you what any of it means.
      </p>

      <p className="mt-6 text-small text-ink-soft">
        {summary.conditions.length > 0 ? (
          <>
            Your conditions: {summary.conditions.map((condition) => condition.name).join(", ")}.{" "}
          </>
        ) : (
          <>You have not told us about any conditions. </>
        )}
        <Link href="/onboarding/conditions" className="underline underline-offset-2">
          Change these
        </Link>
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Card>
          <CardTitle as="h2">Today&rsquo;s log</CardTitle>
          {log.trackedSymptoms === 0 ? (
            <SummaryText>You have not chosen any symptoms to log yet.</SummaryText>
          ) : log.loggedToday ? (
            <SummaryText>You have logged today. You can change it until midnight.</SummaryText>
          ) : (
            <SummaryText>You have not logged today yet.</SummaryText>
          )}
          {log.latest ? (
            <div className="mt-4">
              <p className="text-small text-muted">Last logged on {formatDate(log.latest.date)}</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-small">
                {log.latest.scores.map((score) => (
                  <div key={score.name} className="contents">
                    <dt className="text-muted">{score.name}</dt>
                    <dd className="tabular-nums text-ink-soft">{score.score} out of 10</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
          <CardAction
            href={log.trackedSymptoms === 0 ? "/onboarding/symptoms" : "/log"}
            label={log.trackedSymptoms === 0 ? "Choose symptoms" : "Open today’s log"}
          />
        </Card>

        <Card>
          <CardTitle as="h2">Medicines and treatments</CardTitle>
          {treatments.length === 0 ? (
            <SummaryText>Nothing logged as current.</SummaryText>
          ) : (
            <ul className="mt-3 space-y-1 text-small text-ink-soft">
              {treatments.map((treatment) => (
                <li key={treatment.id}>
                  {treatment.name}{" "}
                  <span className="text-muted">— since {formatDate(treatment.startDate)}</span>
                </li>
              ))}
            </ul>
          )}
          <CardAction href="/treatments" label="See all treatments" />
        </Card>

        <Card>
          <CardTitle as="h2">Check-ins</CardTitle>
          <SummaryText>
            {checkIns.due === 0
              ? "None waiting for you."
              : checkIns.due === 1
                ? "One is waiting for you."
                : `${checkIns.due} are waiting for you.`}
          </SummaryText>
          {checkIns.next ? (
            <p className="mt-1 text-small text-muted">
              Next: {checkIns.next.questionnaireTitle}, on {formatDate(checkIns.next.dueAt)}
            </p>
          ) : null}
          <CardAction href="/check-ins" label="Open check-ins" />
        </Card>

        <Card>
          <CardTitle as="h2">Your timeline</CardTitle>
          <ul className="mt-3 space-y-1 text-small text-ink-soft">
            <li>{countOf(timeline.entries, "entry", "entries")} recorded</li>
            {timeline.disagreements > 0 ? (
              <li>{countOf(timeline.disagreements, "pair", "pairs")} of entries that disagree</li>
            ) : null}
            {timeline.openItems > 0 ? (
              <li>{countOf(timeline.openItems, "thing", "things")} nobody knows yet</li>
            ) : null}
            <li>
              {countOf(timeline.possibilities, "possibility", "possibilities")} on your list of
              questions for your doctor
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="sm">
              <Link href="/timeline">Open your timeline</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/timeline/questions">Questions to ask</Link>
            </Button>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardTitle as="h2">Before an appointment</CardTitle>
        <SummaryText>
          A printable page of what you have recorded, to take to your GP or send ahead.
        </SummaryText>
        <CardAction href="/timeline/handover" label="Make a handover" />
      </Card>

      <section className="mt-14" aria-labelledby="saved">
        <h2 id="saved" className="text-title">
          Stories you saved
        </h2>
        {summary.savedStories.length === 0 ? (
          <p className="mt-3 text-small text-ink-soft">
            None yet. You can save a story from its page.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-small">
            {summary.savedStories.map((story) => (
              <li key={story.id}>
                <Link
                  href={`/stories/${story.slug}`}
                  className="text-forest-700 underline underline-offset-2"
                >
                  {story.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}

function SummaryText({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-body text-ink-soft">{children}</p>;
}

function CardAction({ href, label }: { href: string; label: string }) {
  return (
    <div className="mt-5">
      <Button asChild variant="secondary" size="sm">
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}

function countOf(count: number, one: string, many: string): string {
  if (count === 0) return `No ${many}`;
  return count === 1 ? `One ${one}` : `${count} ${many}`;
}
