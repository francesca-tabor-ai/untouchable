import { db } from "@/lib/db";

/**
 * Anonymous donation referrals.
 *
 * A referral records that *someone* clicked through to a charity from *a kind of page*. That
 * is the whole record. There is no user id, no IP address, no session identifier and no URL,
 * because the schema has nowhere to put one — see `DonationReferral` in schema.prisma,
 * docs/privacy.md, and AGENTS.md rule 12.
 *
 * This function deliberately takes no user, no request and no headers. It cannot record who
 * someone is because it is never told. A referral created by a signed-in person and one
 * created by a visitor are the same row.
 */

/**
 * The kinds of page a Donate button can sit on. A closed set, not free text: anything else
 * would eventually become a URL, and a URL can identify a person.
 */
export const REFERRAL_ORIGINS = ["charity", "condition", "story", "causes"] as const;
export type ReferralOrigin = (typeof REFERRAL_ORIGINS)[number];

export const DEFAULT_REFERRAL_ORIGIN: ReferralOrigin = "charity";

/** Coerce anything arriving from a query string into one of the known kinds. */
export function toReferralOrigin(value: unknown): ReferralOrigin {
  return REFERRAL_ORIGINS.includes(value as ReferralOrigin)
    ? (value as ReferralOrigin)
    : DEFAULT_REFERRAL_ORIGIN;
}

/**
 * Record a click through to a charity's own donation page.
 *
 * Takes exactly two things, and there is no overload that takes more.
 */
export async function recordDonationReferral(input: {
  charityId: string;
  origin: ReferralOrigin;
}): Promise<void> {
  await db.donationReferral.create({
    data: { charityId: input.charityId, originPage: toReferralOrigin(input.origin) },
  });
}

export interface ReferralReportRow {
  charityId: string;
  charityName: string;
  charitySlug: string;
  total: number;
  last30Days: number;
  byOrigin: Record<ReferralOrigin, number>;
}

export interface ReferralReport {
  generatedAt: Date;
  windowDays: number;
  totals: { all: number; last30Days: number };
  rows: ReferralReportRow[];
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Referral counts per charity, for the admin and (later) for telling charities how much
 * support we send them.
 *
 * This report contains no user data and cannot: its only inputs are the charity and the page
 * kind. There is no user table in this query, no join that could reach one, and no way to
 * add one without a schema change.
 */
export async function referralReport(now: Date = new Date()): Promise<ReferralReport> {
  const since = new Date(now.getTime() - THIRTY_DAYS_MS);

  const charities = await db.charity.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  const referrals = await db.donationReferral.findMany({
    select: { charityId: true, originPage: true, createdAt: true },
  });

  const rows: ReferralReportRow[] = charities.map((charity) => ({
    charityId: charity.id,
    charityName: charity.name,
    charitySlug: charity.slug,
    total: 0,
    last30Days: 0,
    byOrigin: { charity: 0, condition: 0, story: 0, causes: 0 },
  }));
  const index = new Map(rows.map((row) => [row.charityId, row]));

  for (const referral of referrals) {
    const row = index.get(referral.charityId);
    if (!row) continue;
    row.total += 1;
    if (referral.createdAt >= since) row.last30Days += 1;
    row.byOrigin[toReferralOrigin(referral.originPage)] += 1;
  }

  rows.sort((a, b) => b.total - a.total || a.charityName.localeCompare(b.charityName, "en-GB"));

  return {
    generatedAt: now,
    windowDays: 30,
    totals: {
      all: rows.reduce((sum, row) => sum + row.total, 0),
      last30Days: rows.reduce((sum, row) => sum + row.last30Days, 0),
    },
    rows,
  };
}
