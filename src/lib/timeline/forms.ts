import { fromDateInputValue } from "@/lib/tracking/dates";

import {
  candidateSchema,
  observationSchema,
  standingFactSchema,
  timelineEventSchema,
} from "./records";

/**
 * Turning a submitted form into a validated input.
 *
 * Kept out of the `"use server"` file on purpose. A `"use server"` module may only export
 * async functions, and exporting a schema or a helper from one fails at build time with an
 * error naming a page rather than the file — AGENTS.md section 9.
 *
 * The date helpers reject 31 February rather than rolling it into March, which matters more
 * here than it does elsewhere: a silently corrected date is a wrong date nobody will notice.
 */

const text = (formData: FormData, key: string): string | null => {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? value : null;
};

const date = (formData: FormData, key: string): Date | null => {
  const value = String(formData.get(key) ?? "").trim();
  return value.length > 0 ? fromDateInputValue(value) : null;
};

export function parseObservationForm(formData: FormData) {
  const severityRaw = String(formData.get("severity") ?? "").trim();
  const severity = severityRaw.length > 0 ? Number(severityRaw) : null;

  return observationSchema.safeParse({
    userSymptomId: String(formData.get("userSymptomId") ?? ""),
    occurredAt: date(formData, "occurredAt") ?? undefined,
    severity: severity !== null && Number.isFinite(severity) ? Math.round(severity) : null,
    character: text(formData, "character"),
    duration: text(formData, "duration"),
    triggers: text(formData, "triggers"),
    relievingFactors: text(formData, "relievingFactors"),
    source: formData.get("source"),
    confidence: formData.get("confidence"),
  });
}

export function parseEventForm(formData: FormData) {
  return timelineEventSchema.safeParse({
    occurredAt: date(formData, "occurredAt") ?? undefined,
    type: formData.get("type"),
    description: String(formData.get("description") ?? ""),
    provider: text(formData, "provider"),
    outcome: text(formData, "outcome"),
    documentRef: text(formData, "documentRef"),
    source: formData.get("source"),
    confidence: formData.get("confidence"),
  });
}

export function parseStandingFactForm(formData: FormData) {
  return standingFactSchema.safeParse({
    category: formData.get("category"),
    value: String(formData.get("value") ?? ""),
    dateEstablished: date(formData, "dateEstablished"),
  });
}

export function parseCandidateForm(formData: FormData) {
  return candidateSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    discriminatingFeatures: String(formData.get("discriminatingFeatures") ?? ""),
    testsThatWouldSettleIt: String(formData.get("testsThatWouldSettleIt") ?? ""),
  });
}
