/**
 * Verification rules for charity listings.
 *
 * An editor checks a charity against the official register before it is listed, and records
 * that they did: who, and when. The database requires `verifiedAt` and `verifiedById`
 * together — one without the other is rejected — so "verified" always means a named person
 * on a named date.
 *
 * Brief section 6.1. AGENTS.md rule 4.
 */

/** Listings are re-checked against the register every year. Brief 6.1. */
export const REVERIFY_AFTER_MONTHS = 12;

export type VerificationState = "never_verified" | "lapsed" | "current";

export interface VerifiableCharity {
  verifiedAt: Date | null;
  verifiedById: string | null;
}

/** The date a listing falls due for its next check against the register. */
export function reverifyDueAt(verifiedAt: Date): Date {
  const due = new Date(verifiedAt);
  due.setMonth(due.getMonth() + REVERIFY_AFTER_MONTHS);
  return due;
}

export function verificationState(
  charity: VerifiableCharity,
  now: Date = new Date(),
): VerificationState {
  if (!charity.verifiedAt || !charity.verifiedById) return "never_verified";
  return reverifyDueAt(charity.verifiedAt).getTime() <= now.getTime() ? "lapsed" : "current";
}

/** True when the listing is flagged for an editor to re-check. Brief 6.1. */
export function needsReverification(charity: VerifiableCharity, now: Date = new Date()): boolean {
  return verificationState(charity, now) === "lapsed";
}

/**
 * The single answer to "may the public see this listing?".
 *
 * A charity no editor has verified is never publicly visible, whatever the UI does. This is
 * applied in the query layer (see `publicCharityWhere` in queries.ts) so a page cannot show
 * one by forgetting to filter; this predicate is the same rule for anything already loaded.
 *
 * A listing whose yearly re-check is overdue stays visible and is flagged to editors — see
 * DECISIONS.md D-013. It was verified by a person; the flag is a prompt to check again, not
 * a reason to take support away from people mid-journey.
 */
export function isPubliclyVisible(charity: VerifiableCharity & { active: boolean }): boolean {
  return charity.active && charity.verifiedAt !== null && charity.verifiedById !== null;
}
