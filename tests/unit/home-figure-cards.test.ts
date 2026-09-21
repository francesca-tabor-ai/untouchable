// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The front page cards put white text over a photograph, which is the layout that quietly
 * fails contrast more often than any other. A dark gradient is not a guarantee — a light
 * photograph defeats one, and nobody notices until somebody reads the page in sunlight.
 *
 * So the card does not put text on the gradient. It puts text on a flat scrim of a known
 * colour at a known opacity, with a fade above it so the two read as one gradient. That
 * makes the contrast arithmetic rather than hope, and this file does the arithmetic against
 * the worst photograph physically possible: one where every pixel under the scrim is solid
 * white.
 *
 * The numbers are read from the real files, so changing the token in `tokens.css` or the
 * opacity in the card re-runs the sum instead of silently invalidating it.
 */

const card = readFileSync("src/components/home/figure-strip.tsx", "utf8");
const tokens = readFileSync("src/styles/tokens.css", "utf8");

type Rgb = [number, number, number];

function token(name: string): Rgb {
  const match = new RegExp(`--color-${name}:\\s*#([0-9a-fA-F]{6})`).exec(tokens);
  if (!match) throw new Error(`No --color-${name} in tokens.css`);
  const hex = match[1]!;
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

/** sRGB relative luminance, WCAG 2.2 definition. */
function luminance([r, g, b]: Rgb): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

/** What the browser actually paints when `overlay` at `alpha` sits on `beneath`. */
function composite(overlay: Rgb, alpha: number, beneath: Rgb): Rgb {
  return overlay.map((channel, i) => alpha * channel + (1 - alpha) * beneath[i]!) as Rgb;
}

/** The lightest thing a photograph can be, and therefore the hardest case. */
const WORST_PHOTOGRAPH: Rgb = [255, 255, 255];
const WHITE: Rgb = [255, 255, 255];

/** The scrim opacity, read out of the card itself. */
function scrimAlpha(): number {
  const match = /bg-forest-900\/(\d{1,3})\b/.exec(card);
  if (!match) throw new Error("The card no longer uses a forest-900 scrim for its text bed.");
  return Number(match[1]) / 100;
}

describe("white text on a photograph card", () => {
  const bed = () => composite(token("forest-900"), scrimAlpha(), WORST_PHOTOGRAPH);

  it("clears 4.5:1 over the lightest photograph there can be", () => {
    expect(contrast(WHITE, bed())).toBeGreaterThanOrEqual(4.5);
  });

  it("clears it with room to spare, so a token change cannot creep under the line", () => {
    expect(contrast(WHITE, bed())).toBeGreaterThan(10);
  });

  it("holds for the secondary text and the content note as well", () => {
    // Everything on the card is either white or one of these two light tints.
    for (const name of ["cream-200", "clay-200"]) {
      expect(contrast(token(name), bed())).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("holds for the tag pills, which add a translucent white layer of their own", () => {
    const pill = composite(WHITE, 0.15, bed());
    expect(contrast(WHITE, pill)).toBeGreaterThanOrEqual(4.5);
  });

  it("holds for the monogram itself, which sits on the bare card", () => {
    // Large text needs 3:1; this clears the stricter 4.5:1 on all three backgrounds, which
    // is the margin that stops the next tint change quietly breaking it.
    for (const name of ["forest-700", "forest-800", "forest-900"]) {
      expect(contrast(token("cream-200"), token(name))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("holds for a monogram card, which has no photograph under it at all", () => {
    for (const name of ["forest-700", "forest-800", "forest-900"]) {
      const beneath = token(name);
      expect(contrast(WHITE, composite(token("forest-900"), scrimAlpha(), beneath))).toBeGreaterThan(
        4.5,
      );
    }
  });
});

describe("the card itself", () => {
  it("puts the text on a flat scrim, not on the gradient", () => {
    // The fade is decoration. If the text ever moves onto it, the guarantee above stops
    // describing the thing that ships.
    expect(card).toContain("bg-forest-900/95");
    expect(card).toContain("bg-gradient-to-t");
  });

  it("keeps every word in the text bed at full strength", () => {
    // Faded text is how a contrast failure usually gets "fixed".
    const bed = card.slice(card.indexOf("${SCRIM}"), card.indexOf("function PhotoCredits"));
    expect(bed).not.toMatch(/text-white\/\d+/);
    expect(bed).not.toContain("text-muted");
    expect(bed).not.toContain("text-ink");
    expect(bed).not.toContain("opacity-");
  });

  it("sets the monogram in a solid colour, not a faint watermark", () => {
    // Faint decoration made of letters is still text, and `aria-hidden` hides it from a
    // screen reader without helping anybody with low vision. axe caught this at 2.24:1.
    expect(card).not.toMatch(/text-(white|cream-\d+)\/\d+/);
    expect(card).toContain("text-cream-200");
  });

  it("renders a photograph only when a licence is recorded with it", () => {
    expect(card).toMatch(/imageUrl && parseAttribution/);
  });

  it("falls back to a monogram, never to an unlicensed picture", () => {
    expect(card).toContain("MONOGRAM_TINTS");
    expect(card).toContain("initials");
  });

  it("credits the photographers wherever the photographs appear", () => {
    expect(card).toContain("PhotoCredits");
    expect(card).toContain("attribution");
  });

  it("carries no content note", () => {
    // Removed from this card on the product owner's instruction — PL-53. The warning itself
    // is not gone: `ContentNote` still renders above the story on the story page, before any
    // of it can be read, and `tests/unit/stories-surfaces.test.tsx` holds that.
    //
    // Asserted as an absence rather than deleted, so the note cannot drift back onto a card
    // that is meant to be a name and a condition.
    expect(card).not.toContain("needsContentNote");
    expect(card).not.toContain("Content note");
  });

  it("shows the conditions the story is about", () => {
    expect(card).toContain("story.conditions.map");
  });

  it("carries a name and a condition, and no other prose", () => {
    // The card is an introduction, not a summary. A name somebody recognises and what the
    // story is about is the whole of it — the headline, and the line saying whose health it
    // is, belong on the story itself where there is room to read them. PL-48 once made an
    // exception of the content note; PL-53 removed it, so the rule is now unqualified.
    const inner = card.slice(card.indexOf("function FigureCard"), card.indexOf("function PhotoCredits"));
    expect(inner).not.toContain("story.title");
    expect(inner).not.toContain("disclosureType");
    expect(inner).not.toContain("line-clamp");
  });

  it("never queries the database directly", () => {
    expect(card).not.toContain("@/lib/db");
    expect(card).not.toContain("PrismaClient");
    expect(card).not.toMatch(/\bdb\.story\b/);
  });

  it("makes the whole card the link, with nothing interactive nested inside it", () => {
    // Tags are plain text on this card for exactly this reason: a link inside a link is
    // invalid markup and unusable with a keyboard.
    const inner = card.slice(card.indexOf("function FigureCard"), card.indexOf("function PhotoCredits"));
    expect(inner).not.toMatch(/<button/);
    expect(inner.match(/<Link/g) ?? []).toHaveLength(1);
  });
});

/**
 * A donation prompt on the front page would be an ask made of somebody who has told us
 * nothing and asked us for nothing. `donationPromptAllowed` remains the only thing that may
 * decide a prompt anywhere — and the front page simply never reaches it, because nothing it
 * renders is capable of producing one.
 */
describe("no donation prompt on the home page", () => {
  /** Comments explain the rule; code is what could break it. */
  const code = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "");

  const page = code(readFileSync("src/app/(public)/page.tsx", "utf8"));
  const results = code(readFileSync("src/components/search/search-results.tsx", "utf8"));
  const grid = code(card);

  it("renders nothing that could produce one", () => {
    for (const source of [page, results, grid]) {
      expect(source).not.toContain("DonateLink");
      expect(source).not.toContain("donationPrompt");
      expect(source).not.toContain("/donate");
      expect(source).not.toContain("CharityCard");
      expect(source).not.toContain("NoteDonation");
    }
  });

  it("pulls in nothing from the charity feature at all", () => {
    for (const source of [page, results, grid]) {
      expect(source).not.toMatch(/from "@\/components\/charities/);
      expect(source).not.toMatch(/from "@\/lib\/charities\/(?!queries)/);
    }
  });
});
