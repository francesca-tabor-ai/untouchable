import type { FormState } from "@/lib/onboarding/form-state";

/**
 * What the side effect action hands back.
 *
 * In its own module rather than beside the action, because a `"use server"` file may only
 * export async functions — exporting a type or a constant from one fails the build with a
 * message that names a page instead of the file. See AGENTS.md section 9 and DECISIONS.md
 * D-020.
 */
export interface SideEffectFormState extends FormState {
  /**
   * Set once a report has been saved. The form renders the MHRA Yellow Card note when it is
   * true, in the same response that saved the report — which is what
   * `SideEffectReport.yellowCardShownAt` records.
   */
  showYellowCard?: boolean;
  savedReportId?: string;
}
