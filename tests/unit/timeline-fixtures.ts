import type {
  EventRecord,
  ObservationRecord,
  SymptomRecord,
} from "@/lib/timeline/contradictions";
import type { HandoverEvent } from "@/lib/timeline/handover";
import type { CandidateRecord } from "@/lib/timeline/matrix";
import type { StandingFactRecord } from "@/lib/timeline/open-items";

/**
 * Fictional throughout. Nobody here is real, and nothing here is anybody's actual illness —
 * AGENTS.md rule 1.
 */

export const day = (iso: string) => new Date(`${iso}T09:00:00Z`);

let counter = 0;
const id = (prefix: string) => `${prefix}-${(counter += 1)}`;

export function symptom(overrides: Partial<SymptomRecord> = {}): SymptomRecord {
  return {
    id: id("sym"),
    name: "Headaches",
    firstOnset: day("2026-03-03"),
    firstOnsetConfidence: "probable",
    status: "active",
    resolvedDate: null,
    ...overrides,
  };
}

export function observation(overrides: Partial<ObservationRecord> = {}): ObservationRecord {
  return {
    id: id("obs"),
    userSymptomId: "sym-1",
    occurredAt: day("2026-06-01"),
    recordedAt: day("2026-06-01"),
    severity: 5,
    source: "contemporaneous_note",
    confidence: "confirmed",
    supersededAt: null,
    ...overrides,
  };
}

export function event(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: id("evt"),
    occurredAt: day("2026-06-10"),
    recordedAt: day("2026-06-10"),
    type: "appointment",
    description: "Saw the GP about the headaches",
    source: "contemporaneous_note",
    confidence: "confirmed",
    supersededAt: null,
    ...overrides,
  };
}

export function handoverEvent(overrides: Partial<HandoverEvent> = {}): HandoverEvent {
  return {
    ...event(),
    outcome: null,
    provider: null,
    documentRef: null,
    flaggedTier: null,
    ...overrides,
  };
}

export function fact(overrides: Partial<StandingFactRecord> = {}): StandingFactRecord {
  return {
    id: id("fact"),
    category: "current_medication",
    value: "A blood pressure tablet",
    active: true,
    ...overrides,
  };
}

export function candidate(overrides: Partial<CandidateRecord> = {}): CandidateRecord {
  return {
    id: id("cand"),
    name: "Something to do with my ears",
    discriminatingFeatures: "It would be worse when I turn over in bed",
    testsThatWouldSettleIt: "An examination of both ears",
    status: "live",
    excludedBy: null,
    ...overrides,
  };
}
