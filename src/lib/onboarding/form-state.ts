/**
 * What a form action hands back to the screen. Types only — safe to import from a client
 * component without dragging the database layer into the browser bundle.
 */
export interface FormState {
  /** One thing that went wrong with the whole form. */
  error?: string;
  /** Problems with particular fields, keyed by field name. */
  fieldErrors?: Record<string, string>;
}

export const EMPTY_FORM_STATE: FormState = {};

/** Turn a Zod error into field messages the form can show beside the right control. */
export function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join(".") || "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
