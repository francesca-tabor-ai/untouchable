/**
 * Shared shape for the editorial forms.
 *
 * This lives outside `actions.ts` because a "use server" module may only export async
 * functions — a constant exported from one is a build error, not a lint warning.
 */
export interface EditorialFormState {
  status: "idle" | "error" | "saved";
  errors: Record<string, string>;
  message?: string;
}

export const EMPTY_EDITORIAL_STATE: EditorialFormState = { status: "idle", errors: {} };
