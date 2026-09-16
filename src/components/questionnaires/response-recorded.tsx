import { Callout } from "@/components/ui/callout";
import type { RedFlagHit } from "@/lib/questionnaires/red-flags";
import type { ResponseSummary } from "@/lib/questionnaires/responses";
import { SUPPORT_CONTACTS } from "@/lib/safety/constants";

/**
 * What somebody sees once their answers are recorded.
 *
 * **A number and a date.** Nothing here says whether a score is high or low, better or worse
 * than last time, or what to do about it — brief principle 7, AGENTS.md rule 9. If you are
 * tempted to add a word of encouragement here, that is the rule this product exists to keep.
 *
 * If any of the version's red flag rules matched, the support contacts we already publish are
 * repeated, quietly, as an offer. Signposting and nothing more: no diagnosis, no alert to
 * anybody, nobody contacted. The proper signposting screen belongs to the safety milestone,
 * which calls `evaluateRedFlags` exactly as these pages do and takes this over — including
 * recording a `SafetyEvent`, which this deliberately does not do.
 *
 * Nothing here asks anybody for money, and nothing that does may be added — AGENTS.md
 * rule 5. Whether a surface may ever ask is decided in one place only, by the charity team's
 * module in `src/lib/charities/`, and it is not this one.
 */
export function ResponseRecorded({
  summary,
  redFlags,
}: {
  summary: ResponseSummary;
  redFlags: RedFlagHit[];
}) {
  return (
    <>
      <section className="rounded-card border border-line bg-white p-6">
        <h2 className="text-title">{summary.title}</h2>
        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-small text-muted">Answered on</dt>
            <dd className="text-body text-ink">{formatDate(summary.completedAt)}</dd>
          </div>
          <div>
            <dt className="text-small text-muted">Score</dt>
            <dd className="text-body text-ink">
              {summary.score === null ? "Not scored" : summary.score}
            </dd>
          </div>
        </dl>
      </section>

      {redFlags.length > 0 ? (
        <Callout tone="care" className="mt-8" title="Somewhere to turn if you want it">
          <ul className="list-disc space-y-1 pl-5">
            {redFlags.map((hit) => (
              <li key={hit.key}>{hit.message}</li>
            ))}
          </ul>
          <p className="mt-3">
            You do not have to do anything with that. If you would like to talk to somebody, these
            are free and open day and night.
          </p>
          <ul className="mt-3 space-y-2">
            {SUPPORT_CONTACTS.map((contact) => (
              <li key={contact.key}>
                <a href={contact.href} className="font-medium">
                  {contact.name} — {contact.contact}
                </a>
                <span className="text-muted block">{contact.detail}</span>
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}
    </>
  );
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
