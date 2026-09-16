import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * Page gutter and max width. `reading` narrows to a comfortable measure for
 * anything that is mostly prose — story bodies, policy pages, consent text.
 */
export function Container({
  className,
  reading = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { reading?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-8",
        reading ? "max-w-[var(--reading-width)]" : "max-w-[var(--content-width)]",
        className,
      )}
      {...props}
    />
  );
}
