"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, Input, Textarea } from "@/components/ui/field";

import { submitCorrectionRequest } from "./actions";
import { EMPTY_CORRECTION_STATE, type CorrectionFormState } from "./form-state";

/**
 * The public form. Every control goes through `Field`, so the label, the hint and any error
 * are wired to the input by id. The action is a server action passed straight to the form,
 * so it still submits if JavaScript has not arrived.
 */
export function CorrectionForm({
  stories,
}: {
  stories: { id: string; title: string; figureName: string | null }[];
}) {
  const [state, action, pending] = useActionState<CorrectionFormState, FormData>(
    submitCorrectionRequest,
    EMPTY_CORRECTION_STATE,
  );

  if (state.status === "sent") {
    return (
      <Callout tone="care" title="We have your request" className="mt-10">
        <p>
          An editor will look at it. If we have your email right, we will write back to you when
          it has been dealt with, whether we change the story or not.
        </p>
        <p className="mt-2">
          If this is urgent — if a story is causing harm right now — say so in an email to us as
          well, and we will move it up the queue.
        </p>
      </Callout>
    );
  }

  return (
    <form action={action} className="mt-10 space-y-8">
      {state.errors.form ? (
        <Callout tone="warm" title="We could not send that">
          <p>{state.errors.form}</p>
        </Callout>
      ) : null}

      <Field
        label="Which story is this about?"
        required
        error={state.errors.storyId}
        hint="If the story is not listed, it may already have been taken down."
      >
        {(props) => (
          <select
            {...props}
            name="storyId"
            required
            className="h-13 w-full rounded-field border border-line bg-white px-4 text-body text-ink"
            defaultValue=""
          >
            <option value="" disabled>
              Choose a story
            </option>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.figureName ? `${story.figureName} — ${story.title}` : story.title}
              </option>
            ))}
          </select>
        )}
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-small font-medium text-ink">
          What are you asking for? <span className="text-clay-700">*</span>
        </legend>
        <label className="flex items-start gap-3 text-body text-ink-soft">
          <input
            type="radio"
            name="type"
            value="correction"
            defaultChecked
            className="mt-1.5 size-5"
          />
          <span>
            <span className="font-medium text-ink">A correction.</span> Something in the story is
            wrong.
          </span>
        </label>
        <label className="flex items-start gap-3 text-body text-ink-soft">
          <input type="radio" name="type" value="removal" className="mt-1.5 size-5" />
          <span>
            <span className="font-medium text-ink">Removal.</span> Take the story down.
          </span>
        </label>
        {state.errors.type ? (
          <p className="text-small text-danger" role="alert">
            {state.errors.type}
          </p>
        ) : null}
      </fieldset>

      <Field label="Your name" required error={state.errors.requesterName}>
        {(props) => <Input {...props} name="requesterName" autoComplete="name" required />}
      </Field>

      <Field
        label="Your email address"
        required
        hint="We use this to reply to you about this request, and for nothing else."
        error={state.errors.requesterEmail}
      >
        {(props) => (
          <Input {...props} name="requesterEmail" type="email" autoComplete="email" required />
        )}
      </Field>

      <Field
        label="How are you connected to this story?"
        required
        hint="For example: I am the person in the story, I represent them, or I am a reader."
        error={state.errors.relationship}
      >
        {(props) => <Input {...props} name="relationship" required />}
      </Field>

      <Field
        label="What is wrong, or what would you like removed?"
        required
        hint="Be as specific as you can. If you can link to a source that shows what is correct, that helps."
        error={state.errors.reason}
      >
        {(props) => <Textarea {...props} name="reason" required />}
      </Field>

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send this request"}
        </Button>
        <p className="mt-3 text-legal text-muted">
          We keep your name, email and what you tell us so that we can deal with the request and
          show what we did. See our{" "}
          <a href="/privacy" className="text-forest-600 underline underline-offset-4">
            privacy notice
          </a>
          .
        </p>
      </div>
    </form>
  );
}
