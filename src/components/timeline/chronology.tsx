import { Badge } from "@/components/ui/badge";
import type { EventRecord, ObservationRecord } from "@/lib/timeline/contradictions";
import {
  CONFIDENCE_LABELS,
  EVENT_TYPE_LABELS,
  SOURCE_LABELS,
  UNCONFIRMED,
} from "@/lib/timeline/records";
import { formatDate } from "@/lib/tracking/dates";

/**
 * The timeline itself: everything that happened, newest first.
 *
 * Superseded entries stay on the list, greyed and labelled. They are not clutter — that a
 * record once said March and now says February is a real thing about this person's account
 * of their own illness, and hiding it puts us back where we started.
 *
 * Nothing here interprets anything. No arrows, no averages, no colour standing in for better
 * or worse. A date, what was written, and where it came from.
 */

export interface ChronologyEntry {
  id: string;
  when: Date;
  recordedAt: Date;
  title: string;
  detail: string | null;
  kind: "observation" | "event";
  typeLabel: string;
  source: keyof typeof SOURCE_LABELS;
  confidence: keyof typeof CONFIDENCE_LABELS;
  supersededAt: Date | null;
  supersededReason: string | null;
}

export function toEntries(
  observations: (ObservationRecord & {
    character: string | null;
    supersededReason: string | null;
  })[],
  events: (EventRecord & { outcome: string | null; supersededReason: string | null })[],
  symptomNames: Map<string, string>,
): ChronologyEntry[] {
  const fromObservations: ChronologyEntry[] = observations.map((row) => ({
    id: row.id,
    when: row.occurredAt,
    recordedAt: row.recordedAt,
    title: `${symptomNames.get(row.userSymptomId) ?? "A symptom"}${
      row.severity === null ? "" : ` — ${row.severity} out of 10`
    }`,
    detail: row.character,
    kind: "observation",
    typeLabel: "Symptom",
    source: row.source,
    confidence: row.confidence,
    supersededAt: row.supersededAt,
    supersededReason: row.supersededReason,
  }));

  const fromEvents: ChronologyEntry[] = events.map((row) => ({
    id: row.id,
    when: row.occurredAt,
    recordedAt: row.recordedAt,
    title: row.description,
    detail: row.outcome,
    kind: "event",
    typeLabel: EVENT_TYPE_LABELS[row.type],
    source: row.source,
    confidence: row.confidence,
    supersededAt: row.supersededAt,
    supersededReason: row.supersededReason,
  }));

  return [...fromObservations, ...fromEvents].sort(
    (a, b) => b.when.getTime() - a.when.getTime(),
  );
}

export function Chronology({ entries }: { entries: ChronologyEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-body text-muted">
        Nothing on your timeline yet. Add the thing you would want a doctor to know first.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => {
        const replaced = entry.supersededAt !== null;
        const differentDay =
          entry.recordedAt.toDateString() !== entry.when.toDateString();

        return (
          <li
            key={`${entry.kind}-${entry.id}`}
            className={`rounded-card border border-line p-5 ${
              replaced ? "bg-cream-100 opacity-70" : "bg-white"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-small font-medium text-ink">{formatDate(entry.when)}</p>
              <Badge>{entry.typeLabel}</Badge>
              {entry.confidence === "unconfirmed" ? <Badge tone="clay">{UNCONFIRMED}</Badge> : null}
              {replaced ? <Badge tone="quiet">Replaced</Badge> : null}
            </div>

            <p className="mt-2 text-body text-ink">{entry.title}</p>
            {entry.detail ? <p className="mt-1 text-small text-ink-soft">{entry.detail}</p> : null}

            <p className="mt-3 text-small text-muted">
              {SOURCE_LABELS[entry.source]} · {CONFIDENCE_LABELS[entry.confidence]}
              {differentDay ? ` · written down on ${formatDate(entry.recordedAt)}` : null}
            </p>

            {replaced && entry.supersededReason ? (
              <p className="mt-2 text-small text-muted">
                Replaced by a later entry. {entry.supersededReason}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
