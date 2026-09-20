"use client";

import { useActionState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";

/**
 * Both of the other two fields are required, and that is the design.
 *
 * A possibility with nothing that would tell it apart and no test that would settle it
 * cannot become a question, so it cannot do anything for the person in an appointment. The
 * form asks for those two things at the point of writing it down, while somebody still
 * remembers why it occurred to them.
 */
export function CandidateForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      <Field label="What is it?" error={state.fieldErrors?.name} required>
        {(props) => <Input name="name" placeholder="Something to do with my ears" {...props} />}
      </Field>

      <Field
        label="What would tell it apart from the others?"
        error={state.fieldErrors?.discriminatingFeatures}
        required
      >
        {(props) => (
          <Textarea
            name="discriminatingFeatures"
            placeholder="It would be worse when I turn over in bed"
            {...props}
          />
        )}
      </Field>

      <Field
        label="What test or examination would settle it?"
        error={state.fieldErrors?.testsThatWouldSettleIt}
        required
      >
        {(props) => (
          <Textarea
            name="testsThatWouldSettleIt"
            placeholder="Someone looking in both ears"
            {...props}
          />
        )}
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Add it"}
      </Button>
    </form>
  );
}
