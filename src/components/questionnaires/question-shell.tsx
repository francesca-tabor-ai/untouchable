import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * The frame around one question: its wording, its explanation, and anything that went wrong
 * with the answer.
 *
 * A group of radio buttons or tick boxes is a `<fieldset>` with a `<legend>`, so a screen
 * reader announces the question before each option rather than reading out eleven numbers
 * with no idea what they are for. A question answered by a single control — a date, a box to
 * write in — uses a real `<label>` instead, which is what `QuestionLabel` is for.
 *
 * The hint and the error are both wired to the control by id. Nobody should have to see the
 * screen to know which question a problem belongs to.
 */

export interface QuestionShellProps {
  id: string;
  label: string;
  help?: string;
  required: boolean;
  error?: string;
  children: React.ReactNode;
}

/** The id of a question on the page. Stable, so an error summary can link straight to it. */
export function questionId(key: string): string {
  return `q-${key}`;
}

export function describedBy(id: string, help?: string, error?: string): string | undefined {
  return [help ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function QuestionGroup({ id, label, help, required, error, children }: QuestionShellProps) {
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      className={cn(
        "rounded-card border bg-white p-5 focus:outline-none",
        error ? "border-danger" : "border-line",
      )}
      aria-describedby={describedBy(id, help, error)}
      aria-invalid={error ? true : undefined}
    >
      <legend className="text-body font-medium text-ink">
        {label}
        {required ? null : <span className="text-muted font-normal"> (optional)</span>}
      </legend>
      <QuestionNotes id={id} help={help} error={error} />
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

export function QuestionLabel({ id, label, help, required, error, children }: QuestionShellProps) {
  return (
    <div
      id={`${id}-question`}
      tabIndex={-1}
      className={cn(
        "rounded-card border bg-white p-5 focus:outline-none",
        error ? "border-danger" : "border-line",
      )}
    >
      <label htmlFor={id} className="block text-body font-medium text-ink">
        {label}
        {required ? null : <span className="text-muted font-normal"> (optional)</span>}
      </label>
      <QuestionNotes id={id} help={help} error={error} />
      <div className="mt-4">{children}</div>
    </div>
  );
}

function QuestionNotes({ id, help, error }: { id: string; help?: string; error?: string }) {
  return (
    <>
      {help ? (
        <p id={`${id}-help`} className="mt-2 text-small text-muted">
          {help}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-small text-danger">
          {error}
        </p>
      ) : null}
    </>
  );
}

/** One radio or tick box with its label. 44px tall, so it can be hit with a thumb. */
export function OptionRow({
  type,
  name,
  value,
  label,
  defaultChecked,
}: {
  type: "radio" | "checkbox";
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
}) {
  const id = React.useId();
  return (
    <div className="flex items-center gap-3 py-1">
      <input
        id={id}
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-5 w-5 shrink-0 accent-[var(--color-forest-800)]"
      />
      <label htmlFor={id} className="flex min-h-11 flex-1 cursor-pointer items-center text-body text-ink">
        {label}
      </label>
    </div>
  );
}
