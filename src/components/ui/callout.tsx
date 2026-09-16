import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * A note set apart from the page. Used for content warnings, safety
 * signposting and the "this is not medical advice" reminders.
 *
 * Tone is deliberately quiet. Nothing on this platform should alarm someone who
 * is already frightened, so there are no sirens here — the emphasis comes from
 * the surface changing, not from the colour shouting.
 */
export function Callout({
  tone = "neutral",
  title,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  tone?: "neutral" | "care" | "warm";
  title?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-card border p-5",
        tone === "neutral" && "border-line bg-cream-50",
        tone === "care" && "border-forest-200 bg-forest-50",
        tone === "warm" && "border-clay-200 bg-clay-100",
        className,
      )}
      {...props}
    >
      {title ? <p className="mb-1 font-semibold text-ink">{title}</p> : null}
      <div className="text-small text-ink-soft [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  );
}
