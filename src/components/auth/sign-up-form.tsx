"use client";

import { useActionState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";

/**
 * Three fields, and then you are in.
 *
 * Nothing else belongs on this screen. Everything the product needs to know — what you are
 * living with, what you want to keep an eye on, what we may do with any of it — is asked
 * for at the moment it is actually needed, by the page that needs it. Asking first, at the
 * door, loses the person who came to read one story and was handed a form.
 */
export function SignUpForm({
  action,
  ageStatement,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  ageStatement: string;
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
          <Input {...props} name="displayName" autoComplete="nickname" maxLength={60} required />
        )}
      </Field>

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

      <p className="text-small text-muted">{ageStatement}</p>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Creating your account…" : "Create my account"}
      </Button>
    </form>
  );
}
