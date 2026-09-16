"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/guards";
import { deleteDonationNote } from "@/lib/charities/donation-notes";
import { unfollowCharity } from "@/lib/charities/follows";

/**
 * Actions on a person's own causes. Each re-checks the session and is scoped to that
 * person's id — there is no parameter through which one person could touch another's record.
 */

export async function unfollowFromCausesAction(formData: FormData) {
  const user = await requireUser("/account/causes");
  const charityId = String(formData.get("charityId") ?? "");
  if (!charityId) return;

  await unfollowCharity(user.id, charityId);
  revalidatePath("/account/causes");
}

export async function deleteDonationNoteAction(formData: FormData) {
  const user = await requireUser("/account/causes");
  const noteId = String(formData.get("noteId") ?? "");
  if (!noteId) return;

  await deleteDonationNote(user.id, noteId);
  revalidatePath("/account/causes");
}
