"use client";

import { useActionState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";

export function SignInForm({
  action,
  next,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  next: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="next" value={next} />

      <Field label="Email address" required>
        {(props) => (
          <Input {...props} name="email" type="email" autoComplete="email" inputMode="email" required />
        )}
      </Field>

      <Field label="Password" required>
        {(props) => (
          <Input {...props} name="password" type="password" autoComplete="current-password" required />
        )}
      </Field>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Signing you in…" : "Sign in"}
      </Button>
    </form>
  );
}
