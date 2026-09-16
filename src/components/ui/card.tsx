import * as React from "react";

import { cn } from "@/lib/cn";

export function Card({
  className,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-white p-6",
        interactive &&
          "transition-shadow duration-[--duration-calm] ease-[--ease-out-soft] hover:shadow-soft",
        className,
      )}
      {...props}
    />
  );
}

/**
 * `as` exists so a card can sit at the right depth in the page's heading outline. A card
 * inside an `h2` section needs an `h3`; the same card on a page where it is the top-level
 * content needs an `h2`. Heading order is not decoration.
 */
export function CardTitle({
  className,
  children,
  as: Tag = "h3",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: "h2" | "h3" | "h4" }) {
  return (
    <Tag className={cn("text-title", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-2 text-muted", className)} {...props}>
      {children}
    </p>
  );
}
