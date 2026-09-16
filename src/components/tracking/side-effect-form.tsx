"use client";

import { useActionState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Textarea } from "@/components/ui/field";
import { EMPTY_FORM_STATE } from "@/lib/onboarding/form-state";
import { SEVERITY_OPTIONS } from "@/lib/tracking/side-effects";

import type { SideEffectFormState } from "./side-effect-form-state";

/**
 * Recording a side effect against a treatment course — brief 7.6 and 7.8.
 *
 * The Yellow Card signpost is part of this section of the page at all times, above the form,
 * so it is on the screen before, during and after a report — there is no state in which a
 * report has been saved and the link is missing. The action stamps `yellowCardShownAt` and
 * hands back `showYellowCard`, and the confirmation here is a live region, so somebody using
 * a screen reader is told the report saved and told where the scheme is.
 *
 * Severity is five radio buttons rather than a slider. A slider defaults to a value, and a
 * severity nobody chose is worse than a slower form — this is the one place in the tracking
 * screens where making somebody think is the right trade.
 */
export function SideEffectForm({
  action,
  courseId,
  treatmentName,
}: {
  action: (state: SideEffectFormState, formData: FormData) => Promise<SideEffectFormState>;
  courseId: string;
  treatmentName: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE as SideEffectFormState);
  const errors = state.fieldErrors ?? {};

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-5" noValidate>
        <FormError message={state.error ?? errors.form} />
        <input type="hidden" name="courseId" value={courseId} />

        <Card className="space-y-5 p-5 sm:p-6">
          <fieldset className="space-y-5">
            <legend className="sr-only">Record a side effect of {treatmentName}</legend>

            <Field
              label="What happened?"
              hint="In your own words. Only you will ever see this. It is never included in any research."
              error={errors.description}
              required
            >
              {(props) => (
                <Textarea {...props} name="description" rows={4} maxLength={1000} />
              )}
            </Field>
          </fieldset>

          <fieldset>
            <legend className="block text-small font-medium text-ink">
              How bad was it?<span className="text-clay-700"> *</span>
            </legend>
            <p className="mt-1 text-small text-muted">Your own rating. There is no right answer.</p>

            <div className="mt-3 space-y-1">
              {SEVERITY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-3">
                  <input
                    id={`severity-${option.value}`}
                    type="radio"
                    name="severity"
                    value={String(option.value)}
                    className="h-5 w-5 shrink-0 accent-[var(--color-forest-800)]"
                  />
                  <label
                    htmlFor={`severity-${option.value}`}
                    className="block cursor-pointer py-2 text-body text-ink"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </div>

            {errors.severity ? (
              <p role="alert" className="mt-2 text-small text-danger">
                {errors.severity}
              </p>
            ) : null}
          </fieldset>
        </Card>

        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Saving…" : "Save this side effect"}
        </Button>
      </form>

      <div role="status" aria-live="polite">
        {state.showYellowCard ? (
          <p className="text-body text-ink">
            Saved to your own record. The MHRA Yellow Card scheme, for reporting a suspected side
            effect, is on this page under &ldquo;Reporting a side effect to the MHRA&rdquo;.
          </p>
        ) : null}
      </div>
    </div>
  );
}
