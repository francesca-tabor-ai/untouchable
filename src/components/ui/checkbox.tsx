"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * One tick box, with its label and an optional explanation, and room underneath for
 * anything the answer reveals.
 *
 * A plain `<input type="checkbox">` with a real `<label>`: keyboard reachable, announced
 * correctly, and working before the JavaScript arrives. Consent is the most important
 * screen in this product and it must not depend on a script loading.
 *
 * `children` renders underneath, for anything the answer reveals.
 */
export function CheckboxRow({
  name,
  value,
  label,
  description,
  defaultChecked,
  checked,
  onCheckedChange,
  error,
  children,
  className,
}: {
  name: string;
  value?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  error?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const id = React.useId();
  const describedBy = [description ? `${id}-description` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("rounded-field", className)}>
      <div className="flex gap-3">
        <input
          id={id}
          name={name}
          value={value}
          type="checkbox"
          defaultChecked={onCheckedChange ? undefined : defaultChecked}
          checked={onCheckedChange ? checked : undefined}
          onChange={onCheckedChange ? (event) => onCheckedChange(event.target.checked) : undefined}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? true : undefined}
          className="mt-[0.3rem] h-5 w-5 shrink-0 accent-[var(--color-forest-800)]"
        />
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block cursor-pointer py-1 text-body text-ink">
            {label}
          </label>
          {description ? (
            <div id={`${id}-description`} className="mt-1 text-small text-muted">
              {description}
            </div>
          ) : null}
          {error ? (
            <p id={`${id}-error`} role="alert" className="mt-2 text-small text-danger">
              {error}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
