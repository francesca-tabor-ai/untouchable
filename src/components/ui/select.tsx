import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * A plain `<select>`, styled to match the `Input` primitive.
 *
 * Native rather than a custom listbox on purpose: on a phone it opens the operating
 * system's own picker, which is already familiar, already accessible, and already works
 * with whatever assistive technology the person uses.
 */
export const SelectInput = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-13 w-full rounded-field border border-line bg-white px-4 text-body text-ink aria-[invalid=true]:border-danger",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
SelectInput.displayName = "SelectInput";
