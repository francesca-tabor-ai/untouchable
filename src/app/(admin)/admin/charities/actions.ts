"use server";

import { revalidatePath } from "next/cache";

import { recordAudit, requireEditor } from "@/lib/auth/guards";
import {
  createCharity,
  setCharityActive,
  updateCharity,
  verifyCharity,
} from "@/lib/charities/admin";

/**
 * Editorial actions on charity listings.
 *
 * Every one of these calls `requireEditor()` first and writes an audit entry after. The page
 * having rendered a form is not a permission check — AGENTS.md rule 10.
 */

export interface FormState {
  status: "idle" | "saved" | "error";
  message?: string;
  problems?: Record<string, string>;
}

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    registeredNumber: String(formData.get("registeredNumber") ?? ""),
    regulator: String(formData.get("regulator") ?? ""),
    websiteUrl: String(formData.get("websiteUrl") ?? ""),
    donationUrl: String(formData.get("donationUrl") ?? ""),
    description: String(formData.get("description") ?? ""),
    logoUrl: String(formData.get("logoUrl") ?? ""),
    logoPermission: formData.get("logoPermission") === "on",
    active: formData.get("active") === "on",
    conditionIds: formData.getAll("conditionIds").map(String),
  };
}

export async function createCharityAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const editor = await requireEditor();
  const result = await createCharity(readForm(formData));

  if (!result.ok) {
    return {
      status: "error",
      message: "We could not save that listing.",
      problems: result.problems,
    };
  }

  await recordAudit(editor.id, "charity.create", { charityId: result.id, slug: result.slug });
  revalidatePath("/admin/charities");
  revalidatePath("/charities");

  return {
    status: "saved",
    message:
      "Listing created. It is not public yet — record your check against the official register to publish it.",
  };
}

export async function updateCharityAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const editor = await requireEditor();
  const id = String(formData.get("id") ?? "");
  if (!id) return { status: "error", message: "We could not tell which listing that was." };

  const result = await updateCharity(id, readForm(formData));
  if (!result.ok) {
    return {
      status: "error",
      message: "We could not save that listing.",
      problems: result.problems,
    };
  }

  await recordAudit(editor.id, "charity.update", { charityId: id, slug: result.slug });
  revalidatePath("/admin/charities");
  revalidatePath(`/admin/charities/${id}`);
  revalidatePath("/charities");
  revalidatePath(`/charities/${result.slug}`);

  return {
    status: "saved",
    message:
      "Saved. If you changed the name, the number or the regulator, the listing has left the public directory until it is checked again.",
  };
}

/**
 * Record that an editor checked this listing against the official register. The editor's own
 * id is taken from the session, never from the form — nobody signs off in someone else's name.
 */
export async function verifyCharityAction(formData: FormData) {
  const editor = await requireEditor();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const result = await verifyCharity(id, editor.id);
  if (!result.ok) return;

  await recordAudit(editor.id, "charity.verify", { charityId: id });
  revalidatePath("/admin/charities");
  revalidatePath(`/admin/charities/${id}`);
  revalidatePath("/charities");
}

export async function setCharityActiveAction(formData: FormData) {
  const editor = await requireEditor();
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  await setCharityActive(id, active);
  await recordAudit(editor.id, "charity.setActive", { charityId: id, active });
  revalidatePath("/admin/charities");
  revalidatePath(`/admin/charities/${id}`);
  revalidatePath("/charities");
}
