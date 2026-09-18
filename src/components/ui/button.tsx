import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-[--duration-quick] ease-[--ease-out-soft] disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        // The lime is the one bright colour in the system and it is a fill, never
        // text: forest-900 on it reaches 11:1, while the lime itself on any of our
        // grounds is around 1.3:1.
        primary: "bg-clay-500 text-forest-900 hover:bg-clay-600",
        // The dark green button, for surfaces where lime would be too loud —
        // safety screens, destructive confirmations, anything already sombre.
        dark: "bg-forest-800 text-white hover:bg-forest-900",
        secondary:
          "border border-line bg-white text-forest-800 hover:border-line-strong hover:bg-cream-50",
        ghost: "text-forest-700 hover:bg-forest-50",
        link: "text-forest-600 underline underline-offset-4 hover:text-forest-800",
      },
      size: {
        // 44px is the minimum comfortable touch target; their own button is 56.
        sm: "h-11 rounded-pill px-5 text-small",
        md: "h-13 rounded-pill px-6 text-body",
        lg: "h-14 rounded-pill px-7 text-body",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "primary", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(button({ variant, size, block }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { button as buttonVariants };
