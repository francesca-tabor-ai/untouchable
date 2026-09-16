import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Our type scale is named, not numbered: `text-hero`, `text-body`, `text-small` and so on,
 * defined in `src/styles/tokens.css`.
 *
 * tailwind-merge does not know that. Out of the box it recognises `text-sm` and `text-base`
 * as font sizes and everything else after `text-` as a colour — so it read `text-small` as a
 * colour, decided it conflicted with `text-white`, and dropped the one that came first.
 *
 * The visible result was white button text turning into body ink on a dark green fill:
 * 1.33:1, against the 4.5:1 the design system requires. It affected every primary button in
 * the product, at every size, because the size variant always came after the colour variant.
 *
 * Naming the scale here fixes it for every component at once. Add to this list whenever a
 * size token is added to `tokens.css` — the two have to agree. See DECISIONS.md D-026.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["hero", "display", "title", "lead", "body", "small", "legal"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
