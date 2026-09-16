"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

import {
  addSourceAction,
  createFigureAction,
  removeSourceAction,
  resolveRequestAction,
  retractStoryAction,
} from "./actions";
import { EMPTY_EDITORIAL_STATE, type EditorialFormState } from "./form-state";

type Action = (previous: EditorialFormState, formData: FormData) => Promise<EditorialFormState>;

/**
 * A one-button workflow step: send for review, publish, send back, mark as reviewed.
 *
 * Every one of these can be refused by the domain layer or by the database — a story with
 * no source, a second editor who is really the first one. The refusal is shown here, in
 * words, beside the button that caused it.
 */
export function ActionButton({
  action,
  storyId,
  label,
  pendingLabel,
  variant = "secondary",
  help,
}: {
  action: Action;
  storyId: string;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost";
  help?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, EMPTY_EDITORIAL_STATE);

  return (
    <form action={dispatch}>
      <input type="hidden" name="storyId" value={storyId} />
      <Button type="submit" variant={variant} size="sm" disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {help ? <p className="mt-2 max-w-prose text-legal text-muted">{help}</p> : null}
      <FormMessages state={state} />
    </form>
  );
}

export function FormMessages({ state }: { state: EditorialFormState }) {
  const errors = Object.values(state.errors);
  if (state.status === "error" && errors.length > 0) {
    return (
      <div role="alert" className="mt-3 space-y-1">
        {errors.map((message) => (
          <p key={message} className="max-w-prose text-small text-danger">
            {message}
          </p>
        ))}
      </div>
    );
  }
  if (state.status === "saved" && state.message) {
    return (
      <p role="status" className="mt-3 text-small text-positive">
        {state.message}
      </p>
    );
  }
  return null;
}

/** Taking a story down. It asks for a reason because we have to be able to say why. */
export function RetractForm({ storyId }: { storyId: string }) {
  const [state, dispatch, pending] = useActionState(retractStoryAction, EMPTY_EDITORIAL_STATE);

  return (
    <form action={dispatch} className="space-y-4">
      <input type="hidden" name="storyId" value={storyId} />
      <Field
        label="Why is this being taken down?"
        required
        hint="Internal only. It is never published and never leaves the system."
        error={state.errors.reason}
      >
        {(props) => <Textarea {...props} name="reason" required className="min-h-24" />}
      </Field>
      <p className="max-w-prose text-small text-ink-soft">
        This removes the story from the site straight away — the index, search, the condition
        pages, related stories, the person&rsquo;s own page and the sitemap. Anyone who follows an
        old link gets a page-not-found.
      </p>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Taking it down…" : "Retract this story"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

const SOURCE_TYPES = [
  { value: "interview", label: "Interview" },
  { value: "own_social", label: "Their own social media" },
  { value: "book", label: "Book" },
  { value: "podcast", label: "Podcast" },
  { value: "statement", label: "Official statement" },
  { value: "article", label: "Article they wrote" },
];

export function AddSourceForm({ storyId }: { storyId: string }) {
  const [state, dispatch, pending] = useActionState(addSourceAction, EMPTY_EDITORIAL_STATE);

  return (
    <form action={dispatch} className="space-y-6">
      <input type="hidden" name="storyId" value={storyId} />

      <Field
        label="Link to the source"
        required
        hint="The interview, post, book page, podcast episode or statement the person made themselves."
        error={state.errors.url}
      >
        {(props) => <Input {...props} name="url" type="url" required placeholder="https://" />}
      </Field>

      <Field label="Title of the source" required error={state.errors.title}>
        {(props) => <Input {...props} name="title" required />}
      </Field>

      <Field
        label="Publisher"
        required
        hint="Who published it — the programme, the paper, the publisher, or the platform."
        error={state.errors.publisher}
      >
        {(props) => <Input {...props} name="publisher" required />}
      </Field>

      <Field label="Date it was published" error={state.errors.publishedDate}>
        {(props) => <Input {...props} name="publishedDate" type="date" />}
      </Field>

      <Field label="Kind of source" required error={state.errors.sourceType}>
        {(props) => (
          <select
            {...props}
            name="sourceType"
            required
            defaultValue="interview"
            className="h-13 w-full rounded-field border border-line bg-white px-4 text-body text-ink"
          >
            {SOURCE_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add this source"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

export function RemoveSourceButton({ sourceId }: { sourceId: string }) {
  const [state, dispatch, pending] = useActionState(removeSourceAction, EMPTY_EDITORIAL_STATE);

  return (
    <form action={dispatch}>
      <input type="hidden" name="sourceId" value={sourceId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "Removing…" : "Remove"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

/**
 * Adding a public figure.
 *
 * No image field. An image needs its licence terms recorded before it can be stored at all,
 * and we have no licensing workflow yet, so pages use the person's name rather than a photo
 * we do not have the right to use. See DECISIONS.md D-016.
 */
export function FigureForm() {
  const [state, dispatch, pending] = useActionState(createFigureAction, EMPTY_EDITORIAL_STATE);

  return (
    <form action={dispatch} className="space-y-6">
      <Field label="Name" required error={state.errors.name}>
        {(props) => <Input {...props} name="name" required />}
      </Field>

      <Field
        label="Web address"
        required
        hint="Lower-case words joined by hyphens, for example ada-lomond."
        error={state.errors.slug}
      >
        {(props) => <Input {...props} name="slug" required />}
      </Field>

      <Field
        label="Short bio"
        required
        hint="Neutral, in our own words, and about what they are known for — not about their health."
        error={state.errors.shortBio}
      >
        {(props) => <Textarea {...props} name="shortBio" required className="min-h-32" />}
      </Field>

      <label className="flex items-start gap-3 text-body text-ink-soft">
        <input type="checkbox" name="isDeceased" className="mt-1.5 size-5" />
        <span>
          This person has died. Only publish what their family or estate has shared publicly.
        </span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add this person"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}

/** Closing a correction or removal request: what was decided, and why. */
export function ResolveRequestForm({ requestId }: { requestId: string }) {
  const [state, dispatch, pending] = useActionState(resolveRequestAction, EMPTY_EDITORIAL_STATE);

  return (
    <form action={dispatch} className="mt-5 space-y-4 border-t border-line pt-5">
      <input type="hidden" name="requestId" value={requestId} />

      <Field
        label="What did we decide?"
        required
        hint="Actioned means we changed or removed the story. Declined means we did not, and we told them why."
        error={state.errors.status}
      >
        {(props) => (
          <select
            {...props}
            name="status"
            required
            defaultValue="actioned"
            className="h-13 w-full rounded-field border border-line bg-white px-4 text-body text-ink"
          >
            <option value="actioned">Actioned</option>
            <option value="declined">Declined</option>
          </select>
        )}
      </Field>

      <Field
        label="What was done, and why?"
        required
        hint="Internal only. Never published, never exported."
        error={state.errors.resolutionNote}
      >
        {(props) => <Textarea {...props} name="resolutionNote" required className="min-h-24" />}
      </Field>

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Close this request"}
      </Button>
      <FormMessages state={state} />
    </form>
  );
}
