"use client";

import { useActionState } from "react";

import { ConsentChoices } from "@/components/consent/consent-choices";
import type { ConsentChoiceView } from "@/components/consent/consent-details";
import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";

export function ConsentForm({
  choices,
  action,
  submitLabel = "Save my choices",
}: {
  choices: ConsentChoiceView[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />
      <ConsentChoices choices={choices} />
      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
