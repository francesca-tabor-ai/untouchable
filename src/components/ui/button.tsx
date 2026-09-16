import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/cn";

const button = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-[--duration-quick] ease-[--ease-out-soft] disabled:pointer-events-none disabled:opacity-55",
  {
    variants: {
      variant: {
        primary: "bg-forest-800 text-white hover:bg-forest-900",
        secondary:
          "bg-white text-forest-800 border border-line hover:bg-cream-50 hover:border-line-strong",
        clay: "bg-clay-500 text-forest-900 hover:bg-clay-600 hover:text-white",
        ghost: "text-forest-700 hover:bg-forest-50",
        link: "text-forest-600 underline underline-offset-4 hover:text-forest-800",
      },
      size: {
        // 44px is the minimum comfortable touch target; the default is larger.
        sm: "h-11 px-5 text-small rounded-pill",
        md: "h-13 px-7 text-body rounded-pill",
        lg: "h-14 px-8 text-lead rounded-pill",
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
