import { describe, expect, it } from "vitest";

import { cn } from "@/lib/cn";

/**
 * A regression guard for a bug that shipped white button text as dark ink on a dark green
 * fill — 1.33:1, on every primary button in the product.
 *
 * Our type scale is named (`text-body`, `text-small`) rather than numbered. tailwind-merge
 * classifies anything after `text-` that it does not recognise as a font size as a *colour*,
 * so it treated `text-body` as conflicting with `text-white` and dropped one of them.
 *
 * If someone adds a size token to `src/styles/tokens.css` and forgets to name it in
 * `src/lib/cn.ts`, these tests fail rather than the contrast quietly collapsing.
 */
describe("class merging keeps colour and size apart", () => {
  const SIZE_TOKENS = ["hero", "display", "title", "lead", "body", "small", "legal"];

  it.each(SIZE_TOKENS)("keeps text-white alongside text-%s", (token) => {
    const result = cn("bg-forest-800 text-white", `text-${token}`);

    expect(result).toContain("text-white");
    expect(result).toContain(`text-${token}`);
  });

  it("still lets a later colour override an earlier one", () => {
    expect(cn("text-white", "text-ink")).toBe("text-ink");
  });

  it("still lets a later size override an earlier one", () => {
    expect(cn("text-body", "text-small")).toBe("text-small");
  });

  it("covers every size token defined in the design system", async () => {
    const tokens = await import("node:fs/promises").then((fs) =>
      fs.readFile("src/styles/tokens.css", "utf8"),
    );

    const declared = [...tokens.matchAll(/--text-([a-z]+):/g)].map((m) => m[1]);

    // Every size token in the stylesheet must be named in cn.ts, or merging breaks colour.
    expect(new Set(declared)).toEqual(new Set(SIZE_TOKENS));
  });
});
