import type { Metadata } from "next";
import Link from "next/link";

import { formatDate } from "@/components/questionnaires/response-recorded";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { pendingCheckIns } from "@/lib/questionnaires/check-ins";
import { responseHistory } from "@/lib/questionnaires/responses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your check-ins" };

/**
 * The check-ins waiting for somebody, and what they have answered before.
 *
 * The history is a date and a number per row. It does not say whether a score went up or
 * down, and it must never start doing so — brief principle 7, AGENTS.md rule 9.
 *
 * Nothing on this page asks anybody for money, and nothing that does may be added.
 */
export default async function CheckInsPage() {
  const user = await requireAdult("/check-ins");
  await requireTrackingConsent(user.id);

  const [pending, history] = await Promise.all([pendingCheckIns(user.id), responseHistory(user.id)]);
  const now = new Date();

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Your check-ins</h1>
      <p className="mt-4 text-lead text-ink-soft">
        A few questions, every so often, so that what changes over time is written down somewhere.
      </p>

      <h2 className="mt-10 text-title">Waiting for you</h2>
      {pending.length === 0 ? (
        <p className="mt-4 text-ink-soft">
          Nothing is waiting for you at the moment. We will let you know when the next one is due.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {pending.map((checkIn) => (
            <li key={checkIn.id} className="rounded-card border border-line bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-body font-semibold text-ink">{checkIn.questionnaireTitle}</h3>
                  <p className="mt-1 text-small text-muted">
                    Due {formatDate(checkIn.dueAt)}
                  </p>
                </div>
                {checkIn.dueAt <= now ? <Badge tone="clay">Ready now</Badge> : <Badge>Later</Badge>}
              </div>
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link href={`/check-ins/${checkIn.id}`}>
                    Answer <span className="sr-only">{checkIn.questionnaireTitle}</span>
                  </Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-12 text-title">What you have answered</h2>
      {history.length === 0 ? (
        <p className="mt-4 text-ink-soft">You have not answered anything yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[26rem] border-collapse text-left text-small">
            <caption className="sr-only">
              Every set of answers you have recorded, with its date and its score. The score is a
              number only — it is not a judgement about your health.
            </caption>
            <thead>
              <tr className="border-b border-line-strong">
                <th scope="col" className="py-3 pr-4 font-semibold">
                  Questions
                </th>
                <th scope="col" className="py-3 pr-4 font-semibold">
                  Answered
                </th>
                <th scope="col" className="py-3 font-semibold">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-b border-line align-top">
                  <th scope="row" className="py-4 pr-4 font-medium">
                    {row.title}
                    <span className="mt-1 block font-normal text-muted">Version {row.version}</span>
                  </th>
                  <td className="py-4 pr-4">{formatDate(row.completedAt)}</td>
                  <td className="py-4">{row.score === null ? "Not scored" : row.score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Callout className="mt-10" title="What a score is, and is not">
        <p>
          A score is the arithmetic the questionnaire defines, worked out from your answers. It is
          not a measure of how well you are, and it does not mean anything on its own. If you are
          worried about your health, speak to your GP.
        </p>
      </Callout>
    </Container>
  );
}
