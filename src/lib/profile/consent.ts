import { ConsentPurpose } from "@/generated/prisma";
import { currentConsents, hasConsent, recordConsent } from "@/lib/consent";
import { CONSENT_PURPOSES, CONSENT_TEXT_VERSION } from "@/lib/consent/text";
import { db } from "@/lib/db";

/**
 * Turning a screenful of choices into consent records.
 *
 * The mechanism lives in `src/lib/consent/index.ts` and is not ours to change. This module
 * is the layer above it that the consent screens talk to: it decides *when* a new record
 * needs writing, and it reads back enough history to tell someone when they decided.
 *
 * Used by onboarding and by Settings. Both screens show exactly the same five choices —
 * there is no version of this product where a decision is easier to give than to take back.
 */

export interface ConsentDecision {
  purpose: ConsentPurpose;
  granted: boolean;
  /** When the current decision was made. Null if they have never been asked. */
  decidedAt: Date | null;
  /** The wording they saw. Null if they have never been asked. */
  textVersion: string | null;
  /** True when they decided under wording we have since changed. */
  underOldWording: boolean;
}

/**
 * The current decision for every purpose, with when it was made.
 *
 * Ordering matches `currentConsents`: newest first, breaking a tie on id, so the two can
 * never disagree about which row is current.
 */
export async function consentDecisions(userId: string): Promise<ConsentDecision[]> {
  const rows = await db.consentRecord.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { purpose: true, granted: true, createdAt: true, consentTextVersion: true },
  });

  const latest = new Map<ConsentPurpose, (typeof rows)[number]>();
  for (const row of rows) if (!latest.has(row.purpose)) latest.set(row.purpose, row);

  return CONSENT_PURPOSES.map((purpose) => {
    const row = latest.get(purpose);
    return {
      purpose,
      granted: row?.granted ?? false,
      decidedAt: row?.createdAt ?? null,
      textVersion: row?.consentTextVersion ?? null,
      underOldWording: row ? row.consentTextVersion !== CONSENT_TEXT_VERSION : false,
    };
  });
}

/**
 * Record a set of decisions.
 *
 * A new row is written when the answer is new, when it has changed, or when the person is
 * answering under wording they have not seen before. An unchanged answer under the same
 * wording writes nothing: re-saving the settings page should not fill the history with
 * identical rows and make the real changes harder to find.
 *
 * Writes are sequential rather than batched so that every row gets its own timestamp.
 */
export async function recordConsentDecisions(
  userId: string,
  decisions: Partial<Record<ConsentPurpose, boolean>>,
  consentTextVersion: string = CONSENT_TEXT_VERSION,
): Promise<ConsentPurpose[]> {
  const current = await consentDecisions(userId);
  const byPurpose = new Map(current.map((decision) => [decision.purpose, decision]));
  const written: ConsentPurpose[] = [];

  for (const purpose of CONSENT_PURPOSES) {
    const granted = decisions[purpose];
    if (granted === undefined) continue;

    const existing = byPurpose.get(purpose);
    const unchanged =
      existing !== undefined &&
      existing.textVersion !== null &&
      existing.granted === granted &&
      existing.textVersion === consentTextVersion;
    if (unchanged) continue;

    await recordConsent({ userId, purpose, granted, consentTextVersion });
    written.push(purpose);
  }

  return written;
}

/** One decision, on its own. Used by the per-choice controls in Settings. */
export async function recordSingleConsent(
  userId: string,
  purpose: ConsentPurpose,
  granted: boolean,
): Promise<void> {
  await recordConsentDecisions(userId, { [purpose]: granted });
}

/**
 * Whether the tracking features are open to this person.
 *
 * Evaluated at query time, every time. Never copied onto another record — that is what
 * makes withdrawal immediate rather than eventual.
 */
export function canTrack(userId: string): Promise<boolean> {
  return hasConsent(userId, ConsentPurpose.core_tracking);
}

/** True once the person has answered the core tracking question either way. */
export async function hasAnsweredCoreTracking(userId: string): Promise<boolean> {
  const count = await db.consentRecord.count({
    where: { userId, purpose: ConsentPurpose.core_tracking },
  });
  return count > 0;
}

export { currentConsents };
