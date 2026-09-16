/**
 * What a questionnaire form action hands back to the screen.
 *
 * Types and constants only, in a plain module. A `"use server"` file may only export async
 * functions — exporting a constant from one fails the build with a message naming a page
 * rather than the file (AGENTS.md section 9).
 */

export interface QuestionnaireFormState {
  status: "idle" | "error" | "draft_saved";
  /** Keyed by item key, plus "form" for anything about the whole set. */
  problems?: Record<string, string>;
  message?: string;
}

export const EMPTY_QUESTIONNAIRE_STATE: QuestionnaireFormState = { status: "idle" };

/** Which button was pressed. Read from the form, so it works with no JavaScript. */
export const SUBMIT_INTENT = "intent";
export const INTENT_FINISH = "finish";
export const INTENT_DRAFT = "draft";
