# Design system

**Warm, open, community-led.** UnTouchable is not a clinic and should never feel like one. The people
using it have often just had the worst news of their lives; the interface they meet should feel like a
kitchen table, not a waiting room.

Tokens live in [`src/styles/tokens.css`](../src/styles/tokens.css) and are the single source of truth.
Primitives live in `src/components/ui/`. Both are owned by the platform lead — see
[AGENTS.md](../AGENTS.md) section 3.

## The decision behind the look

The original brief carried two type systems: a heritage-wellness serif pairing, and Bebas Neue with
Rubik. We kept the warmth of the first and the friendliness of Rubik, and dropped Bebas Neue.
Condensed all-caps display type reads as institutional and authoritative — and it loses legibility
badly at the sizes people actually read on a phone. Principle 9 asks for "accessible and calm", so
authority was the wrong note. See `DECISIONS.md` D-002.

## Colour

| Role | Token | Notes |
|---|---|---|
| Page surface | `cream-100` | Warm off-white. The default background everywhere. |
| Raised surface | `white` | Cards, inputs, panels. |
| Body text | `ink` / `ink-soft` | 14.1:1 and 9.0:1 on cream. |
| Secondary text | `muted` | 5.6:1 — the floor. Never go lighter for text. |
| Primary action | `forest-800` | White text on it: 10.4:1. |
| Link / text green | `forest-600` | 6.6:1 on cream. |
| Accent | `clay-500` | **Fill only** — 2.6:1, never used for text. |
| Accent text | `clay-700` | 5.3:1 on cream. |

**Meaning colours are deliberately muted.** `danger` is a deep clay, not a siren red. Nothing here
should shout at a frightened person. Colour never carries meaning alone: every state also has text,
an icon, or a shape.

**Charts** use the five `series-*` tokens, which separate by lightness as well as hue so they survive
colour blindness and greyscale printing (people do print these to take to a GP).

## Type

- **Display — Fraunces.** A soft, slightly wonky serif. Warm rather than grand. Headings only.
- **Body — Rubik.** Open apertures, friendly, excellent at small sizes.

Body text is 17px, not 16px. People read this tired, frightened, on a phone, in a hospital corridor.

| Token | Size | Use |
|---|---|---|
| `text-hero` | 44px | Page hero, one per page |
| `text-display` | 32px | Section openers |
| `text-title` | 24px | Card and block titles |
| `text-lead` | 19px | Standfirst, intro paragraph |
| `text-body` | 17px | Everything else |
| `text-small` | 15px | Labels, secondary |
| `text-legal` | 13px | Disclaimers, source citations |

## Shape and space

Pill buttons and inputs, `1.25rem` cards, generous padding. Base spacing unit 8px; section rhythm
48–96px. Emphasis comes from **space, not shadow** — shadows are nearly invisible and used only to
lift an interactive card on hover.

Minimum touch target 44px; the default button is 52px.

## Accessibility — part of "done", not a later pass

- WCAG 2.2 AA. 4.5:1 body text, 3:1 large text and UI boundaries.
- Visible focus everywhere, one treatment, defined once in `globals.css`.
- Skip link is the first thing in the tab order on every page.
- Every input goes through `<Field>`, which wires label, hint and error to the control by id.
- Heading order never skips a level.
- `prefers-reduced-motion` respected globally.
- Mobile-first from 375px.

## Writing

British English. Short sentences. Plain words.

- **Never make a health claim.** "Your pain score over the last three months", never "your pain is
  improving". The platform shows data; it does not interpret it.
- **Never use urgency or guilt**, above all near donation prompts. No countdowns, no "don't let them
  down".
- **Say the hard thing plainly.** "This will delete everything you have recorded. We cannot get it
  back." Not "Are you sure you wish to proceed?"
- Address the person as "you". Talk about ourselves as "we", sparingly.

## Primitives available

`Button` · `Container` · `Card` · `Field` (with `Input`, `Textarea`) · `CheckboxRow` · `Select` ·
`Callout` · `Badge` · `VisuallyHidden` · `SiteHeader` · `SafetyFooter`

Form controls are **native elements**, not custom widgets built out of divs. A real
`<input type="checkbox">` and a real `<select>` are keyboard reachable, announced correctly by
screen readers, open the phone's own picker, and — the part that matters most here — they work
before the JavaScript arrives. Consent is the most important screen in this product and it must
not depend on a script loading.

Need another? Ask the platform lead rather than building a one-off inside a feature — two slightly
different buttons is how a design system dies.
