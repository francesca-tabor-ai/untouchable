import { ConsentPurpose } from "@/generated/prisma";
import { db } from "@/lib/db";

export { ConsentPurpose };

/**
 * Consent is append-only: changing your mind writes a new row. The current state of a
 * (user, purpose) pair is therefore the most recent row for it.
 *
 * We evaluate this at query time rather than caching a flag onto records, which is what
 * makes withdrawal take effect immediately — brief section 7.2.
 */
export async function currentConsents(userId: string): Promise<Record<ConsentPurpose, boolean>> {
  const rows = await db.$queryRaw<{ purpose: ConsentPurpose; granted: boolean }[]>`
    SELECT DISTINCT ON ("purpose") "purpose", "granted"
    FROM "ConsentRecord"
    WHERE "userId" = ${userId}
    ORDER BY "purpose", "createdAt" DESC, "id" DESC
  `;

  const state = Object.fromEntries(
    Object.values(ConsentPurpose).map((purpose) => [purpose, false]),
  ) as Record<ConsentPurpose, boolean>;

  for (const row of rows) state[row.purpose] = row.granted;
  return state;
}

export async function hasConsent(userId: string, purpose: ConsentPurpose): Promise<boolean> {
  const state = await currentConsents(userId);
  return state[purpose];
}

/**
 * Record a consent decision. Always writes a new row — never updates an existing one.
 */
export async function recordConsent(params: {
  userId: string;
  purpose: ConsentPurpose;
  granted: boolean;
  consentTextVersion: string;
}) {
  return db.consentRecord.create({ data: params });
}

/**
 * Every user whose *current* consent covers this purpose, excluding deleted accounts.
 *
 * This is the only place the cohort for research is defined. It is deliberately not
 * exported to feature code: reach it through `src/lib/research/aggregate.ts`, which also
 * applies suppression and audit.
 */
export async function consentedUserIds(purpose: ConsentPurpose): Promise<string[]> {
  const rows = await db.$queryRaw<{ userId: string }[]>`
    SELECT c."userId"
    FROM (
      SELECT DISTINCT ON ("userId") "userId", "granted"
      FROM "ConsentRecord"
      WHERE "purpose" = ${purpose}::"ConsentPurpose"
      ORDER BY "userId", "createdAt" DESC, "id" DESC
    ) c
    JOIN "User" u ON u."id" = c."userId"
    WHERE c."granted" = true AND u."deletedAt" IS NULL
  `;
  return rows.map((r) => r.userId);
}
