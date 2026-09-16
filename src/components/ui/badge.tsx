import * as React from "react";

import { cn } from "@/lib/cn";

export function Badge({
  tone = "quiet",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "quiet" | "forest" | "clay" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill px-3 py-1 text-legal font-medium",
        tone === "quiet" && "bg-cream-200 text-ink-soft",
        tone === "forest" && "bg-forest-100 text-forest-800",
        tone === "clay" && "bg-clay-100 text-clay-700",
        className,
      )}
      {...props}
    />
  );
}
