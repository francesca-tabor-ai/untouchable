"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  DEFINITION_FIELDS,
  EMPTY_ADMIN_STATE,
  type QuestionnaireAdminState,
} from "@/app/(admin)/admin/questionnaires/form-state";
import type { VersionFormValues } from "@/lib/questionnaires/admin";

/**
 * The form an admin uses to write a questionnaire version.
 *
 * The four definitions are JSON, because the definition is JSON: an admin loading a licensed
 * instrument will be pasting one in, and a form builder would be a lossy retyping of
 * something they already have. Every mistake is explained beside the box it is in, and
 * nothing can be published until all of them are gone.
 */
export function VersionForm({
  action,
  values,
  lockKey,
  submitLabel,
  hidden,
}: {
  action: (
    state: QuestionnaireAdminState,
    formData: FormData,
  ) => Promise<QuestionnaireAdminState>;
  values: VersionFormValues;
  /** True once the questionnaire exists: its key is what responses are grouped by. */
  lockKey: boolean;
  submitLabel: string;
  /** Extra values the action needs, such as which draft is being saved. */
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_ADMIN_STATE);
  const problems = state.problems ?? {};

  return (
    <form action={formAction} className="mt-8 max-w-[46rem] space-y-6" noValidate>
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {problems.form ? (
        <div role="alert" className="rounded-card border border-danger/40 bg-clay-100 px-5 py-4 text-small">
          {problems.form}
        </div>
      ) : null}
      {state.status === "saved" && state.message ? (
        <p role="status" className="rounded-card border border-line bg-cream-50 px-5 py-4 text-small">
          {state.message}
        </p>
      ) : null}

      <Field
        label="Key"
        required
        hint="Used in addresses and to group every version together. It never changes once responses exist."
        error={problems.key}
      >
        {(field) =>
          lockKey ? (
            <>
              <Input {...field} value={values.key} readOnly disabled />
              <input type="hidden" name="key" value={values.key} />
            </>
          ) : (
            <Input {...field} name="key" defaultValue={values.key} />
          )
        }
      </Field>

      <Field label="Title" required hint="What the person answering sees at the top." error={problems.title}>
        {(field) => <Input {...field} name="title" defaultValue={values.title} />}
      </Field>

      <Field
        label="Licence note"
        required
        hint="Validated instruments such as EQ-5D and PROMIS carry licence terms. Write down what they are, and who agreed them. A questionnaire with no licence note cannot be published."
        error={problems.licenceNote}
      >
        {(field) => <Textarea {...field} name="licenceNote" rows={3} defaultValue={values.licenceNote} />}
      </Field>

      {DEFINITION_FIELDS.map((field) => (
        <Field key={field.name} label={field.label} required hint={field.hint} error={problems[field.name]}>
          {(props) => (
            <Textarea
              {...props}
              name={field.name}
              rows={field.name === "items" ? 18 : 8}
              spellCheck={false}
              defaultValue={values[field.name]}
              className="font-mono text-small"
            />
          )}
        </Field>
      ))}

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
