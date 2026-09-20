import type {
  RecordConfidence,
  RecordSource,
  SymptomStatus,
  TimelineEventType,
} from "@/generated/prisma";

import { formatDate, toDateOnly } from "@/lib/tracking/dates";

import { comparePrecedence, type Sourced } from "./provenance";
import { SOURCE_SHORT } from "./records";

/**
 * Finding the places where the record disagrees with itself.
 *
 * This is the function the provenance columns exist for. A timeline kept over eight months
 * will contradict itself — someone writes "started in March" in June, then finds a text
 * message from February saying their arm had gone numb. Both entries are honest. One of
 * them is wrong, and which one is wrong is the difference between a referral and a
 * reassurance.
 *
 * Three rules, and the third is the one that is tempting to break:
 *
 *   1. Scan on every write, not on a schedule. A contradiction found next Tuesday is a
 *      contradiction that already went to an appointment.
 *   2. Surface both versions with both sources and both dates. Never show one.
 *   3. **Never resolve one silently.** Not even when precedence makes the answer obvious.
 *      A system that quietly rewrites somebody's account of their own illness, and is right
 *      nine times out of ten, is worse than one that asks — because the tenth time it is
 *      wrong there is nothing left on the screen to notice it with.
 *
 * Everything here is pure. Prisma rows satisfy these interfaces structurally, and so do
 * fixtures, so the rules can be tested without a database.
 */

export interface ObservationRecord extends Sourced {
  id: string;
  userSymptomId: string;
  occurredAt: Date;
  recordedAt: Date;
  severity: number | null;
  supersededAt: Date | null;
}

export interface EventRecord extends Sourced {
  id: string;
  occurredAt: Date;
  recordedAt: Date;
  type: TimelineEventType;
  description: string;
  supersededAt: Date | null;
}

export interface SymptomRecord {
  /** The `UserSymptom` id — what an observation points at. */
  id: string;
  name: string;
  firstOnset: Date | null;
  firstOnsetConfidence: RecordConfidence;
  status: SymptomStatus;
  resolvedDate: Date | null;
}

export type ContradictionKind =
  | "observation_before_onset"
  | "observation_after_resolved"
  | "resolved_before_onset"
  | "same_day_severity_clash"
  | "medication_timing";

export interface ContradictionSide {
  /** Null when the disagreement is with a field on the symptom rather than with a record. */
  recordId: string | null;
  field: "observation" | "event" | "symptom_onset" | "symptom_resolved";
  /** What this side says, in a sentence somebody can read. */
  what: string;
  when: Date;
  source: RecordSource;
  confidence: RecordConfidence;
}

export interface Contradiction {
  /** Stable across scans, so a contradiction the person has looked at can be recognised. */
  key: string;
  kind: ContradictionKind;
  summary: string;
  sides: [ContradictionSide, ContradictionSide];
  /**
   * Which side the evidence points to, and why — or null when it does not point anywhere
   * and the person has to decide. Nothing happens on this without them saying so.
   */
  proposal: { keep: 0 | 1; because: string } | null;
  /** How much getting this wrong would change a clinical conversation. Higher is worse. */
  weight: number;
}

/** A severity gap on the same day big enough that both cannot be describing the same day. */
const SEVERITY_CLASH = 4;

export function findContradictions(input: {
  symptoms: SymptomRecord[];
  observations: ObservationRecord[];
  events: EventRecord[];
}): Contradiction[] {
  const observations = input.observations.filter((o) => o.supersededAt === null);
  const events = input.events.filter((e) => e.supersededAt === null);
  const found: Contradiction[] = [];

  for (const symptom of input.symptoms) {
    const mine = observations
      .filter((o) => o.userSymptomId === symptom.id)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

    found.push(...onsetConflicts(symptom, mine));
    found.push(...resolvedConflicts(symptom, mine));
    found.push(...sameDayClashes(symptom, mine));
  }

  found.push(...medicationTimingConflicts(events));

  return found.sort((a, b) => b.weight - a.weight);
}

/** An entry dated before the day the symptom is recorded as having started. */
function onsetConflicts(symptom: SymptomRecord, observations: ObservationRecord[]): Contradiction[] {
  const onset = symptom.firstOnset;
  if (!onset) return [];

  const earlier = observations.filter((o) => toDateOnly(o.occurredAt) < toDateOnly(onset));
  if (earlier.length === 0) return [];

  // Only the earliest is worth asking about. Five entries before the recorded onset is one
  // wrong onset date, not five separate questions.
  const first = earlier[0];
  const onsetSide: ContradictionSide = {
    recordId: null,
    field: "symptom_onset",
    what: `${symptom.name} started on ${formatDate(onset)}`,
    when: onset,
    // An onset date typed into a form is a memory unless a record says otherwise.
    source: "recollection",
    confidence: symptom.firstOnsetConfidence,
  };
  const entrySide: ContradictionSide = {
    recordId: first.id,
    field: "observation",
    what: `${symptom.name} recorded on ${formatDate(first.occurredAt)}`,
    when: first.occurredAt,
    source: first.source,
    confidence: first.confidence,
  };

  return [
    {
      key: `onset:${symptom.id}:${first.id}`,
      kind: "observation_before_onset",
      summary: `You have ${symptom.name.toLowerCase()} recorded on ${formatDate(
        first.occurredAt,
      )}, which is before the date you gave for when it started.`,
      sides: [onsetSide, entrySide],
      proposal: proposalBetween(onsetSide, entrySide),
      weight: 100,
    },
  ];
}

/** An entry dated after the symptom is recorded as having stopped. */
function resolvedConflicts(
  symptom: SymptomRecord,
  observations: ObservationRecord[],
): Contradiction[] {
  const out: Contradiction[] = [];
  const resolved = symptom.resolvedDate;

  if (resolved && symptom.firstOnset && toDateOnly(resolved) < toDateOnly(symptom.firstOnset)) {
    const onsetSide: ContradictionSide = {
      recordId: null,
      field: "symptom_onset",
      what: `${symptom.name} started on ${formatDate(symptom.firstOnset)}`,
      when: symptom.firstOnset,
      source: "recollection",
      confidence: symptom.firstOnsetConfidence,
    };
    const resolvedSide: ContradictionSide = {
      recordId: null,
      field: "symptom_resolved",
      what: `${symptom.name} stopped on ${formatDate(resolved)}`,
      when: resolved,
      source: "recollection",
      confidence: symptom.firstOnsetConfidence,
    };
    out.push({
      key: `order:${symptom.id}`,
      kind: "resolved_before_onset",
      summary: `${symptom.name} is recorded as stopping before it started.`,
      sides: [onsetSide, resolvedSide],
      proposal: null,
      weight: 90,
    });
  }

  if (!resolved) return out;

  const later = observations.filter((o) => toDateOnly(o.occurredAt) > toDateOnly(resolved));
  if (later.length === 0) return out;

  const last = later[later.length - 1];
  const resolvedSide: ContradictionSide = {
    recordId: null,
    field: "symptom_resolved",
    what: `${symptom.name} stopped on ${formatDate(resolved)}`,
    when: resolved,
    source: "recollection",
    confidence: symptom.firstOnsetConfidence,
  };
  const entrySide: ContradictionSide = {
    recordId: last.id,
    field: "observation",
    what: `${symptom.name} recorded on ${formatDate(last.occurredAt)}`,
    when: last.occurredAt,
    source: last.source,
    confidence: last.confidence,
  };

  out.push({
    key: `resolved:${symptom.id}:${last.id}`,
    kind: "observation_after_resolved",
    summary: `You have ${symptom.name.toLowerCase()} recorded on ${formatDate(
      last.occurredAt,
    )}, after the date you gave for when it stopped.`,
    sides: [resolvedSide, entrySide],
    proposal: proposalBetween(resolvedSide, entrySide),
    weight: 80,
  });

  return out;
}

/**
 * Two entries for the same symptom on the same day, far apart on the scale.
 *
 * A symptom genuinely varies within a day, so a gap of one or two is not a contradiction and
 * is not raised. A 2 and a 9 on the same Tuesday usually means one of them is filed under
 * the wrong day, which matters because that is the Tuesday somebody will be asked about.
 */
function sameDayClashes(
  symptom: SymptomRecord,
  observations: ObservationRecord[],
): Contradiction[] {
  const byDay = new Map<string, ObservationRecord[]>();
  for (const observation of observations) {
    if (observation.severity === null) continue;
    const day = toDateOnly(observation.occurredAt).toISOString().slice(0, 10);
    byDay.set(day, [...(byDay.get(day) ?? []), observation]);
  }

  const out: Contradiction[] = [];
  for (const [day, sameDay] of byDay) {
    if (sameDay.length < 2) continue;

    const sorted = [...sameDay].sort((a, b) => (a.severity ?? 0) - (b.severity ?? 0));
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    if ((high.severity ?? 0) - (low.severity ?? 0) < SEVERITY_CLASH) continue;

    const lowSide: ContradictionSide = {
      recordId: low.id,
      field: "observation",
      what: `${symptom.name} at ${low.severity} out of 10`,
      when: low.occurredAt,
      source: low.source,
      confidence: low.confidence,
    };
    const highSide: ContradictionSide = {
      recordId: high.id,
      field: "observation",
      what: `${symptom.name} at ${high.severity} out of 10`,
      when: high.occurredAt,
      source: high.source,
      confidence: high.confidence,
    };

    out.push({
      key: `sameday:${symptom.id}:${day}`,
      kind: "same_day_severity_clash",
      summary: `${symptom.name} is recorded twice on ${formatDate(
        low.occurredAt,
      )}, at ${low.severity} and at ${high.severity} out of 10.`,
      sides: [lowSide, highSide],
      proposal: proposalBetween(lowSide, highSide),
      weight: 40,
    });
  }

  return out;
}

/**
 * The same medicine changed on two different days.
 *
 * Medication timing is the contradiction that comes up most and matters most, because "did
 * the rash start before or after the new tablet" is a question with two different answers
 * and one of them ends the conversation.
 *
 * The match is deliberately crude — a shared word of four letters or more in two
 * medication-change entries. It will occasionally raise something that is not a conflict,
 * which costs the person a glance. Missing a real one costs more.
 */
function medicationTimingConflicts(events: EventRecord[]): Contradiction[] {
  const changes = events.filter((event) => event.type === "medication_change");
  const out: Contradiction[] = [];

  for (let i = 0; i < changes.length; i += 1) {
    for (let j = i + 1; j < changes.length; j += 1) {
      const a = changes[i];
      const b = changes[j];
      if (toDateOnly(a.occurredAt).getTime() === toDateOnly(b.occurredAt).getTime()) continue;

      const shared = sharedWord(a.description, b.description);
      if (!shared) continue;

      const aSide: ContradictionSide = {
        recordId: a.id,
        field: "event",
        what: `${a.description} on ${formatDate(a.occurredAt)}`,
        when: a.occurredAt,
        source: a.source,
        confidence: a.confidence,
      };
      const bSide: ContradictionSide = {
        recordId: b.id,
        field: "event",
        what: `${b.description} on ${formatDate(b.occurredAt)}`,
        when: b.occurredAt,
        source: b.source,
        confidence: b.confidence,
      };

      out.push({
        key: `medication:${a.id}:${b.id}`,
        kind: "medication_timing",
        summary: `Two medication changes mentioning "${shared}" are recorded on different dates.`,
        sides: [aSide, bSide],
        proposal: proposalBetween(aSide, bSide),
        weight: 70,
      });
    }
  }

  return out;
}

const IGNORED_WORDS = new Set([
  "started",
  "stopped",
  "changed",
  "increased",
  "reduced",
  "medication",
  "tablet",
  "tablets",
  "daily",
  "twice",
  "morning",
  "night",
  "from",
  "with",
  "took",
  "taking",
  "prescribed",
]);

function sharedWord(a: string, b: string): string | null {
  const words = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((word) => word.length >= 4 && !IGNORED_WORDS.has(word)),
    );

  const left = words(a);
  for (const word of words(b)) if (left.has(word)) return word;
  return null;
}

function proposalBetween(
  a: ContradictionSide,
  b: ContradictionSide,
): { keep: 0 | 1; because: string } | null {
  const order = comparePrecedence(a, b);
  if (order === 0) return null;

  const keep = order > 0 ? a : b;
  const drop = order > 0 ? b : a;
  const because =
    keep.source === drop.source
      ? `You were more sure of "${keep.what}" than of "${drop.what}".`
      : `"${keep.what}" is ${SOURCE_SHORT[keep.source]}, and "${drop.what}" is ${SOURCE_SHORT[drop.source]}.`;

  return { keep: order > 0 ? 0 : 1, because };
}
