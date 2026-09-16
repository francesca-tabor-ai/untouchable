"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordAudit, requireEditor } from "@/lib/auth/guards";
import {
  createNextVersionDraft,
  createQuestionnaireDraft,
  publishVersionDraft,
  saveVersionDraft,
  type VersionFormValues,
} from "@/lib/questionnaires/admin";

import type { QuestionnaireAdminState } from "./form-state";

/**
 * Creating and publishing questionnaire versions.
 *
 * Every action calls `requireEditor()` first and `recordAudit()` after — the page having
 * rendered a form is not a permission check (AGENTS.md rule 10), and every admin action is
 * recorded (brief 7.9).
 *
 * None of these contain a rule. The rules — what a version may contain, that a published
 * version never changes, that a questionnaire without a licence note may not be published —
 * live in `src/lib/questionnaires/` where they can be tested without a browser.
 */

function readForm(formData: FormData): VersionFormValues {
  return {
    key: String(formData.get("key") ?? ""),
    title: String(formData.get("title") ?? ""),
    licenceNote: String(formData.get("licenceNote") ?? ""),
    items: String(formData.get("items") ?? ""),
    scoring: String(formData.get("scoring") ?? ""),
    redFlags: String(formData.get("redFlags") ?? ""),
    schedule: String(formData.get("schedule") ?? ""),
  };
}

export async function createQuestionnaireAction(
  _state: QuestionnaireAdminState,
  formData: FormData,
): Promise<QuestionnaireAdminState> {
  const editor = await requireEditor();
  const values = readForm(formData);
  const result = await createQuestionnaireDraft(values);

  if (!result.ok) {
    return { status: "error", problems: result.problems, message: "That could not be saved." };
  }

  await recordAudit(editor.id, "questionnaire.create", {
    questionnaire: result.questionnaireKey,
    version: result.version,
  });
  revalidatePath("/admin/questionnaires");
  redirect(`/admin/questionnaires/${result.questionnaireKey}/versions/${result.versionId}`);
}

export async function addVersionAction(
  _state: QuestionnaireAdminState,
  formData: FormData,
): Promise<QuestionnaireAdminState> {
  const editor = await requireEditor();
  const values = readForm(formData);
  const result = await createNextVersionDraft(values.key, values);

  if (!result.ok) {
    return { status: "error", problems: result.problems, message: "That could not be saved." };
  }

  await recordAudit(editor.id, "questionnaire.version.create", {
    questionnaire: result.questionnaireKey,
    version: result.version,
  });
  revalidatePath("/admin/questionnaires");
  redirect(`/admin/questionnaires/${result.questionnaireKey}/versions/${result.versionId}`);
}

export async function saveVersionAction(
  _state: QuestionnaireAdminState,
  formData: FormData,
): Promise<QuestionnaireAdminState> {
  const editor = await requireEditor();
  const versionId = String(formData.get("versionId") ?? "");
  const result = await saveVersionDraft(versionId, readForm(formData));

  if (!result.ok) {
    return { status: "error", problems: result.problems, message: "That could not be saved." };
  }

  await recordAudit(editor.id, "questionnaire.version.update", {
    questionnaire: result.questionnaireKey,
    version: result.version,
  });
  revalidatePath(`/admin/questionnaires/${result.questionnaireKey}`);

  return {
    status: "saved",
    problems: {},
    message: "Saved as a draft. Nobody is asked these questions until you publish it.",
  };
}

export async function publishVersionAction(
  _state: QuestionnaireAdminState,
  formData: FormData,
): Promise<QuestionnaireAdminState> {
  const editor = await requireEditor();
  const versionId = String(formData.get("versionId") ?? "");

  if (formData.get("licenceConfirmed") !== "on") {
    return {
      status: "error",
      problems: {
        form: "Confirm that the licence terms are recorded and allow this questionnaire to be used here.",
      },
    };
  }

  const result = await publishVersionDraft(versionId);
  if (!result.ok) {
    return { status: "error", problems: result.problems, message: "That could not be published." };
  }

  await recordAudit(editor.id, "questionnaire.version.publish", {
    questionnaire: result.questionnaireKey,
    version: result.version,
    licenceConfirmedBy: editor.email,
  });
  revalidatePath("/admin/questionnaires");
  revalidatePath(`/admin/questionnaires/${result.questionnaireKey}`);

  // Back to the questionnaire rather than a message on a form that is about to disappear:
  // once a version is published, its page no longer has a form on it at all.
  redirect(`/admin/questionnaires/${result.questionnaireKey}?published=${result.version}`);
}
