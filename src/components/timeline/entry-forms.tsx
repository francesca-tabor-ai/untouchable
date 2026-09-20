"use client";

import { useActionState } from "react";

import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { SelectInput } from "@/components/ui/select";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";
import {
  CONFIDENCE_LABELS,
  EVENT_TYPE_LABELS,
  SOURCE_LABELS,
  STANDING_FACT_LABELS,
} from "@/lib/timeline/records";

/**
 * The three ways something gets onto the timeline.
 *
 * Two things shape all of them:
 *
 * **Nothing is required except the thing itself.** A date and a sentence. Everything else —
 * how long it lasted, what set it off, what helped — is optional, because a form that
 * demands eight fields at four in the morning gets an entry that is not made at all, and a
 * missing entry is worse than a thin one.
 *
 * **Where it came from is asked every time, and it is never pre-answered.** The default
 * source is "remembered later", which is the honest default for somebody filling this in on
 * a Sunday about a Tuesday. Defaulting it to "written at the time" would quietly upgrade
 * every memory in the record to evidence, which is the exact failure the provenance columns
 * exist to prevent.
 */

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

function Provenance({ errors }: { errors?: Record<string, string> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Where does this come from?" error={errors?.source} required>
        {(props) => (
          <SelectInput name="source" defaultValue="recollection" {...props}>
            {Object.entries(SOURCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      <Field label="How sure are you?" error={errors?.confidence} required>
        {(props) => (
          <SelectInput name="confidence" defaultValue="probable" {...props}>
            {Object.entries(CONFIDENCE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
    </div>
  );
}

export function ObservationForm({
  action,
  symptoms,
  today,
}: {
  action: Action;
  symptoms: { id: string; name: string }[];
  today: string;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      <Field label="Which symptom?" error={state.fieldErrors?.userSymptomId} required>
        {(props) => (
          <SelectInput name="userSymptomId" {...props}>
            {symptoms.map((symptom) => (
              <option key={symptom.id} value={symptom.id}>
                {symptom.name}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="When did it happen?" error={state.fieldErrors?.occurredAt} required>
          {(props) => <Input type="date" name="occurredAt" defaultValue={today} {...props} />}
        </Field>

        <Field label="How bad was it, 0 to 10?" hint="0 is not at all, 10 is as bad as it has been.">
          {(props) => <Input type="number" name="severity" min={0} max={10} {...props} />}
        </Field>
      </div>

      <Field label="What was it like?" hint="Your own words are the most useful thing here.">
        {(props) => (
          <Textarea
            name="character"
            placeholder="Like a band round my head, worse when I lie down"
            {...props}
          />
        )}
      </Field>

      <details className="rounded-card border border-line bg-cream-50 p-5">
        <summary className="cursor-pointer text-small font-medium text-ink">
          Add more detail
        </summary>
        <div className="mt-5 space-y-5">
          <Field label="How long did it last?">
            {(props) => <Input name="duration" placeholder="About forty minutes" {...props} />}
          </Field>
          <Field label="Anything set it off?">
            {(props) => <Input name="triggers" {...props} />}
          </Field>
          <Field label="Anything make it easier?">
            {(props) => <Input name="relievingFactors" {...props} />}
          </Field>
        </div>
      </details>

      <Provenance errors={state.fieldErrors} />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Add to timeline"}
      </Button>
    </form>
  );
}

export function EventForm({ action, today }: { action: Action; today: string }) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="What kind of thing was it?" error={state.fieldErrors?.type} required>
          {(props) => (
            <SelectInput name="type" defaultValue="appointment" {...props}>
              {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>

        <Field label="When did it happen?" error={state.fieldErrors?.occurredAt} required>
          {(props) => <Input type="date" name="occurredAt" defaultValue={today} {...props} />}
        </Field>
      </div>

      <Field label="What happened?" error={state.fieldErrors?.description} required>
        {(props) => (
          <Textarea name="description" placeholder="Saw the GP about the dizziness" {...props} />
        )}
      </Field>

      <details className="rounded-card border border-line bg-cream-50 p-5">
        <summary className="cursor-pointer text-small font-medium text-ink">
          Add more detail
        </summary>
        <div className="mt-5 space-y-5">
          <Field label="Who did you see?">
            {(props) => <Input name="provider" placeholder="A GP at my surgery" {...props} />}
          </Field>
          <Field label="What came of it?">
            {(props) => <Textarea name="outcome" {...props} />}
          </Field>
          <Field
            label="Is there a letter or a result for this?"
            hint="Naming it here puts it on your list of things to chase, even if you do not have it yet."
          >
            {(props) => (
              <Input name="documentRef" placeholder="Clinic letter, not obtained" {...props} />
            )}
          </Field>
        </div>
      </details>

      <Provenance errors={state.fieldErrors} />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Add to timeline"}
      </Button>
    </form>
  );
}

export function StandingFactForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state.error} />

      <Field label="What kind of thing is it?" error={state.fieldErrors?.category} required>
        {(props) => (
          <SelectInput name="category" defaultValue="allergy" {...props}>
            {Object.entries(STANDING_FACT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>

      <Field label="What is it?" error={state.fieldErrors?.value} required>
        {(props) => <Input name="value" placeholder="Penicillin" {...props} />}
      </Field>

      <Field label="Since when?">
        {(props) => <Input type="date" name="dateEstablished" {...props} />}
      </Field>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Add"}
      </Button>
    </form>
  );
}
