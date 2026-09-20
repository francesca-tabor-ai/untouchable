/**
 * Noticing when a restriction list has outgrown the condition underneath it.
 *
 * A tool that helps somebody exclude foods is a known route into disordered eating. This is
 * the counterweight, and every word of it is constrained:
 *
 * **It is not a diagnosis and never reads as one.** No condition is named, no severity is
 * assessed, nothing is scored. It observes the size of a list against the number of things
 * that list is standing on, which is arithmetic, and hands the question to somebody
 * qualified to answer it.
 *
 * **It is said once.** A tool that raises it every session is nagging somebody about their
 * eating, which is the harm rather than the remedy. The caller persists `saidOn` and passes
 * it back; once it is set, this returns null for good.
 *
 * **Nothing is withheld afterwards.** Saying it does not change what the rest of the tool
 * does. Somebody who has been told this and carried on is still owed the same menu
 * analysis, the same substitutions, and the same answer to "what can I eat".
 */

import type { ConditionProfile } from "./profile";

/**
 * The clinical basis for a restriction list: a diagnosed condition, a confirmed allergy or
 * intolerance, or a restriction a clinician actually set. A self-reported suspicion is
 * genuinely held and is not, on its own, a basis for thirty exclusions.
 */
export function clinicalBasisCount(profile: ConditionProfile): number {
  return (
    profile.conditions.filter((condition) => condition.diagnosedBy === "clinician").length +
    profile.allergies.filter((allergy) => allergy.confirmedBy === "clinician").length +
    profile.intolerances.length +
    profile.restrictions.filter((restriction) => restriction.source === "clinical").length
  );
}

/**
 * How far past the basis the list has gone.
 *
 * The threshold is deliberately generous. Somebody with coeliac disease and a nut allergy
 * has a long and entirely proportionate list of things they do not eat, and a tool that
 * queries it has misread them badly. This fires when the never-list is several times the
 * number of things underneath it, not when it is merely long.
 */
export const BASIS_MULTIPLE = 4;
export const MINIMUM_LIST_LENGTH = 12;

export interface ScopeSignals {
  profile: ConditionProfile;
  /** The person said, in their own words, that eating is frightening or distressing. */
  reportedDistress?: boolean;
  /** Already said. An ISO date, or null. */
  saidOn?: string | null;
}

export const SCOPE_CREEP_NOTE =
  "Your list of things to avoid has grown a good way past the conditions it is built on. That can happen for perfectly sensible reasons — a reaction you could not pin down, or advice from a while back that never got revisited — and it is not something this tool can work out. A GP or a registered dietitian can look at it properly, and a dietitian in particular can often give things back rather than take more away. Nothing here changes in the meantime.";

/**
 * Whether to say it. Null means say nothing — which is the answer almost every time.
 */
export function scopeCreepNote(signals: ScopeSignals): string | null {
  if (signals.saidOn) return null;

  if (signals.reportedDistress) return SCOPE_CREEP_NOTE;

  const listLength = signals.profile.neverList.length;
  if (listLength < MINIMUM_LIST_LENGTH) return null;

  const basis = clinicalBasisCount(signals.profile);
  // No basis at all and a long list still qualifies; treat it as a basis of one so that a
  // list standing on nothing does not divide its way out of ever being noticed.
  if (listLength >= Math.max(basis, 1) * BASIS_MULTIPLE) return SCOPE_CREEP_NOTE;

  return null;
}

/**
 * The answer to "what can I eat", which the tool must always be able to give.
 *
 * A tool that only ever says no makes eating frightening. This is not a consolation prize
 * bolted on at the end — most of the time it is the true headline, because most of the
 * time plenty is available and two or three things need a question asked first.
 */
export function plentyIsAvailableNote(candidateCount: number, totalDishes: number): string {
  if (totalDishes === 0) return "";
  if (candidateCount === 0) {
    return "Nothing here is straightforward, which happens. Staff can usually put something together off-menu if you ask — it is a more normal request than it feels.";
  }
  if (candidateCount === 1) {
    return "One dish here is worth asking about, and a question or two should settle it.";
  }
  return `${candidateCount} of these are worth asking about. That is usually more than enough to eat well — ask the two questions below and go from there.`;
}
