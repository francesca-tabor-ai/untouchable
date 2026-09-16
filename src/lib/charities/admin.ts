import { z } from "zod";

import type { Prisma, Regulator } from "@/generated/prisma";
import { db } from "@/lib/db";

import { REGULATOR_CODES } from "./regulators";
import { needsReverification, verificationState, type VerificationState } from "./verification";

/**
 * Editorial management of charity listings.
 *
 * The listing an editor sees is the whole record, including listings the public cannot see.
 * Public reads live in queries.ts and are filtered there; nothing in this file is safe to
 * render on a public page.
 */

export const REGULATOR_VALUES = REGULATOR_CODES as [Regulator, ...Regulator[]];

const httpsUrl = z
  .string()
  .trim()
  .min(1, "Give the web address.")
  .refine(
    (value) => /^https?:\/\//i.test(value),
    "Web addresses must start with http:// or https://",
  );

export const charityInput = z.object({
  name: z.string().trim().min(2, "Give the charity's name as it appears on the register."),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lower-case words separated by hyphens.")
    .min(2),
  registeredNumber: z
    .string()
    .trim()
    .min(1, "Give the registered charity number.")
    .max(20, "That is too long to be a registered charity number."),
  regulator: z.enum(REGULATOR_VALUES),
  websiteUrl: httpsUrl,
  donationUrl: httpsUrl,
  description: z
    .string()
    .trim()
    .min(40, "Write at least a sentence or two, in our own words.")
    .max(1200, "Keep the description under 1200 characters."),
  logoUrl: z.string().trim().optional().nullable(),
  logoPermission: z.boolean().default(false),
  active: z.boolean().default(true),
  conditionIds: z.array(z.string()).default([]),
});

export type CharityInput = z.infer<typeof charityInput>;

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface AdminCharityRow {
  id: string;
  name: string;
  slug: string;
  registeredNumber: string;
  regulator: Regulator;
  active: boolean;
  logoPermission: boolean;
  logoUrl: string | null;
  verifiedAt: Date | null;
  verifiedByEmail: string | null;
  conditions: { id: string; name: string; slug: string }[];
  verification: VerificationState;
  needsReverification: boolean;
  publiclyVisible: boolean;
}

const adminSelect = {
  id: true,
  name: true,
  slug: true,
  registeredNumber: true,
  regulator: true,
  websiteUrl: true,
  donationUrl: true,
  description: true,
  logoUrl: true,
  logoPermission: true,
  active: true,
  verifiedAt: true,
  verifiedById: true,
  verifiedBy: { select: { email: true } },
  conditions: { select: { condition: { select: { id: true, name: true, slug: true } } } },
} satisfies Prisma.CharitySelect;

type AdminRow = Prisma.CharityGetPayload<{ select: typeof adminSelect }>;

function toRow(charity: AdminRow, now: Date): AdminCharityRow {
  return {
    id: charity.id,
    name: charity.name,
    slug: charity.slug,
    registeredNumber: charity.registeredNumber,
    regulator: charity.regulator,
    active: charity.active,
    logoPermission: charity.logoPermission,
    logoUrl: charity.logoUrl,
    verifiedAt: charity.verifiedAt,
    verifiedByEmail: charity.verifiedBy?.email ?? null,
    conditions: charity.conditions.map((link) => link.condition),
    verification: verificationState(charity, now),
    needsReverification: needsReverification(charity, now),
    publiclyVisible: charity.active && charity.verifiedAt !== null && charity.verifiedById !== null,
  };
}

/** Every listing, verified or not, newest problem first. */
export async function listCharitiesForAdmin(now: Date = new Date()): Promise<AdminCharityRow[]> {
  const charities = await db.charity.findMany({ select: adminSelect, orderBy: { name: "asc" } });
  return charities.map((charity) => toRow(charity, now));
}

export interface AdminCharityDetail extends AdminCharityRow {
  websiteUrl: string;
  donationUrl: string;
  description: string;
}

export async function getCharityForAdmin(
  id: string,
  now: Date = new Date(),
): Promise<AdminCharityDetail | null> {
  const charity = await db.charity.findUnique({ where: { id }, select: adminSelect });
  if (!charity) return null;

  return {
    ...toRow(charity, now),
    websiteUrl: charity.websiteUrl,
    donationUrl: charity.donationUrl,
    description: charity.description,
  };
}

export type SaveResult =
  { ok: true; id: string; slug: string } | { ok: false; problems: Record<string, string> };

function flatten(error: z.ZodError): Record<string, string> {
  const problems: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    problems[key] ??= issue.message;
  }
  return problems;
}

/**
 * Create a listing. A new listing is never verified — an editor records the check against
 * the register as a separate, deliberate act, so "verified" always means somebody looked.
 */
export async function createCharity(raw: unknown): Promise<SaveResult> {
  const parsed = charityInput.safeParse(raw);
  if (!parsed.success) return { ok: false, problems: flatten(parsed.error) };
  const input = parsed.data;

  const clash = await db.charity.findFirst({
    where: {
      OR: [
        { slug: input.slug },
        { regulator: input.regulator, registeredNumber: input.registeredNumber },
      ],
    },
    select: { slug: true },
  });
  if (clash) {
    return {
      ok: false,
      problems: {
        form: "A listing with that web address or that registered number already exists.",
      },
    };
  }

  const charity = await db.charity.create({
    data: {
      ...scalars(input),
      conditions: { create: input.conditionIds.map((conditionId) => ({ conditionId })) },
    },
    select: { id: true, slug: true },
  });

  return { ok: true, id: charity.id, slug: charity.slug };
}

/**
 * Update a listing.
 *
 * Changing any of the facts that were checked against the register — the name, the number,
 * the regulator — clears the verification, because the thing an editor verified is no longer
 * the thing on the page. The listing drops out of the public directory until someone checks
 * it again. That is the point.
 */
export async function updateCharity(id: string, raw: unknown): Promise<SaveResult> {
  const parsed = charityInput.safeParse(raw);
  if (!parsed.success) return { ok: false, problems: flatten(parsed.error) };
  const input = parsed.data;

  const existing = await db.charity.findUnique({
    where: { id },
    select: { id: true, name: true, registeredNumber: true, regulator: true },
  });
  if (!existing) return { ok: false, problems: { form: "That listing no longer exists." } };

  const clash = await db.charity.findFirst({
    where: {
      id: { not: id },
      OR: [
        { slug: input.slug },
        { regulator: input.regulator, registeredNumber: input.registeredNumber },
      ],
    },
    select: { id: true },
  });
  if (clash) {
    return {
      ok: false,
      problems: {
        form: "Another listing already uses that web address or that registered number.",
      },
    };
  }

  const registerFactsChanged =
    existing.name !== input.name ||
    existing.registeredNumber !== input.registeredNumber ||
    existing.regulator !== input.regulator;

  const charity = await db.charity.update({
    where: { id },
    data: {
      ...scalars(input),
      // Both together, or neither: the database rejects one without the other.
      ...(registerFactsChanged ? { verifiedAt: null, verifiedById: null } : {}),
      conditions: {
        deleteMany: {},
        create: input.conditionIds.map((conditionId) => ({ conditionId })),
      },
    },
    select: { id: true, slug: true },
  });

  return { ok: true, id: charity.id, slug: charity.slug };
}

/**
 * Record that an editor checked this listing against the official register.
 *
 * Who and when are written together. This is the only function that sets them.
 */
export async function verifyCharity(
  id: string,
  editorId: string,
  at: Date = new Date(),
): Promise<{ ok: boolean; problem?: string }> {
  const charity = await db.charity.findUnique({ where: { id }, select: { id: true } });
  if (!charity) return { ok: false, problem: "That listing no longer exists." };

  await db.charity.update({
    where: { id },
    data: { verifiedAt: at, verifiedById: editorId },
  });
  return { ok: true };
}

/**
 * Withdraw a listing from the public site without deleting it. Deleting would take the
 * anonymous referral history with it, and that history is what we owe charities a report on.
 */
export async function setCharityActive(id: string, active: boolean): Promise<void> {
  await db.charity.updateMany({ where: { id }, data: { active } });
}

/** Listings an editor needs to look at: never checked, or overdue for a re-check. */
export async function charitiesNeedingAttention(
  now: Date = new Date(),
): Promise<{ neverVerified: AdminCharityRow[]; lapsed: AdminCharityRow[] }> {
  const rows = await listCharitiesForAdmin(now);
  return {
    neverVerified: rows.filter((row) => row.verification === "never_verified"),
    lapsed: rows.filter((row) => row.verification === "lapsed"),
  };
}

function scalars(input: CharityInput) {
  return {
    name: input.name,
    slug: input.slug,
    registeredNumber: input.registeredNumber,
    regulator: input.regulator,
    websiteUrl: input.websiteUrl,
    donationUrl: input.donationUrl,
    description: input.description,
    logoUrl: input.logoUrl?.trim() || null,
    logoPermission: input.logoPermission,
    active: input.active,
  };
}

/** The conditions an editor can tag a listing with. */
export async function listConditionsForTagging(): Promise<
  { id: string; name: string; slug: string }[]
> {
  return db.condition.findMany({
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });
}
