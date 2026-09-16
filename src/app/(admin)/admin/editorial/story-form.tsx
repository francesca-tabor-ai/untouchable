"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, Input, Textarea } from "@/components/ui/field";
import { formatKeyMomentsInput, type KeyMoment } from "@/lib/stories/key-moments";
import { MAX_QUOTE_WORDS } from "@/lib/stories/schemas";

import { createStoryAction, updateStoryAction } from "./actions";
import { EMPTY_EDITORIAL_STATE, type EditorialFormState } from "./form-state";
import { FormMessages } from "./forms";

export interface StoryFormValues {
  id?: string;
  type: "public_figure" | "community";
  publicFigureId: string | null;
  disclosureType: "own" | "loved_one";
  title: string;
  slug: string;
  summary: string;
  keyMoments: KeyMoment[];
  quote: string | null;
  quoteSourceId: string | null;
  contentNote: string | null;
  communityPermissionConfirmed: boolean | null;
  conditionIds: string[];
}

export const BLANK_STORY: StoryFormValues = {
  type: "public_figure",
  publicFigureId: null,
  disclosureType: "own",
  title: "",
  slug: "",
  summary: "",
  keyMoments: [],
  quote: null,
  quoteSourceId: null,
  contentNote: null,
  communityPermissionConfirmed: null,
  conditionIds: [],
};

/**
 * Drafting and editing a story.
 *
 * The form says what the rules are rather than hiding them: self-disclosure only, our own
 * words, a short attributed quote at most. An editor who is about to break one of these
 * should find out here, not from a database error.
 */
export function StoryForm({
  mode,
  values,
  figures,
  conditions,
  sources,
  editable,
}: {
  mode: "create" | "edit";
  values: StoryFormValues;
  figures: { id: string; name: string; isDeceased: boolean }[];
  conditions: { id: string; name: string; isSensitiveTopic: boolean }[];
  /** Sources already on the story — a quote can only be attributed to one of these. */
  sources: { id: string; title: string; publisher: string }[];
  /** False once a story is published: content changes then go through a correction. */
  editable: boolean;
}) {
  const [state, dispatch, pending] = useActionState<EditorialFormState, FormData>(
    mode === "create" ? createStoryAction : updateStoryAction,
    EMPTY_EDITORIAL_STATE,
  );

  const [type, setType] = useState(values.type);
  const [quote, setQuote] = useState(values.quote ?? "");
  const quoteWords = quote.trim() ? quote.trim().split(/\s+/).length : 0;

  return (
    <form action={dispatch} className="space-y-8">
      {values.id ? <input type="hidden" name="storyId" value={values.id} /> : null}

      <Callout tone="neutral" title="What we can publish">
        <p>
          Only what the person has said publicly themselves — an interview, their own social
          media, a book, a podcast or an official statement — or what their family or estate
          shared after their death. No rumour, no unsourced claim, and nothing at all about a
          child&rsquo;s health.
        </p>
      </Callout>

      <fieldset className="space-y-3" disabled={!editable}>
        <legend className="text-small font-medium text-ink">Whose story is this?</legend>
        <label className="flex items-start gap-3 text-body text-ink-soft">
          <input
            type="radio"
            name="type"
            value="public_figure"
            checked={type === "public_figure"}
            onChange={() => setType("public_figure")}
            className="mt-1.5 size-5"
          />
          <span>A public figure</span>
        </label>
        <label className="flex items-start gap-3 text-body text-ink-soft">
          <input
            type="radio"
            name="type"
            value="community"
            checked={type === "community"}
            onChange={() => setType("community")}
            className="mt-1.5 size-5"
          />
          <span>Someone from the community, with their written permission</span>
        </label>
      </fieldset>

      {type === "public_figure" ? (
        <Field label="Which public figure?" required error={state.errors.publicFigureId}>
          {(props) => (
            <select
              {...props}
              name="publicFigureId"
              defaultValue={values.publicFigureId ?? ""}
              disabled={!editable}
              className="h-13 w-full rounded-field border border-line bg-white px-4 text-body text-ink"
            >
              <option value="">Choose a person</option>
              {figures.map((figure) => (
                <option key={figure.id} value={figure.id}>
                  {figure.name}
                  {figure.isDeceased ? " (deceased)" : ""}
                </option>
              ))}
            </select>
          )}
        </Field>
      ) : (
        <div className="rounded-card border border-line bg-cream-50 p-5">
          <label className="flex items-start gap-3 text-body text-ink-soft">
            <input
              type="checkbox"
              name="communityPermissionConfirmed"
              defaultChecked={values.communityPermissionConfirmed ?? false}
              disabled={!editable}
              className="mt-1.5 size-5"
            />
            <span>
              I have written permission from this person to publish their story. Without it, it
              cannot be published — the database will refuse it.
            </span>
          </label>
          {state.errors.communityPermissionConfirmed ? (
            <p className="mt-2 text-small text-danger" role="alert">
              {state.errors.communityPermissionConfirmed}
            </p>
          ) : null}
        </div>
      )}

      <fieldset className="space-y-3" disabled={!editable}>
        <legend className="text-small font-medium text-ink">What did they talk about?</legend>
        <label className="flex items-start gap-3 text-body text-ink-soft">
          <input
            type="radio"
            name="disclosureType"
            value="own"
            defaultChecked={values.disclosureType === "own"}
            className="mt-1.5 size-5"
          />
          <span>Their own health</span>
        </label>
        <label className="flex items-start gap-3 text-body text-ink-soft">
          <input
            type="radio"
            name="disclosureType"
            value="loved_one"
            defaultChecked={values.disclosureType === "loved_one"}
            className="mt-1.5 size-5"
          />
          <span>The health of someone they love</span>
        </label>
      </fieldset>

      <Field label="Title" required error={state.errors.title}>
        {(props) => (
          <Input {...props} name="title" defaultValue={values.title} required disabled={!editable} />
        )}
      </Field>

      <Field
        label="Web address"
        required
        hint="Lower-case words joined by hyphens. Changing it on a published story breaks old links."
        error={state.errors.slug}
      >
        {(props) => (
          <Input {...props} name="slug" defaultValue={values.slug} required disabled={!editable} />
        )}
      </Field>

      <fieldset disabled={!editable}>
        <legend className="text-small font-medium text-ink">
          Conditions this story is about <span className="text-clay-700">*</span>
        </legend>
        <div className="mt-3 space-y-3">
          {conditions.map((condition) => (
            <label
              key={condition.id}
              className="flex items-start gap-3 text-body text-ink-soft"
            >
              <input
                type="checkbox"
                name="conditionIds"
                value={condition.id}
                defaultChecked={values.conditionIds.includes(condition.id)}
                className="mt-1.5 size-5"
              />
              <span>
                {condition.name}
                {condition.isSensitiveTopic ? (
                  <span className="block text-legal text-clay-700">
                    Sensitive topic — the story will carry a content note and support contacts,
                    and must not include any method detail.
                  </span>
                ) : null}
              </span>
            </label>
          ))}
        </div>
        {state.errors.conditionIds ? (
          <p className="mt-2 text-small text-danger" role="alert">
            {state.errors.conditionIds}
          </p>
        ) : null}
      </fieldset>

      <Field
        label="Summary"
        required
        hint="In our own words, never copied from the source. Leave a blank line between paragraphs."
        error={state.errors.summary}
      >
        {(props) => (
          <Textarea
            {...props}
            name="summary"
            defaultValue={values.summary}
            required
            disabled={!editable}
            className="min-h-48"
          />
        )}
      </Field>

      <Field
        label="Key moments"
        hint="One a line: label | when | what happened. For example — Diagnosis | March 2019 | Found at a routine appointment."
        error={state.errors.keyMoments}
      >
        {(props) => (
          <Textarea
            {...props}
            name="keyMoments"
            defaultValue={formatKeyMomentsInput(values.keyMoments)}
            disabled={!editable}
            className="min-h-40 font-mono text-small"
          />
        )}
      </Field>

      <Field
        label="Content note"
        hint="Shown above the story. Leave it empty and a sensitive-topic story still gets a standard note."
        error={state.errors.contentNote}
      >
        {(props) => (
          <Textarea
            {...props}
            name="contentNote"
            defaultValue={values.contentNote ?? ""}
            disabled={!editable}
            className="min-h-24"
          />
        )}
      </Field>

      {mode === "edit" ? (
        <div className="space-y-6 rounded-card border border-line bg-cream-50 p-5">
          <div>
            <h3 className="text-title">Quote</h3>
            <p className="mt-1 text-small text-muted">
              Optional, at most {MAX_QUOTE_WORDS} words, and it has to name the source it came
              from. Anything longer belongs in the summary, in our own words.
            </p>
          </div>

          <Field label="The quote" error={state.errors.quote}>
            {(props) => (
              <Textarea
                {...props}
                name="quote"
                value={quote}
                onChange={(event) => setQuote(event.target.value)}
                disabled={!editable}
                className="min-h-24"
              />
            )}
          </Field>
          <p
            className={
              quoteWords > MAX_QUOTE_WORDS ? "text-small text-danger" : "text-small text-muted"
            }
          >
            {quoteWords} of {MAX_QUOTE_WORDS} words
            {quoteWords > MAX_QUOTE_WORDS ? " — too long to publish" : ""}
          </p>

          <Field label="Which source is it from?" error={state.errors.quoteSourceId}>
            {(props) => (
              <select
                {...props}
                name="quoteSourceId"
                defaultValue={values.quoteSourceId ?? ""}
                disabled={!editable || sources.length === 0}
                className="h-13 w-full rounded-field border border-line bg-white px-4 text-body text-ink"
              >
                <option value="">No quote</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.publisher} — {source.title}
                  </option>
                ))}
              </select>
            )}
          </Field>
          {sources.length === 0 ? (
            <p className="text-small text-muted">
              Add a source below before adding a quote.
            </p>
          ) : null}
        </div>
      ) : null}

      {editable ? (
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : mode === "create" ? "Start this draft" : "Save changes"}
          </Button>
          <FormMessages state={state} />
        </div>
      ) : (
        <Callout tone="warm" title="This story is live">
          <p>
            Published stories are not edited here. If something is wrong, retract it, make the
            change, and take it back through review — or handle it as a correction from the
            requests queue.
          </p>
        </Callout>
      )}
    </form>
  );
}
