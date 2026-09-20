"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field } from "@/components/ui/field";
import { SelectInput } from "@/components/ui/select";
import { ALLERGENS } from "@/lib/food/allergens";
import {
  type ConditionProfile,
  RESTRICTION_SOURCE_LABEL,
  reviewNoticeFor,
  type Severity,
  severities,
  statesDueForReview,
  tierForSeverity,
} from "@/lib/food/profile";
import { ASK_THE_CLINICIAN } from "@/lib/food/sources";

import { TierLabel } from "./tier";

/**
 * The profile.
 *
 * The severity question is asked properly rather than reduced to a checkbox, because
 * everything downstream depends on it: an anaphylaxis risk changes what the menu screen
 * puts at the top, and it is the difference between "avoid completely" and "depends how
 * much". A tool that collects "allergic to: nuts" has thrown that away at the front door
 * and cannot get it back.
 *
 * Temporary states are here rather than in a settings screen because they expire, and the
 * one at the top of this form is a rule somebody may have been keeping for a year after it
 * stopped applying.
 */

const SEVERITY_LABEL: Record<Severity, string> = {
  anaphylaxis: "Anaphylaxis — it can put me in hospital",
  moderate: "Moderate — a reaction I have to treat",
  intolerance: "Intolerance — it makes me unwell, but it is not an allergy",
};

export function ProfileForm({
  profile,
  onChange,
}: {
  profile: ConditionProfile;
  onChange: (next: ConditionProfile) => void;
}) {
  const [allergenKey, setAllergenKey] = React.useState(ALLERGENS[0].key);
  const [severity, setSeverity] = React.useState<Severity>("moderate");
  const [medication, setMedication] = React.useState("");
  const [never, setNever] = React.useState("");

  const dueForReview = statesDueForReview(profile, new Date());

  const addAllergy = () => {
    if (profile.allergies.some((allergy) => allergy.allergenKey === allergenKey)) return;
    onChange({
      ...profile,
      allergies: [...profile.allergies, { allergenKey, severity, confirmedBy: "clinician" }],
    });
  };

  return (
    <div className="space-y-10">
      {dueForReview.length > 0 ? (
        <Callout tone="care" title="These rules were only meant to last a while">
          {dueForReview.map((state) => (
            <p key={state.state} className="mt-2 first:mt-0">
              {reviewNoticeFor(state)}
            </p>
          ))}
        </Callout>
      ) : null}

      <section aria-labelledby="allergies-heading">
        <h2 id="allergies-heading" className="text-title">
          What you are allergic to
        </h2>
        <p className="mt-1 text-small text-muted">
          How bad a reaction is changes what this tool does with it, so it is worth being exact.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Allergen">
            {(fieldProps) => (
              <SelectInput
                {...fieldProps}
                value={allergenKey}
                onChange={(event) => setAllergenKey(event.target.value)}
              >
                {ALLERGENS.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.label}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label="How bad is a reaction">
            {(fieldProps) => (
              <SelectInput
                {...fieldProps}
                value={severity}
                onChange={(event) => setSeverity(event.target.value as Severity)}
              >
                {severities.map((value) => (
                  <option key={value} value={value}>
                    {SEVERITY_LABEL[value]}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>

        <Button variant="secondary" className="mt-4" onClick={addAllergy}>
          Add this
        </Button>

        {profile.allergies.length > 0 ? (
          <ul className="mt-6 space-y-3">
            {profile.allergies.map((allergy) => {
              const entry = ALLERGENS.find((item) => item.key === allergy.allergenKey);
              return (
                <li
                  key={allergy.allergenKey}
                  className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-white p-4"
                >
                  <span className="text-body text-ink">{entry?.label ?? allergy.allergenKey}</span>
                  <TierLabel tier={tierForSeverity(allergy.severity)} />
                  <span className="text-small text-ink-soft">{SEVERITY_LABEL[allergy.severity]}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() =>
                      onChange({
                        ...profile,
                        allergies: profile.allergies.filter(
                          (item) => item.allergenKey !== allergy.allergenKey,
                        ),
                      })
                    }
                  >
                    Remove<span className="sr-only"> {entry?.label ?? allergy.allergenKey}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="medicines-heading">
        <h2 id="medicines-heading" className="text-title">
          What you take
        </h2>
        <p className="mt-1 text-small text-muted">
          Names only, and only so that known food interactions can be looked up. Do not put doses
          here — this tool has no use for them.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Medicine" className="flex-1 min-w-[16rem]">
            {(fieldProps) => (
              <input
                {...fieldProps}
                value={medication}
                onChange={(event) => setMedication(event.target.value)}
                className="h-13 w-full rounded-field border border-line bg-white px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
              />
            )}
          </Field>
          <Button
            variant="secondary"
            onClick={() => {
              if (!medication.trim()) return;
              onChange({
                ...profile,
                medications: [...profile.medications, { name: medication.trim() }],
              });
              setMedication("");
            }}
          >
            Add
          </Button>
        </div>

        {profile.medications.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {profile.medications.map((item, index) => (
              <li key={`${item.name}-${index}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onChange({
                      ...profile,
                      medications: profile.medications.filter((_, at) => at !== index),
                    })
                  }
                >
                  {item.name} <span aria-hidden="true">×</span>
                  <span className="sr-only">Remove {item.name}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="never-heading">
        <h2 id="never-heading" className="text-title">
          Things you never eat
        </h2>
        <p className="mt-1 text-small text-muted">
          Whatever the reason. This tool does not ask you to justify anything on this list and does
          not suggest adding to it.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Add something" className="flex-1 min-w-[16rem]">
            {(fieldProps) => (
              <input
                {...fieldProps}
                value={never}
                onChange={(event) => setNever(event.target.value)}
                className="h-13 w-full rounded-field border border-line bg-white px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
              />
            )}
          </Field>
          <Button
            variant="secondary"
            onClick={() => {
              if (!never.trim()) return;
              onChange({ ...profile, neverList: [...profile.neverList, never.trim()] });
              setNever("");
            }}
          >
            Add
          </Button>
        </div>

        {profile.neverList.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {profile.neverList.map((item, index) => (
              <li key={`${item}-${index}`}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onChange({
                      ...profile,
                      neverList: profile.neverList.filter((_, at) => at !== index),
                    })
                  }
                >
                  {item} <span aria-hidden="true">×</span>
                  <span className="sr-only">Remove {item}</span>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {profile.restrictions.some((restriction) => restriction.source === "clinical") ? (
        <Callout tone="neutral" title="Restrictions a clinician set">
          <p>{ASK_THE_CLINICIAN}</p>
          <ul className="mt-3 space-y-1">
            {profile.restrictions
              .filter((restriction) => restriction.source === "clinical")
              .map((restriction) => (
                <li key={restriction.what}>
                  {restriction.what} — {RESTRICTION_SOURCE_LABEL[restriction.source]}
                </li>
              ))}
          </ul>
        </Callout>
      ) : null}
    </div>
  );
}
