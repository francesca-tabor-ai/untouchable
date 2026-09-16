/**
 * Shared shape for the public correction form.
 *
 * Kept out of `actions.ts` because a "use server" module may only export async functions.
 */
export interface CorrectionFormState {
  status: "idle" | "sent" | "error";
  errors: Record<string, string>;
}

export const EMPTY_CORRECTION_STATE: CorrectionFormState = { status: "idle", errors: {} };
