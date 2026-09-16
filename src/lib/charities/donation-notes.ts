import { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";

import { publicCharitySelect, publicCharityWhere, type PublicCharity } from "./queries";

/**
 * A private note someone keeps of a donation they made.
 *
 * This is a diary entry, not a transaction. UnTouchable never takes or holds payment, so we
 * cannot know whether a donation happened — only what the person tells us. The note is
 * theirs: never shown to the charity, never in the referral report, and the free-text field
 * never leaves the system (docs/privacy.md).
 */

export interface DonationNoteRecord {
  id: string;
  charity: PublicCharity;
  /** Pounds, as a string, so no decimal is lost on the way through. */
  amount: string | null;
  donatedOn: Date;
  note: string | null;
}

export const MAX_NOTE_LENGTH = 500;

export async function donationNotesFor(userId: string): Promise<DonationNoteRecord[]> {
  const rows = await db.donationNote.findMany({
    where: { userId },
    select: {
      id: true,
      amount: true,
      donatedOn: true,
      note: true,
      charity: { select: publicCharitySelect },
    },
    orderBy: { donatedOn: "desc" },
  });

  return rows.map((row) => ({
    id: row.id,
    charity: row.charity,
    amount: row.amount === null ? null : row.amount.toFixed(2),
    donatedOn: row.donatedOn,
    note: row.note,
  }));
}

export async function addDonationNote(input: {
  userId: string;
  charityId: string;
  amount?: string | null;
  donatedOn: Date;
  note?: string | null;
}): Promise<{ ok: boolean; problem?: string }> {
  const charity = await db.charity.findFirst({
    where: { ...publicCharityWhere, id: input.charityId },
    select: { id: true },
  });
  if (!charity) return { ok: false, problem: "We could not find that charity." };

  const amount = parseAmount(input.amount);
  if (amount === "invalid") {
    return { ok: false, problem: "Write the amount in pounds, for example 25 or 25.50." };
  }

  const note = input.note?.trim() || null;
  if (note && note.length > MAX_NOTE_LENGTH) {
    return { ok: false, problem: `Keep the note to ${MAX_NOTE_LENGTH} characters or fewer.` };
  }

  await db.donationNote.create({
    data: {
      userId: input.userId,
      charityId: input.charityId,
      amount,
      donatedOn: input.donatedOn,
      note,
    },
  });

  return { ok: true };
}

/** Deleting is scoped to the owner, so one person can never remove another's record. */
export async function deleteDonationNote(userId: string, noteId: string): Promise<void> {
  await db.donationNote.deleteMany({ where: { id: noteId, userId } });
}

function parseAmount(raw: string | null | undefined): Prisma.Decimal | null | "invalid" {
  const value = raw?.toString().trim().replace(/^£/, "");
  if (!value) return null;
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) return "invalid";
  return new Prisma.Decimal(value);
}
