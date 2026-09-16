"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/(admin)/admin/charities/actions";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, Input, Textarea } from "@/components/ui/field";
import { REGULATORS } from "@/lib/charities/regulators";
import type { Regulator } from "@/generated/prisma";

/**
 * Create or edit a charity listing.
 *
 * The form does not offer "verified" as a checkbox. Recording a check against the official
 * register is a separate, deliberate act with the editor's own name on it — see the verify
 * button on the edit page.
 */

export interface CharityFormValues {
  id?: string;
  name: string;
  slug: string;
  registeredNumber: string;
  regulator: Regulator;
  websiteUrl: string;
  donationUrl: string;
  description: string;
  logoUrl: string;
  logoPermission: boolean;
  active: boolean;
  conditionIds: string[];
}

export function CharityForm({
  action,
  values,
  conditions,
  submitLabel,
}: {
  action: (previous: FormState, formData: FormData) => Promise<FormState>;
  values: CharityFormValues;
  conditions: { id: string; name: string; slug: string }[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" } as FormState);
  const problem = (key: string) => state.problems?.[key];

  return (
    <form action={formAction} className="mt-8 max-w-[42rem] space-y-6">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {state.message ? (
        <Callout tone={state.status === "error" ? "warm" : "care"}>
          <p role="status">{state.message}</p>
          {problem("form") ? <p className="mt-2">{problem("form")}</p> : null}
        </Callout>
      ) : null}

      <Field
        label="Charity name"
        hint="Exactly as it appears on the register."
        required
        error={problem("name")}
      >
        {(props) => <Input {...props} name="name" defaultValue={values.name} required />}
      </Field>

      <Field
        label="Web address on this site"
        hint="Lower-case words separated by hyphens, for example mendip-breast-care."
        required
        error={problem("slug")}
      >
        {(props) => <Input {...props} name="slug" defaultValue={values.slug} required />}
      </Field>

      <Field label="Registered charity number" required error={problem("registeredNumber")}>
        {(props) => (
          <Input
            {...props}
            name="registeredNumber"
            defaultValue={values.registeredNumber}
            required
          />
        )}
      </Field>

      <Field label="Regulator" required error={problem("regulator")}>
        {(props) => (
          <select
            {...props}
            name="regulator"
            defaultValue={values.regulator}
            className="rounded-field border-line text-body text-ink h-13 w-full border bg-white px-4"
            required
          >
            {Object.values(REGULATORS).map((regulator) => (
              <option key={regulator.code} value={regulator.code}>
                {regulator.name} ({regulator.nations})
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field label="Charity website" required error={problem("websiteUrl")}>
        {(props) => (
          <Input
            {...props}
            name="websiteUrl"
            type="url"
            defaultValue={values.websiteUrl}
            required
          />
        )}
      </Field>

      <Field
        label="Donation page"
        hint="The charity's own donation page, or its page on a regulated donation platform."
        required
        error={problem("donationUrl")}
      >
        {(props) => (
          <Input
            {...props}
            name="donationUrl"
            type="url"
            defaultValue={values.donationUrl}
            required
          />
        )}
      </Field>

      <Field
        label="Description"
        hint="In our own words, not copied from the charity. Plain English, no health claims."
        required
        error={problem("description")}
      >
        {(props) => (
          <Textarea {...props} name="description" defaultValue={values.description} required />
        )}
      </Field>

      <Field
        label="Logo file"
        hint="A path on this site, for example /charity-logos/name.svg. We do not load logos from the charity's own server, because that would tell them who is reading the page."
        error={problem("logoUrl")}
      >
        {(props) => <Input {...props} name="logoUrl" defaultValue={values.logoUrl} />}
      </Field>

      <fieldset className="rounded-card border-line space-y-3 border bg-white p-5">
        <legend className="text-small text-ink px-2 font-medium">Permissions and visibility</legend>

        <label className="text-body flex items-start gap-3">
          <input
            type="checkbox"
            name="logoPermission"
            defaultChecked={values.logoPermission}
            className="mt-1.5 size-5"
          />
          <span>
            We have written permission to use this charity&rsquo;s name and logo.
            <span className="text-small text-muted mt-1 block">
              Without this, the name is shown as text and the logo is never displayed.
            </span>
          </span>
        </label>

        <label className="text-body flex items-start gap-3">
          <input
            type="checkbox"
            name="active"
            defaultChecked={values.active}
            className="mt-1.5 size-5"
          />
          <span>
            List this charity on the public site.
            <span className="text-small text-muted mt-1 block">
              It also needs a recorded check against the official register before anyone can see it.
            </span>
          </span>
        </label>
      </fieldset>

      <fieldset className="rounded-card border-line space-y-3 border bg-white p-5">
        <legend className="text-small text-ink px-2 font-medium">
          Conditions this charity works on
        </legend>
        {conditions.length === 0 ? (
          <p className="text-small text-muted">There are no conditions to tag yet.</p>
        ) : (
          conditions.map((condition) => (
            <label key={condition.id} className="text-body flex items-center gap-3">
              <input
                type="checkbox"
                name="conditionIds"
                value={condition.id}
                defaultChecked={values.conditionIds.includes(condition.id)}
                className="size-5"
              />
              <span>{condition.name}</span>
            </label>
          ))
        )}
      </fieldset>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
