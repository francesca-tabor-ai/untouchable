"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, Input, Textarea } from "@/components/ui/field";
import { doseLanguageMessage, doseLanguageProblem } from "@/lib/medicines/dose-language";
import type { EditorialMedicineLink, MedicineOption } from "@/lib/medicines/editorial";
import { MEDICINE_TYPE_LABELS } from "@/lib/medicines/queries";
import { MAX_CONTEXT_LENGTH, suggestMedicineSlug } from "@/lib/medicines/schemas";

import { EMPTY_EDITORIAL_STATE } from "./form-state";
import { FormMessages } from "./forms";
import {
  createMedicineAction,
  linkMedicineAction,
  unlinkMedicineAction,
} from "./medicine-actions";

/**
 * Medicines on the story draft screen.
 *
 * Two things this form insists on, out loud rather than in a validation message nobody
 * reads until they have finished typing:
 *
 * - **A medicine with no source is flagged.** Saying a named person took a particular drug
 *   is a claim about their body and often about their addiction. It is heavier than naming
 *   their condition, and it gets its own source. The flag is here beside the row and again
 *   in the publishing panel, where the second editor is looking.
 * - **Nothing dose-shaped.** The context line is checked as it is typed, and refused by the
 *   schema and the domain layer if it gets past that. AGENTS.md rule 15.
 */

const MEDICINE_TYPES = [
  { value: "rx", label: MEDICINE_TYPE_LABELS.rx },
  { value: "otc", label: MEDICINE_TYPE_LABELS.otc },
  { value: "supplement", label: MEDICINE_TYPE_LABELS.supplement },
  { value: "device", label: MEDICINE_TYPE_LABELS.device },
  { value: "non_drug", label: MEDICINE_TYPE_LABELS.non_drug },
];

const selectStyles =
  "h-13 w-full rounded-field border border-line bg-white px-4 text-body text-ink";

/** The flag a verifying editor has to see. Used beside a row and in the publishing panel. */
export function MissingSourceWarning({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  return (
    <Callout
      tone="warm"
      title={
        names.length === 1
          ? "One medicine on this story has no source"
          : `${names.length} medicines on this story have no source`
      }
      data-testid="medicine-missing-source"
    >
      <p>
        {names.join(", ")}. Saying that a named person took a particular drug is a heavier claim
        than naming their condition, and it needs its own source. Add the source to the story,
        then attribute the medicine to it.
      </p>
    </Callout>
  );
}

export function StoryMedicineList({
  storyId,
  links,
  editable,
}: {
  storyId: string;
  links: EditorialMedicineLink[];
  editable: boolean;
}) {
  if (links.length === 0) {
    return <p className="mt-5 text-ink-soft">No medicines or treatments on this story yet.</p>;
  }

  return (
    <ul className="mt-5 list-none space-y-3 p-0">
      {links.map((link) => (
        <li
          key={link.interventionId}
          className="rounded-card border border-line bg-white p-5"
          data-testid="medicine-link-row"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">
                {link.name}
                {link.isSensitiveTopic ? (
                  <span className="block text-legal text-clay-700">
                    Sensitive topic — people become dependent on this. The story and the
                    medicine page will carry a content note and support contacts.
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-small text-muted">{MEDICINE_TYPE_LABELS[link.type]}</p>
              {link.context ? <p className="mt-2 text-ink-soft">{link.context}</p> : null}
              {link.source ? (
                <p className="mt-2 text-legal text-muted">
                  Attributed to {link.source.publisher} — {link.source.title}
                </p>
              ) : null}
              {link.hasSummary ? null : (
                <p className="mt-2 text-legal text-muted">
                  No plain-English description yet, so it has no public page. The story shows the
                  name without a link until somebody writes one.
                </p>
              )}
            </div>
            {editable ? (
              <RemoveMedicineButton storyId={storyId} interventionId={link.interventionId} />
            ) : null}
          </div>

          {link.source ? null : (
            <div className="mt-4">
              <MissingSourceWarning names={[link.name]} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function RemoveMedicineButton({
  storyId,
  interventionId,
}: {
  storyId: string;
  interventionId: string;
}) {
  const [state, dispatch, pending] = useActionState(unlinkMedicineAction, EMPTY_EDITORIAL_STATE);

  return (
    <form action={dispatch}>
      <input type="hidden" name="storyId" value={storyId} />
      <input type="hidden" name="interventionId" value={interventionId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removing…" : "Remove"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

/** Put a medicine on this story, with the source it came from and a line of context. */
export function LinkMedicineForm({
  storyId,
  medicines,
  sources,
}: {
  storyId: string;
  medicines: MedicineOption[];
  sources: { id: string; title: string; publisher: string }[];
}) {
  const [state, dispatch, pending] = useActionState(linkMedicineAction, EMPTY_EDITORIAL_STATE);
  const [context, setContext] = useState("");
  const [sourceId, setSourceId] = useState("");

  const doseProblem = context.trim() ? doseLanguageProblem(context) : null;

  return (
    <form action={dispatch} className="space-y-6">
      <input type="hidden" name="storyId" value={storyId} />

      <Field label="Which medicine or treatment?" required error={state.errors.interventionId}>
        {(props) => (
          <select {...props} name="interventionId" required defaultValue="" className={selectStyles}>
            <option value="">Choose one</option>
            {medicines.map((medicine) => (
              <option key={medicine.id} value={medicine.id}>
                {medicine.name} — {MEDICINE_TYPE_LABELS[medicine.type]}
                {medicine.isSensitiveTopic ? " (sensitive topic)" : ""}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        label="Which source says they took it?"
        hint="One of the sources already on this story. Add the source first if it is not here."
        error={state.errors.sourceId}
      >
        {(props) => (
          <select
            {...props}
            name="sourceId"
            value={sourceId}
            onChange={(event) => setSourceId(event.target.value)}
            disabled={sources.length === 0}
            className={selectStyles}
          >
            <option value="">No source yet</option>
            {sources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.publisher} — {source.title}
              </option>
            ))}
          </select>
        )}
      </Field>

      {sourceId ? null : (
        <Callout tone="warm" title="This will be flagged before publication">
          <p>
            A medicine with no source is shown to the verifying editor as something to check.
            Saying that a named person took a particular drug is a heavier claim than naming
            their condition.
          </p>
        </Callout>
      )}

      <Field
        label="How did they come to it?"
        hint={`In our own words, at most ${MAX_CONTEXT_LENGTH} characters — "prescribed, aged eight", "bought online", "came off it in 2019". Never how much, never how often.`}
        error={state.errors.context ?? (doseProblem ? doseLanguageMessage(doseProblem) : undefined)}
      >
        {(props) => (
          <Input
            {...props}
            name="context"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            maxLength={MAX_CONTEXT_LENGTH}
          />
        )}
      </Field>
      <p className="text-small text-muted">
        {context.length} of {MAX_CONTEXT_LENGTH} characters
      </p>

      <Button type="submit" disabled={pending || Boolean(doseProblem)}>
        {pending ? "Saving…" : "Put this medicine on the story"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

/** A medicine that is not in the list yet. */
export function NewMedicineForm({ storyId }: { storyId: string }) {
  const [state, dispatch, pending] = useActionState(createMedicineAction, EMPTY_EDITORIAL_STATE);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [summary, setSummary] = useState("");

  const doseProblem = summary.trim() ? doseLanguageProblem(summary) : null;

  return (
    <form action={dispatch} className="space-y-6">
      <input type="hidden" name="storyId" value={storyId} />

      <Callout tone="neutral" title="Where the description comes from">
        <p>
          The NHS, the BNF, or the electronic Medicines Compendium — in our own words, never
          copied. Never a private clinic or a treatment provider, however good its page is: a
          page like that exists to find customers, and linking to it would sell the one thing
          this platform has.
        </p>
      </Callout>

      <Field label="Name" required error={state.errors.name}>
        {(props) => (
          <Input
            {...props}
            name="name"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugEdited) setSlug(suggestMedicineSlug(event.target.value));
            }}
          />
        )}
      </Field>

      <Field
        label="Web address"
        required
        hint="Lower-case words joined by hyphens, for example nitrazepam."
        error={state.errors.slug}
      >
        {(props) => (
          <Input
            {...props}
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugEdited(true);
              setSlug(event.target.value);
            }}
          />
        )}
      </Field>

      <Field label="What kind of thing is it?" required error={state.errors.type}>
        {(props) => (
          <select {...props} name="type" required defaultValue="rx" className={selectStyles}>
            {MEDICINE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        label="What is it, in plain English?"
        required
        hint="For someone reading on a phone, newly prescribed and frightened. What it is, what it is for, and how long it is normally used for. Never how much, never how often."
        error={state.errors.summary ?? (doseProblem ? doseLanguageMessage(doseProblem) : undefined)}
      >
        {(props) => (
          <Textarea
            {...props}
            name="summary"
            required
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            className="min-h-40"
          />
        )}
      </Field>

      <label className="flex items-start gap-3 text-body text-ink-soft">
        <input type="checkbox" name="isSensitiveTopic" className="mt-1.5 size-5" />
        <span>
          People become dependent on this, or it is misused. Every story naming it, and its own
          page, will carry a content note and support contacts, and will never show a donation
          prompt.
        </span>
      </label>

      <Button type="submit" disabled={pending || Boolean(doseProblem)}>
        {pending ? "Adding…" : "Add it and put it on this story"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}
