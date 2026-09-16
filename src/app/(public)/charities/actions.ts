"use server";

import { revalidatePath } from "next/cache";

import { addDonationNote } from "@/lib/charities/donation-notes";
import { followCharity, unfollowCharity } from "@/lib/charities/follows";
import { requireUser } from "@/lib/auth/guards";

/**
 * Server actions for the public charity pages.
 *
 * Each one re-checks who is signed in. The page having rendered a button is not a permission
 * check — AGENTS.md rule 10 — and each action is scoped to the acting person's own id, so
 * there is no parameter through which one person could act on another's record.
 */

export async function followCharityAction(formData: FormData) {
  const user = await requireUser("/charities");
  const charityId = String(formData.get("charityId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!charityId) return;

  await followCharity(user.id, charityId);
  if (slug) revalidatePath(`/charities/${slug}`);
  revalidatePath("/account/causes");
}

export async function unfollowCharityAction(formData: FormData) {
  const user = await requireUser("/charities");
  const charityId = String(formData.get("charityId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  if (!charityId) return;

  await unfollowCharity(user.id, charityId);
  if (slug) revalidatePath(`/charities/${slug}`);
  revalidatePath("/account/causes");
}

export async function addDonationNoteAction(formData: FormData) {
  const user = await requireUser("/charities");
  const charityId = String(formData.get("charityId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const donatedOnRaw = String(formData.get("donatedOn") ?? "");
  if (!charityId) return;

  const donatedOn = donatedOnRaw ? new Date(`${donatedOnRaw}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(donatedOn.getTime())) return;

  await addDonationNote({
    userId: user.id,
    charityId,
    amount: String(formData.get("amount") ?? "") || null,
    donatedOn,
    note: String(formData.get("note") ?? "") || null,
  });

  if (slug) revalidatePath(`/charities/${slug}`);
  revalidatePath("/account/causes");
}
