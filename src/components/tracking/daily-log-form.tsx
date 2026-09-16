"use client";

import { useActionState } from "react";

import { ScoreSlider } from "@/components/tracking/score-slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckboxRow } from "@/components/ui/checkbox";
import { FormError } from "@/components/onboarding/form-error";
import { EMPTY_FORM_STATE, type FormState } from "@/lib/onboarding/form-state";
import type { ContextTag } from "@/lib/tracking/context-tags";
import type { DailyLogSymptom } from "@/lib/tracking/daily-log";
import { NOTE_MAX_LENGTH, SCALE_MAX, SCALE_MIN } from "@/lib/tracking/daily-log";

/**
 * The daily quick log — brief 7.5. Under thirty seconds, one-handed, in bed, exhausted.
 *
 * Every decision here is spending or saving somebody's seconds:
 *
 * - **One screen.** No steps, no pagination, no modal, no confirmation. There is exactly one
 *   submit control on the page and it is the only thing anybody has to press.
 * - **Every slider already has a value.** A day where nothing has changed is one tap. Where
 *   the starting positions came from is stated above them, in words, so nobody files a
 *   number without knowing it was already there.
 * - **Tags are tick boxes, not typing.** One tap each, and all of them optional.
 * - **The note is folded away** behind a normal `<details>`. Most days it costs nothing;
 *   the day somebody wants it, it is one tap and it is native, so it works without script.
 * - **The save button sticks to the bottom of the screen on a phone**, so finishing never
 *   means scrolling to find it.
 *
 * Nothing on this form says anything about what the numbers mean.
 */
export function DailyLogForm({
  action,
  symptoms,
  tags,
  chosenTags,
  note,
  alreadyLogged,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  symptoms: DailyLogSymptom[];
  tags: readonly ContextTag[];
  chosenTags: string[];
  note: string | null;
  alreadyLogged: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_FORM_STATE);
  const chosen = new Set(chosenTags);
  const label = alreadyLogged ? "Save my changes" : "Save today's log";

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormError message={state.error ?? state.fieldErrors?.form} />

      <Card className="p-5 sm:p-6">
        <fieldset>
          <legend className="text-title">How today has been</legend>

          <div className="mt-3 divide-y divide-line">
            {symptoms.map((symptom) => (
              <ScoreSlider
                key={symptom.userSymptomId}
                name={`score-${symptom.userSymptomId}`}
                label={symptom.name}
                defaultValue={symptom.score}
                min={SCALE_MIN}
                max={SCALE_MAX}
                lowLabel="0 — not at all"
                highLabel="10 — as bad as it has been"
              />
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="p-5 sm:p-6">
        <fieldset>
          <legend className="text-title">Anything unusual today?</legend>
          <p className="mt-2 text-small text-muted">
            Optional. Tap any that apply, so that what you record today has its context next to
            it.
          </p>

          <div className="mt-3 grid gap-1 sm:grid-cols-2">
            {tags.map((tag) => (
              <CheckboxRow
                key={tag.value}
                name="tag"
                value={tag.value}
                label={tag.label}
                defaultChecked={chosen.has(tag.value)}
                className="py-1"
              />
            ))}
          </div>
        </fieldset>
      </Card>

      <details className="rounded-card border border-line bg-white" open={Boolean(note)}>
        <summary className="cursor-pointer rounded-card px-5 py-4 text-body font-medium text-ink">
          Add a note {note ? "" : "(optional)"}
        </summary>
        <div className="border-t border-line px-5 py-4">
          <label htmlFor="daily-log-note" className="block text-small font-medium text-ink">
            Anything you want to remember about today
          </label>
          <p id="daily-log-note-hint" className="mt-1 text-small text-muted">
            Only you will ever see this. It is never included in any research and never shown to
            anybody else.
          </p>
          <textarea
            id="daily-log-note"
            name="note"
            rows={4}
            maxLength={NOTE_MAX_LENGTH}
            defaultValue={note ?? ""}
            aria-describedby="daily-log-note-hint"
            className="mt-3 min-h-28 w-full rounded-field border border-line bg-white px-4 py-3 text-body text-ink placeholder:text-muted/70"
          />
        </div>
      </details>

      {/* The one control anybody has to press. Sticky so it is always within reach of a
          thumb, whatever else is on screen. */}
      <div className="sticky bottom-0 -mx-5 border-t border-line bg-cream-100/95 px-5 py-4 backdrop-blur sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? "Saving…" : label}
        </Button>
      </div>
    </form>
  );
}
