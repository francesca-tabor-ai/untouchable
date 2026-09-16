import type { Metadata } from "next";
import Link from "next/link";

import { DailyLogForm } from "@/components/tracking/daily-log-form";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { CONTEXT_TAGS, contextTagLabel } from "@/lib/tracking/context-tags";
import { dailyLogScreen, recentLogs } from "@/lib/tracking/daily-log";
import { formatDate, formatLongDate } from "@/lib/tracking/dates";

import { saveDailyLogAction } from "./actions";

export const metadata: Metadata = { title: "Today's log" };

/**
 * The daily quick log — brief 7.5.
 *
 * One screen. Sliders that already hold a value, optional tags, an optional note folded
 * away, and one button. A minimal complete log is **one tap and no typing**, which is what
 * `tests/unit/daily-log-speed.test.tsx` measures by taking the form exactly as rendered,
 * submitting nothing, and checking what comes back is already valid and complete.
 *
 * Saving again on the same day is an edit, not an error: `DailyLog` is unique on
 * (userId, date) and the domain upserts.
 *
 * Nothing on this page interprets anything. There is no comparison with yesterday, no
 * average, no arrow and no colour standing in for good or bad.
 */
export default async function DailyLogPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireAdult("/log");
  await requireTrackingConsent(user.id);

  const { saved } = await searchParams;
  const screen = await dailyLogScreen(user.id);

  if (screen.symptoms.length === 0) {
    return (
      <Container reading className="py-12 sm:py-16">
        <h1 className="text-display">Today&rsquo;s log</h1>
        <Callout tone="care" className="mt-8" title="Choose what to keep an eye on first">
          <p>
            The daily log is built from the symptoms you choose, so there is nothing to show you
            yet. It takes a minute, and you can change your mind whenever you like.
          </p>
        </Callout>
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href="/onboarding/symptoms">Choose your symptoms</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const history = await recentLogs(user.id, 7);

  return (
    <Container reading className="py-10 sm:py-16">
      <header>
        <h1 className="text-display">Today&rsquo;s log</h1>
        <p className="mt-2 text-lead text-ink-soft">{formatLongDate(screen.date)}</p>
      </header>

      {/* Announced, and impossible to miss, without being a separate screen to dismiss. */}
      <div role="status" aria-live="polite" className="mt-6 empty:mt-0">
        {saved === "1" ? (
          <Callout tone="care" title="Saved">
            <p>
              Today&rsquo;s log is saved. You can change it as many times as you like today — open
              this page again and it will be here as you left it.
            </p>
          </Callout>
        ) : null}
      </div>

      <div className="mt-4 space-y-1 text-small text-muted">
        {screen.alreadyLogged ? (
          <p>You have already logged today. Anything you change here replaces it.</p>
        ) : screen.carriedFrom ? (
          <p>
            The sliders start where you left them on {formatDate(screen.carriedFrom)}. Move any
            that are different today.
          </p>
        ) : (
          <p>The sliders start in the middle. Move each one to where today has been.</p>
        )}
        <p>The note and the tags are both optional.</p>
      </div>

      <div className="mt-6">
        <DailyLogForm
          action={saveDailyLogAction}
          symptoms={screen.symptoms}
          tags={CONTEXT_TAGS}
          chosenTags={screen.tags}
          note={screen.note}
          alreadyLogged={screen.alreadyLogged}
        />
      </div>

      <section className="mt-12">
        <h2 className="text-title">What you have recorded lately</h2>
        <p className="mt-2 text-small text-muted">
          The last seven days you logged, exactly as you recorded them.
        </p>

        {history.length === 0 ? (
          <p className="mt-4 text-ink-soft">Nothing yet. Today will be the first.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {history.map((entry) => (
              <li key={entry.id}>
                <Card className="p-5">
                  <h3 className="text-body font-semibold text-ink">{formatDate(entry.date)}</h3>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-small sm:grid-cols-[auto_1fr]">
                    {entry.scores.map((score) => (
                      <div key={score.name} className="sm:contents">
                        <dt className="text-muted sm:text-right">{score.name}</dt>
                        <dd className="tabular-nums text-ink-soft">{score.score} out of 10</dd>
                      </div>
                    ))}
                  </dl>
                  {entry.tags.length > 0 ? (
                    <p className="mt-3 text-small text-ink-soft">
                      {entry.tags.map(contextTagLabel).join(" · ")}
                    </p>
                  ) : null}
                  {entry.note ? (
                    <p className="mt-3 border-t border-line pt-3 text-small text-ink-soft">
                      {entry.note}
                    </p>
                  ) : null}
                </Card>
              </li>
            ))}
          </ol>
        )}
      </section>

      <nav aria-label="Other tracking pages" className="mt-10">
        <Link
          href="/treatments"
          className="text-small font-medium text-forest-600 underline underline-offset-2"
        >
          Your treatments
        </Link>
      </nav>

      <p className="mt-8 text-small text-muted">
        UnTouchable records and shows what you tell it. It does not give medical advice, and
        nothing here replaces your GP or your clinical team.
      </p>
    </Container>
  );
}
