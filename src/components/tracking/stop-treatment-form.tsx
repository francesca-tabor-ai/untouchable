"use client";

import { useActionState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SelectInput } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";
import { STOP_REASONS } from "@/lib/tracking/treatments";

/**
 * Stopping a treatment course — brief 7.6.
 *
 * The stop reason is one of five fixed answers, because a reason nobody can count is a
 * reason research cannot use, and "why people stop" is one of the few things this platform
 * is genuinely placed to find out.
 *
 * The note beside it is free text and is **never exported** — it is shown back to the person
 * who wrote it and to nobody else, which is why the label says so out loud.
 *
 * Nothing here treats stopping as a failure, and nothing asks anybody to reconsider.
 */
export function StopTreatmentForm({
  action,
  courseId,
  defaultEndDate,
  defaultAdherence,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  courseId: string;
  defaultEndDate: string;
  defaultAdherence: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormError message={state.error ?? errors.form} />
      <input type="hidden" name="courseId" value={courseId} />

      <Card className="space-y-5 p-5 sm:p-6">
        <fieldset className="space-y-5">
          <legend className="sr-only">Record that you have stopped this treatment</legend>

          <Field label="When did you stop?" error={errors.endDate} required>
            {(props) => (
              <Input {...props} type="date" name="endDate" defaultValue={defaultEndDate} />
            )}
          </Field>

          <Field label="What led to stopping?" error={errors.stopReason} required>
            {(props) => (
              <SelectInput {...props} name="stopReason" defaultValue="">
                <option value="">Choose one</option>
                {STOP_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>

          <Field
            label="Anything you want to add, in your own words"
            hint="Only you will ever see this. It is never included in any research."
            error={errors.stopReasonNote}
          >
            {(props) => <Textarea {...props} name="stopReasonNote" rows={4} maxLength={1000} />}
          </Field>

          <Field
            label="How consistently did you manage to take it?"
            hint="Your own count, from 0 to 10."
            error={errors.adherenceRating}
          >
            {(props) => (
              <SelectInput {...props} name="adherenceRating" defaultValue={defaultAdherence}>
                <option value="">Rather not say</option>
                {Array.from({ length: 11 }, (_, score) => (
                  <option key={score} value={String(score)}>
                    {score}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </fieldset>
      </Card>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : "Record that I have stopped"}
      </Button>
    </form>
  );
}
