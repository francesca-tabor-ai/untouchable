"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { AnswerValue } from "@/lib/questionnaires/answers";
import type { Item } from "@/lib/questionnaires/definition";
import {
  EMPTY_QUESTIONNAIRE_STATE,
  INTENT_DRAFT,
  INTENT_FINISH,
  SUBMIT_INTENT,
  type QuestionnaireFormState,
} from "@/lib/questionnaires/form-state";

import { Question } from "./question";
import { questionId } from "./question-shell";

/**
 * The renderer. Give it a version's items and it produces the form.
 *
 * It works before the JavaScript arrives. Every control is a native input with a real name,
 * the form posts to a server action, and the two buttons are ordinary submit buttons that
 * say which one was pressed. Somebody on a bad connection in a hospital corridor gets a
 * working questionnaire, not a spinner.
 *
 * **Save and resume.** "Save and come back later" keeps what has been filled in so far
 * without asking for the rest — a long form answered in a waiting room must not lose
 * everything when the person is called in. With JavaScript, the same thing happens quietly
 * whenever an answer changes, so it does not depend on remembering to press anything.
 */
export function QuestionnaireForm({
  items,
  values,
  action,
  submitLabel = "Save my answers",
  draftLabel = "Save and come back later",
  cancelHref,
  autosave,
  hidden,
}: {
  items: Item[];
  values: Record<string, AnswerValue>;
  action: (state: QuestionnaireFormState, formData: FormData) => Promise<QuestionnaireFormState>;
  submitLabel?: string;
  draftLabel?: string;
  cancelHref?: string;
  /**
   * Server action that keeps a draft. Optional: without it the form still works, and the
   * button below is still the way to save one.
   */
  autosave?: (formData: FormData) => Promise<void>;
  /** Extra values the action needs, such as which check-in is being answered. */
  hidden?: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(action, EMPTY_QUESTIONNAIRE_STATE);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const problems = state.problems ?? {};
  const listed = items.filter((item) => problems[item.key]);

  return (
    <form
      action={formAction}
      className="space-y-5"
      noValidate
      onChange={
        autosave
          ? (event) => {
              // Quietly keep a draft as answers change. Progressive enhancement only — the
              // button below does the same thing, and does it without any of this.
              const body = new FormData(event.currentTarget);
              body.set(SUBMIT_INTENT, INTENT_DRAFT);
              if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
              autosaveTimer.current = setTimeout(() => {
                void autosave(body).catch(() => {
                  // A draft that could not be kept is not worth interrupting anybody over.
                });
              }, 500);
            }
          : undefined
      }
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      {listed.length > 0 || problems.form ? (
        <div
          role="alert"
          tabIndex={-1}
          className="rounded-card border border-danger/40 bg-clay-100 px-5 py-4 text-small text-ink"
        >
          {problems.form ? <p>{problems.form}</p> : null}
          {listed.length > 0 ? (
            <>
              <p className="font-semibold">
                {listed.length === 1
                  ? "There is one question still to answer."
                  : `There are ${listed.length} questions still to answer.`}
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {listed.map((item) => (
                  <li key={item.key}>
                    <Link href={`#${questionId(item.key)}`} className="underline underline-offset-2">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}

      {state.status === "draft_saved" && state.message ? (
        <p role="status" className="rounded-card border border-line bg-cream-50 px-5 py-4 text-small text-ink-soft">
          {state.message}
        </p>
      ) : null}

      {items.map((item) => (
        <Question key={item.key} item={item} value={values[item.key]} error={problems[item.key]} />
      ))}

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button type="submit" name={SUBMIT_INTENT} value={INTENT_FINISH} size="lg" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        <Button
          type="submit"
          name={SUBMIT_INTENT}
          value={INTENT_DRAFT}
          variant="secondary"
          size="lg"
          disabled={pending}
        >
          {draftLabel}
        </Button>
        {cancelHref ? (
          <Button asChild variant="ghost" size="lg">
            <Link href={cancelHref}>Not now</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
