"use client";

import { useActionState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SelectInput } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";
import {
  FREQUENCY_SUGGESTIONS,
  INTERVENTION_TYPES,
  ROUTE_OPTIONS,
} from "@/lib/tracking/interventions";

export interface TreatmentFormValues {
  name: string;
  type: string;
  dose: string;
  frequency: string;
  route: string;
  startDate: string;
  adherenceRating: string;
}

/**
 * Adding or changing a treatment course — brief 7.6.
 *
 * **The name is an open text box with suggestions, not a menu.** The seeded lookup list is a
 * handful of common things; a real medicine cabinet will not match it, and being told "that
 * is not on our list" is being told your own treatment does not count. A `<datalist>` gives
 * the shortcut to anybody whose treatment is on the list and gets out of the way of everyone
 * else. Anything new becomes an `Intervention` with `dmdCode` null — we do not invent codes.
 *
 * Only the name, the kind and the start date are asked for. Dose, how often, how it is taken
 * and the adherence rating are all optional, because a good deal of what people record —
 * physiotherapy, a monitor, mindfulness — has no dose and no route, and a form that insists
 * on one is a form that teaches people to make something up.
 */
export function TreatmentForm({
  action,
  values,
  suggestions,
  submitLabel,
  legend,
  courseId,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  values: TreatmentFormValues;
  /** Names from the sample lookup list, offered as shortcuts. */
  suggestions: string[];
  submitLabel: string;
  legend: string;
  /** Set when editing. The action still re-checks that the course belongs to the person. */
  courseId?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.error ?? errors.form} />
      {courseId ? <input type="hidden" name="courseId" value={courseId} /> : null}

      <Card className="space-y-5 p-5 sm:p-6">
        <fieldset className="space-y-5">
          <legend className="sr-only">{legend}</legend>

          <Field
            label="What is it called?"
            hint="Whatever you call it is fine. If it is not in the list of suggestions, type it in anyway."
            error={errors.name}
            required
          >
            {(props) => (
              <>
                <Input
                  {...props}
                  name="name"
                  defaultValue={values.name}
                  list="treatment-name-suggestions"
                  autoComplete="off"
                  maxLength={120}
                />
                <datalist id="treatment-name-suggestions">
                  {suggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </>
            )}
          </Field>

          <Field label="What kind of treatment is it?" error={errors.type} required>
            {(props) => (
              <SelectInput {...props} name="type" defaultValue={values.type}>
                <option value="">Choose one</option>
                {INTERVENTION_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>

          <Field
            label="When did it start?"
            hint="Check-ins are counted from this date. If you are not sure of the exact day, near enough is fine."
            error={errors.startDate}
            required
          >
            {(props) => (
              <Input {...props} type="date" name="startDate" defaultValue={values.startDate} />
            )}
          </Field>
        </fieldset>
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <fieldset className="space-y-5">
          <legend className="text-title">The details, if you have them</legend>
          <p className="text-small text-muted">
            Leave any of these blank. A good deal of what people record has no dose and no
            strength.
          </p>

          <Field label="Dose or strength" hint="For example, 500mg, or two tablets." error={errors.dose}>
            {(props) => (
              <Input {...props} name="dose" defaultValue={values.dose} maxLength={120} />
            )}
          </Field>

          <Field label="How often" error={errors.frequency}>
            {(props) => (
              <>
                <Input
                  {...props}
                  name="frequency"
                  defaultValue={values.frequency}
                  list="treatment-frequency-suggestions"
                  autoComplete="off"
                  maxLength={120}
                />
                <datalist id="treatment-frequency-suggestions">
                  {FREQUENCY_SUGGESTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </>
            )}
          </Field>

          <Field label="How you take it" error={errors.route}>
            {(props) => (
              <SelectInput {...props} name="route" defaultValue={values.route}>
                <option value="">Not applicable, or leave blank</option>
                {ROUTE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>

          <Field
            label="How consistently have you managed to take it?"
            hint="Your own count, from 0 to 10. There is no right answer and nobody checks."
            error={errors.adherenceRating}
          >
            {(props) => (
              <SelectInput {...props} name="adherenceRating" defaultValue={values.adherenceRating}>
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
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
