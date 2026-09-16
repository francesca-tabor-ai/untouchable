"use client";

import { useActionState } from "react";

import { CheckboxRow } from "@/components/ui/checkbox";
import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";

export interface SymptomOption {
  id: string;
  name: string;
}

export function SymptomsForm({
  action,
  symptoms,
  initialIds,
  submitLabel = "Save and carry on",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  symptoms: SymptomOption[];
  initialIds: string[];
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const chosen = new Set(initialIds);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.error ?? state.fieldErrors?.symptomIds} />

      <Card className="p-5">
        <fieldset className="space-y-1">
          <legend className="sr-only">Symptoms to keep track of</legend>
          {symptoms.map((symptom) => (
            <CheckboxRow
              key={symptom.id}
              name="symptomId"
              value={symptom.id}
              label={symptom.name}
              defaultChecked={chosen.has(symptom.id)}
              className="py-1"
            />
          ))}
        </fieldset>
      </Card>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
