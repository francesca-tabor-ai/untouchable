"use client";

import { useActionState } from "react";

import { CheckboxRow } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  EMPTY_ADMIN_STATE,
  type QuestionnaireAdminState,
} from "@/app/(admin)/admin/questionnaires/form-state";

/**
 * Publishing a version.
 *
 * The tick box is not a formality. Validated instruments carry licence terms, and loading one
 * without a licence is not allowed — so somebody has to say, on the record, that the terms are
 * written down and permit this. The confirmation goes into the audit entry with their name.
 *
 * Publishing cannot be undone, and the button says so.
 */
export function PublishForm({
  action,
  versionId,
  version,
}: {
  action: (
    state: QuestionnaireAdminState,
    formData: FormData,
  ) => Promise<QuestionnaireAdminState>;
  versionId: string;
  version: number;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_ADMIN_STATE);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="versionId" value={versionId} />

      {state.problems.form ? (
        <div role="alert" className="rounded-card border border-danger/40 bg-clay-100 px-5 py-4 text-small">
          {state.problems.form}
        </div>
      ) : null}
      {Object.entries(state.problems)
        .filter(([field]) => field !== "form")
        .map(([field, message]) => (
          <div key={field} role="alert" className="rounded-card border border-danger/40 bg-clay-100 px-5 py-4 text-small">
            {message}
          </div>
        ))}
      {state.status === "saved" && state.message ? (
        <p role="status" className="rounded-card border border-line bg-cream-50 px-5 py-4 text-small">
          {state.message}
        </p>
      ) : null}

      <CheckboxRow
        name="licenceConfirmed"
        label="The licence terms for this questionnaire are recorded and allow it to be used here."
        description="If this is a validated instrument such as EQ-5D or PROMIS, do not publish it until the licence is in place."
      />

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Publishing…" : `Publish version ${version}`}
      </Button>
      <p className="text-small text-muted">
        Once published, this version can be answered, and it can never be changed. A change means a
        new version.
      </p>
    </form>
  );
}
