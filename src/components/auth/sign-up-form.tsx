"use client";

import { useActionState } from "react";

import { CheckboxRow } from "@/components/ui/checkbox";
import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";

export function SignUpForm({
  action,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.error} />

      <Field label="Email address" required error={fieldErrors.email}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
          />
        )}
      </Field>

      <Field
        label="Password"
        required
        hint="At least 12 characters. Three or four words you will actually remember work better than something clever you will not."
        error={fieldErrors.password}
      >
        {(props) => <Input {...props} name="password" type="password" autoComplete="new-password" required />}
      </Field>

      <CheckboxRow
        name="ageConfirmed"
        label="I am 18 or over."
        description="UnTouchable holds health information, and we hold none at all about under-18s. We do not ask for your date of birth."
        error={fieldErrors.ageConfirmed}
      />

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Creating your account…" : "Create my account"}
      </Button>
    </form>
  );
}
