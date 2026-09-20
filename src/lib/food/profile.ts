/**
 * The condition profile, and the three tiers it sorts into.
 *
 * Two things in here are load-bearing.
 *
 * **Severity is never flattened.** An anaphylaxis risk and a dislike of coriander are not
 * the same class of thing and must never be rendered into one list. The tier is carried on
 * the type, so a component cannot accidentally lose it by mapping over an array.
 *
 * **A temporary state carries a review date.** A post-operative diet, a recovery diet after
 * gastroenteritis, an elimination phase and a course of antibiotics all impose rules that
 * are correct now and wrong in a fortnight. A person left on a restricted recovery diet for
 * two years because nobody told them it had ended is a common and real harm, so the review
 * date is required by the schema rather than optional.
 */

import { z } from "zod";

/**
 * Tier 1 — a single exposure causes real harm. Anaphylactic allergens; gluten in coeliac
 * disease; alcohol on a contraindicated medicine.
 *
 * Tier 2 — amount and frequency matter. FODMAPs in IBS, potassium in CKD, vitamin K on
 * warfarin, histamine, caffeine.
 *
 * Tier 3 — worth knowing. This tier exists so that the other two stay credible; a tool that
 * warns about everything has warned about nothing.
 */
export type Tier = 1 | 2 | 3;

export const TIER_LABEL: Record<Tier, string> = {
  1: "Avoid completely",
  2: "Depends on how much",
  3: "Worth knowing",
};

/**
 * How each tier is allowed to speak.
 *
 * "A small portion is usually tolerated" is legitimate in tier 2 and dangerous in tier 1,
 * so the permission lives on the tier rather than in a writer's judgement.
 */
export const TIER_MAY_SUGGEST_A_PORTION: Record<Tier, boolean> = { 1: false, 2: true, 3: true };

export const severities = ["anaphylaxis", "moderate", "intolerance"] as const;
export type Severity = (typeof severities)[number];

/** Severity decides the tier. It is not a field somebody sets by hand. */
export function tierForSeverity(severity: Severity): Tier {
  return severity === "anaphylaxis" ? 1 : severity === "moderate" ? 1 : 2;
}

export const diagnosisSources = ["clinician", "self", "suspected"] as const;
export const restrictionSources = ["clinical", "religious", "ethical", "preference"] as const;
export type RestrictionSource = (typeof restrictionSources)[number];

/**
 * Where a restriction came from changes what we are allowed to do with it, so it is
 * recorded. A clinical restriction is never argued with — see `neverWorkAround`. A
 * religious or ethical one is held exactly as firmly by the person and is not ours to
 * weigh either. A preference is a preference.
 */
export const RESTRICTION_SOURCE_LABEL: Record<RestrictionSource, string> = {
  clinical: "Set by a clinician",
  religious: "Religious",
  ethical: "Ethical",
  preference: "Personal preference",
};

const trimmed = z.string().trim().min(1).max(120);

export const allergySchema = z.object({
  allergenKey: trimmed,
  severity: z.enum(severities),
  confirmedBy: z.enum(diagnosisSources),
});

export const conditionSchema = z.object({
  name: trimmed,
  diagnosedBy: z.enum(diagnosisSources),
  since: z.iso.date().optional(),
});

export const intoleranceSchema = z.object({
  substance: trimmed,
  /** Free text, and it stays inside the profile. Rule 7: no free text leaves in an export. */
  typicalReaction: z.string().trim().max(300).optional(),
  thresholdKnown: z.boolean().default(false),
});

export const medicationSchema = z.object({
  /** Held for interaction lookup only. Never a dose — AGENTS.md rule 17. */
  name: trimmed,
});

export const restrictionSchema = z.object({
  what: trimmed,
  source: z.enum(restrictionSources),
  scope: z.string().trim().max(200).optional(),
});

/**
 * `reviewOn` is required, and that is the point of this type existing.
 *
 * If a person cannot say when the rules stop applying, the honest answer is that they need
 * to ask the clinician who set them — which is what the form does instead of defaulting
 * the date to something plausible.
 */
export const temporaryStateSchema = z.object({
  state: trimmed,
  started: z.iso.date(),
  reviewOn: z.iso.date(),
  rulesDifferHow: z.string().trim().max(400),
});

export const conditionProfileSchema = z.object({
  conditions: z.array(conditionSchema).max(20).default([]),
  allergies: z.array(allergySchema).max(30).default([]),
  intolerances: z.array(intoleranceSchema).max(30).default([]),
  medications: z.array(medicationSchema).max(40).default([]),
  restrictions: z.array(restrictionSchema).max(40).default([]),
  temporaryStates: z.array(temporaryStateSchema).max(10).default([]),
  /** The absolute exclusions. Everything in here renders as tier 1. */
  neverList: z.array(trimmed).max(60).default([]),
});

export type ConditionProfile = z.infer<typeof conditionProfileSchema>;
export type Allergy = z.infer<typeof allergySchema>;
export type TemporaryState = z.infer<typeof temporaryStateSchema>;
export type Restriction = z.infer<typeof restrictionSchema>;

export const EMPTY_PROFILE: ConditionProfile = {
  conditions: [],
  allergies: [],
  intolerances: [],
  medications: [],
  restrictions: [],
  temporaryStates: [],
  neverList: [],
};

/** Does this profile contain anything that could put someone in an ambulance? */
export function hasAnaphylaxisRisk(profile: ConditionProfile): boolean {
  return profile.allergies.some((allergy) => allergy.severity === "anaphylaxis");
}

/**
 * A clinical restriction is never worked around, argued with, or quietly relaxed — even one
 * that looks excessive or out of date. We do not hold the reason it was set. The most this
 * tool ever does with one is help somebody phrase the question for the person who set it.
 */
export function neverWorkAround(restriction: Restriction): boolean {
  return restriction.source === "clinical";
}

export function questionForClinician(restriction: Restriction): string {
  return `You set a restriction on ${restriction.what}. Is it still needed, and is there anything I can add back?`;
}

/**
 * Temporary states that are at or past their review date.
 *
 * Surfaced prominently rather than tucked into a settings screen, because the failure mode
 * is silence: nobody is ever reminded that a restriction has ended.
 */
export function statesDueForReview(profile: ConditionProfile, today: Date): TemporaryState[] {
  const todayKey = today.toISOString().slice(0, 10);
  return profile.temporaryStates.filter((state) => state.reviewOn <= todayKey);
}

export function reviewNoticeFor(state: TemporaryState): string {
  return `These rules were for ${state.state}. From ${state.reviewOn} the picture changes, and many of the things you are avoiding now are ordinary food again. Your GP or the clinician who set it can tell you where you stand.`;
}
