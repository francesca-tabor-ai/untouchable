import { z } from "zod";

import type {
  CandidateStatus,
  Laterality,
  MatrixFit,
  RecordConfidence,
  RecordSource,
  StandingFactCategory,
  SymptomStatus,
  TimelineEventType,
} from "@/generated/prisma";

/**
 * The vocabulary of the timeline, and the labels a person reads.
 *
 * Everything here is a plain value with no database in it, so the rules that matter —
 * precedence, contradictions, red flags, what goes in a handover — can be tested without
 * standing anything up.
 *
 * One thing to hold on to while reading the rest of this folder: **unknown is a real answer.**
 * A blank onset date is not missing data to be filled in with a best guess. It is a fact
 * about what this person actually knows, and it has to survive all the way to the page a
 * clinician reads, which is why it has a spelling of its own.
 */

/** What an unknown value looks like everywhere — on screen, in a script, in an export. */
export const UNCONFIRMED = "[UNCONFIRMED]";

export const SOURCE_LABELS: Record<RecordSource, string> = {
  contemporaneous_note: "Written at the time",
  document: "From a letter or result",
  recollection: "Remembered later",
  third_party: "Someone else told me",
};

/** The short form that goes in a handover document, where space is the constraint. */
export const SOURCE_SHORT: Record<RecordSource, string> = {
  contemporaneous_note: "noted at the time",
  document: "from a document",
  recollection: "from recollection",
  third_party: "reported by someone else",
};

export const CONFIDENCE_LABELS: Record<RecordConfidence, string> = {
  confirmed: "Sure about this",
  probable: "Fairly sure",
  unconfirmed: "Not sure",
};

export const EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  appointment: "Appointment",
  test: "Test or scan",
  medication_change: "Medication change",
  travel: "Travel",
  injury: "Injury",
  significant_life_event: "Something significant that happened",
  other: "Something else",
};

export const STANDING_FACT_LABELS: Record<StandingFactCategory, string> = {
  allergy: "Allergy",
  current_medication: "Medicine I take now",
  past_condition: "Condition I have had",
  lifestyle: "Something about how I live",
  relevant_negative: "Something I do not have",
};

/**
 * The order these appear in every clinical output. Allergies first, always — it is the one
 * item on the list that changes what a clinician is allowed to do in the next five minutes.
 */
export const STANDING_FACT_ORDER: StandingFactCategory[] = [
  "allergy",
  "current_medication",
  "past_condition",
  "relevant_negative",
  "lifestyle",
];

export const SYMPTOM_STATUS_LABELS: Record<SymptomStatus, string> = {
  active: "Still happening",
  intermittent: "Comes and goes",
  resolved: "Stopped",
};

export const LATERALITY_LABELS: Record<Laterality, string> = {
  left: "Left",
  right: "Right",
  bilateral: "Both sides",
  not_applicable: "Not a side",
};

export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  live: "Still being considered",
  ruled_down: "Made less likely, not closed",
  excluded: "Ruled out",
};

export const MATRIX_FIT_LABELS: Record<MatrixFit, string> = {
  supports: "Fits",
  partial: "Partly fits",
  against: "Does not fit",
  neutral: "Neither way",
  not_yet_tested: "Not looked at yet",
};

const sourceEnum = z.enum([
  "contemporaneous_note",
  "document",
  "recollection",
  "third_party",
]) satisfies z.ZodType<RecordSource>;

const confidenceEnum = z.enum([
  "confirmed",
  "probable",
  "unconfirmed",
]) satisfies z.ZodType<RecordConfidence>;

/**
 * Free text limits.
 *
 * Generous, because the sentence that changes an appointment is usually the one in the
 * person's own words — "like a band round my head, worse lying down" — and clipping it to
 * fit a column is how that sentence gets lost.
 */
export const TEXT_MAX = 500;
export const LONG_TEXT_MAX = 2000;

const shortText = z.string().trim().max(TEXT_MAX).nullable();

export const observationSchema = z.object({
  userSymptomId: z.string().min(1, "Choose which symptom this is about."),
  occurredAt: z.date({ message: "When did this happen?" }),
  severity: z.number().int().min(0).max(10).nullable(),
  character: shortText,
  duration: shortText,
  triggers: shortText,
  relievingFactors: shortText,
  source: sourceEnum,
  confidence: confidenceEnum,
});

export type ObservationInput = z.infer<typeof observationSchema>;

export const timelineEventSchema = z.object({
  occurredAt: z.date({ message: "When did this happen?" }),
  type: z.enum([
    "appointment",
    "test",
    "medication_change",
    "travel",
    "injury",
    "significant_life_event",
    "other",
  ]) satisfies z.ZodType<TimelineEventType>,
  description: z.string().trim().min(1, "Say what happened.").max(LONG_TEXT_MAX),
  provider: shortText,
  outcome: shortText,
  documentRef: shortText,
  source: sourceEnum,
  confidence: confidenceEnum,
});

export type TimelineEventInput = z.infer<typeof timelineEventSchema>;

export const standingFactSchema = z.object({
  category: z.enum([
    "allergy",
    "current_medication",
    "past_condition",
    "lifestyle",
    "relevant_negative",
  ]) satisfies z.ZodType<StandingFactCategory>,
  value: z.string().trim().min(1, "Say what it is.").max(TEXT_MAX),
  dateEstablished: z.date().nullable(),
});

export type StandingFactInput = z.infer<typeof standingFactSchema>;

export const candidateSchema = z.object({
  name: z.string().trim().min(1, "Give it a name.").max(TEXT_MAX),
  discriminatingFeatures: z
    .string()
    .trim()
    .min(1, "What would tell this apart from the others?")
    .max(LONG_TEXT_MAX),
  testsThatWouldSettleIt: z
    .string()
    .trim()
    .min(1, "What test or examination would settle it?")
    .max(LONG_TEXT_MAX),
});

export type CandidateInput = z.infer<typeof candidateSchema>;
