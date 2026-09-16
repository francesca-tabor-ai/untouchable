"use client";

import { useActionState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { SelectInput } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";

export function WelcomeForm({
  action,
  regions,
  sexOptions,
  latestYearOfBirth,
  initial,
  submitLabel = "Save and carry on",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  regions: readonly string[];
  sexOptions: readonly string[];
  latestYearOfBirth: number;
  initial: { displayName: string; yearOfBirth: number | null; sex: string | null; region: string | null };
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.error} />

      <Field
        label="What shall we call you?"
        required
        hint="Only you see this. A first name, a nickname, anything you like."
        error={fieldErrors.displayName}
      >
        {(props) => (
          <Input
            {...props}
            name="displayName"
            defaultValue={initial.displayName}
            autoComplete="nickname"
            maxLength={60}
            required
          />
        )}
      </Field>

      <Field
        label="Year of birth"
        hint="The year only. We never ask for your date of birth, because a year is all the research needs."
        error={fieldErrors.yearOfBirth}
      >
        {(props) => (
          <Input
            {...props}
            name="yearOfBirth"
            type="number"
            inputMode="numeric"
            min={1900}
            max={latestYearOfBirth}
            placeholder="1974"
            defaultValue={initial.yearOfBirth ?? ""}
          />
        )}
      </Field>

      <Field
        label="Sex"
        hint="Some conditions and treatments work differently by sex, which is the only reason we ask."
        error={fieldErrors.sex}
      >
        {(props) => (
          <SelectInput {...props} name="sex" defaultValue={initial.sex ?? ""}>
            <option value="">Prefer not to say</option>
            {sexOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      <Field
        label="Region"
        hint="A rough part of the country. Never a postcode or an address."
        error={fieldErrors.region}
      >
        {(props) => (
          <SelectInput {...props} name="region" defaultValue={initial.region ?? ""}>
            <option value="">Prefer not to say</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
