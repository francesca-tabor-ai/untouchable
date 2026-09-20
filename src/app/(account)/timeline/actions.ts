"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdult } from "@/lib/auth/guards";
import { fieldErrorsFrom, type FormState } from "@/lib/onboarding/form-state";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { flagAreasFor } from "@/lib/timeline/areas";
import {
  parseCandidateForm,
  parseEventForm,
  parseObservationForm,
  parseStandingFactForm,
} from "@/lib/timeline/forms";
import {
  addCandidate,
  addObservation,
  addStandingFact,
  addTimelineEvent,
  reopenCandidate,
  retireStandingFact,
  ruleDownCandidate,
  setAssessment,
  supersedeRecord,
  updateSymptomDetail,
} from "@/lib/timeline/mutations";
import { deleteTimeline, loadTimeline } from "@/lib/timeline/queries";
import { fromDateInputValue } from "@/lib/tracking/dates";

/**
 * Every write to the timeline.
 *
 * Both guards at the top of every one of them, every time. A page having checked is not a
 * reason for an action to skip it — AGENTS.md section 8 — and nothing about anybody's health
 * is written without `core_tracking` consent.
 *
 * Two things here are structural rather than incidental:
 *
 *   - **A fired flag takes over the whole response.** When a rule matches and the thing is
 *     happening now, the redirect goes to the flag screen and nowhere else. No "saved", no
 *     timeline underneath it, nothing to scroll past.
 *   - **The row is written first.** Somebody who has just been sent to 999, rung 111 and
 *     been told to keep a record must not come back and find the entry gone.
 */

async function gate() {
  const user = await requireAdult("/timeline");
  await requireTrackingConsent(user.id);
  return user;
}

async function areasFor(userId: string) {
  const timeline = await loadTimeline(userId);
  return flagAreasFor(timeline.symptoms.map((symptom) => symptom.name));
}

export async function addObservationAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await gate();

  const parsed = parseObservationForm(formData);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    return { error: Object.values(fieldErrors)[0], fieldErrors };
  }

  const result = await addObservation(user.id, parsed.data, await areasFor(user.id));

  revalidatePath("/timeline");
  if (result.urgent) {
    redirect(`/timeline/flagged?rule=${encodeURIComponent(result.urgent.rule.key)}`);
  }
  redirect("/timeline?saved=1");
}

export async function addEventAction(_state: FormState, formData: FormData): Promise<FormState> {
  const user = await gate();

  const parsed = parseEventForm(formData);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    return { error: Object.values(fieldErrors)[0], fieldErrors };
  }

  const result = await addTimelineEvent(user.id, parsed.data, await areasFor(user.id));

  revalidatePath("/timeline");
  if (result.urgent) {
    redirect(`/timeline/flagged?rule=${encodeURIComponent(result.urgent.rule.key)}`);
  }
  redirect("/timeline?saved=1");
}

export async function addStandingFactAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await gate();

  const parsed = parseStandingFactForm(formData);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    return { error: Object.values(fieldErrors)[0], fieldErrors };
  }

  await addStandingFact(user.id, parsed.data);
  revalidatePath("/timeline");
  redirect("/timeline?saved=1");
}

export async function retireStandingFactAction(formData: FormData): Promise<void> {
  const user = await gate();
  await retireStandingFact(user.id, String(formData.get("id") ?? ""));
  revalidatePath("/timeline");
}

/**
 * Applying a resolution the person has confirmed.
 *
 * Reached only from a screen showing both versions side by side. The losing record is
 * marked, dated and given a reason; it is never deleted.
 */
export async function resolveContradictionAction(formData: FormData): Promise<void> {
  const user = await gate();

  const field = String(formData.get("field") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (field === "observation" || field === "event") {
    await supersedeRecord(user.id, {
      field,
      supersedeId: String(formData.get("supersedeId") ?? ""),
      keepId: String(formData.get("keepId") ?? "") || null,
      reason: reason || "You chose the other version.",
    });
  } else if (field === "symptom_onset") {
    await updateSymptomDetail(user.id, String(formData.get("userSymptomId") ?? ""), {
      firstOnset: fromDateInputValue(String(formData.get("firstOnset") ?? "")),
      firstOnsetConfidence: "confirmed",
    });
  }

  revalidatePath("/timeline");
}

export async function updateSymptomAction(formData: FormData): Promise<void> {
  const user = await gate();

  const status = String(formData.get("status") ?? "active");
  await updateSymptomDetail(user.id, String(formData.get("userSymptomId") ?? ""), {
    bodySite: String(formData.get("bodySite") ?? "").trim() || null,
    firstOnset: fromDateInputValue(String(formData.get("firstOnset") ?? "")),
    firstOnsetConfidence: confidenceOf(String(formData.get("firstOnsetConfidence") ?? "")),
    status: status === "resolved" || status === "intermittent" ? status : "active",
    resolvedDate: fromDateInputValue(String(formData.get("resolvedDate") ?? "")),
  });

  revalidatePath("/timeline");
}

export async function addCandidateAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await gate();

  const parsed = parseCandidateForm(formData);
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error.issues);
    return { error: Object.values(fieldErrors)[0], fieldErrors };
  }

  await addCandidate(user.id, parsed.data);
  revalidatePath("/timeline/questions");
  redirect("/timeline/questions?saved=1");
}

export async function setAssessmentAction(formData: FormData): Promise<void> {
  const user = await gate();

  const fit = String(formData.get("fit") ?? "not_yet_tested");
  await setAssessment(user.id, {
    candidateId: String(formData.get("candidateId") ?? ""),
    userSymptomId: String(formData.get("userSymptomId") ?? ""),
    fit: isFit(fit) ? fit : "not_yet_tested",
    note: String(formData.get("note") ?? "").trim() || null,
  });

  revalidatePath("/timeline/questions");
}

export async function ruleDownCandidateAction(formData: FormData): Promise<void> {
  const user = await gate();

  const status = String(formData.get("status") ?? "ruled_down");
  await ruleDownCandidate(user.id, String(formData.get("candidateId") ?? ""), {
    status: status === "excluded" ? "excluded" : "ruled_down",
    excludedBy: String(formData.get("excludedBy") ?? "").trim() || "No reason given.",
  });

  revalidatePath("/timeline/questions");
}

export async function reopenCandidateAction(formData: FormData): Promise<void> {
  const user = await gate();
  await reopenCandidate(user.id, String(formData.get("candidateId") ?? ""));
  revalidatePath("/timeline/questions");
}

/** Delete the whole timeline. Complete, immediate, and no argument about it. */
export async function deleteTimelineAction(): Promise<void> {
  const user = await gate();
  await deleteTimeline(user.id);
  revalidatePath("/timeline");
  redirect("/timeline?deleted=1");
}

function confidenceOf(value: string): "confirmed" | "probable" | "unconfirmed" {
  return value === "confirmed" || value === "probable" ? value : "unconfirmed";
}

function isFit(
  value: string,
): value is "supports" | "partial" | "against" | "neutral" | "not_yet_tested" {
  return ["supports", "partial", "against", "neutral", "not_yet_tested"].includes(value);
}
