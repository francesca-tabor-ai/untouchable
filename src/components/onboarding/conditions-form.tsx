"use client";

import { useActionState, useState } from "react";

import { CheckboxRow } from "@/components/ui/checkbox";
import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";

export interface ConditionOption {
  id: string;
  name: string;
  summary: string;
}

export interface ConditionChoice {
  conditionId: string;
  diagnosedYear: number | null;
  selfReported: boolean;
}

/**
 * Choosing conditions from a fixed list rather than typing them.
 *
 * The year of diagnosis and "a doctor diagnosed this" only appear once a condition is
 * ticked, so somebody who has one condition answers three things rather than thirty.
 * Both are optional, and leaving the diagnosis box unticked is not treated as doubt: it
 * records the answer as self-reported, which is the more careful thing for research to
 * assume.
 */
export function ConditionsForm({
  action,
  conditions,
  initial,
  currentYear,
  submitLabel = "Save and carry on",
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  conditions: ConditionOption[];
  initial: ConditionChoice[];
  currentYear: number;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const [chosen, setChosen] = useState<Set<string>>(
    () => new Set(initial.map((choice) => choice.conditionId)),
  );
  const initialById = new Map(initial.map((choice) => [choice.conditionId, choice]));

  function toggle(id: string, checked: boolean) {
    setChosen((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.error ?? state.fieldErrors?.selections} />

      <fieldset className="space-y-4">
        <legend className="sr-only">Conditions</legend>

        {conditions.map((condition) => {
          const checked = chosen.has(condition.id);
          const existing = initialById.get(condition.id);

          return (
            <Card key={condition.id} className="p-5">
              <CheckboxRow
                name="conditionId"
                value={condition.id}
                label={<span className="font-medium">{condition.name}</span>}
                description={condition.summary}
                checked={checked}
                onCheckedChange={(next) => toggle(condition.id, next)}
              >
                {checked ? (
                  <div className="mt-4 space-y-4 border-l-2 border-forest-100 pl-4">
                    <label className="block">
                      <span className="block text-small font-medium text-ink">
                        Year of diagnosis{" "}
                        <span className="font-normal text-muted">(optional)</span>
                      </span>
                      <input
                        type="number"
                        name={`year-${condition.id}`}
                        min={1900}
                        max={currentYear}
                        inputMode="numeric"
                        placeholder="2019"
                        defaultValue={existing?.diagnosedYear ?? ""}
                        className="mt-2 h-13 w-full rounded-field border border-line bg-white px-4 text-body text-ink sm:max-w-40"
                      />
                    </label>

                    <CheckboxRow
                      name={`diagnosed-${condition.id}`}
                      label="A doctor has diagnosed this."
                      description="Leave this unticked if you have not had a formal diagnosis. We record what you tell us either way — research just needs to know the difference."
                      defaultChecked={existing ? !existing.selfReported : false}
                    />
                  </div>
                ) : null}
              </CheckboxRow>
            </Card>
          );
        })}
      </fieldset>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
