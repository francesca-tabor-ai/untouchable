# Design system

**Matched to Do Health.** The palette, type scale and shapes are taken from dohealth.co, measured
from the live site rather than eyeballed: deep green `#19301E` on a warm cream `#F4F1E7`, one bright
lime `#B9F00A` used only ever as a fill, large radii, and a light display face over a neutral
grotesque.

The intent underneath it is unchanged: UnTouchable is not a clinic and should never feel like one.

Tokens live in [`src/styles/tokens.css`](../src/styles/tokens.css) and are the single source of truth.
Primitives live in `src/components/ui/`. Both are owned by the platform lead — see
[AGENTS.md](../AGENTS.md) section 3.

## The decision behind the look

The system is Do Health's, with two forced departures.

**The typefaces are substitutes.** Do Health sets **Season Mix** over **NB International Pro**. Both
are commercial licences we do not hold, so we use the closest free equivalents: **Outfit** for the
light display face and **Inter** for the neutral grotesque. Buying the real licences changes two
lines in `tokens.css` and nothing else.

**Their muted text colour fails WCAG AA.** `#67796B` lands at about 3.8:1 on their cream ground,
below the 4.5:1 body text needs. Ours is darkened to `#566658` (5.6:1). Everything else about the
colour is theirs.

An earlier version of this system used a Fraunces serif and a clay accent; see `DECISIONS.md` D-002
and PL-11 for why it changed.

## Colour

| Role | Token | Value | Notes |
|---|---|---|---|
| Page surface | `cream-100` | `#F4F1E7` | Their page ground. |
| Raised surface | `white` / `cream-50` | `#FFFFFF` / `#F7F5EF` | Cards, inputs, panels. |
| Body text | `ink` / `ink-soft` | `#19301E` / `#2B4230` | 13.7:1 and 10.6:1 on cream. |
| Secondary text | `muted` | `#566658` | 5.6:1 — the floor. Never go lighter for text. |
| Primary action | `clay-500` | `#B9F00A` | The lime. **Fill only**, with `forest-900` on it (11:1). |
| Sombre action | `forest-800` | `#19301E` | The `dark` button variant, for safety and destructive screens where lime is too loud. |
| Link / text green | `forest-600` | `#35513A` | 8.4:1 on cream. |
| Accent text | `clay-700` | `#46620A` | 7:1 on cream — the text-safe end of the lime. |

**The lime is never text.** At roughly 1.3:1 on any of our grounds it cannot carry a word legibly.
It is a button, a chip, a fill. `clay-700` is what you reach for when the accent has to be read.

**Meaning colours are deliberately muted.** `danger` is a deep clay, not a siren red. Nothing here
should shout at a frightened person. Colour never carries meaning alone: every state also has text,
an icon, or a shape.

**Charts** use the five `series-*` tokens, which separate by lightness as well as hue so they survive
colour blindness and greyscale printing (people do print these to take to a GP).

## Type

- **Display — Outfit**, standing in for Season Mix. Weight **300 at hero size, 400 elsewhere**: at
  72px a light weight reads as confident, at 24px it reads as faint, so the two are separated rather
  than averaged.
- **Body — Inter**, standing in for NB International Pro. Neutral, excellent at small sizes.

Their scale is 72 / 44 / 32 / 24 / 16, with -0.5px tracking on the large sizes.

| Token | Size | Use |
|---|---|---|
| `text-hero` | 48px, 72px on the home page | Page hero, one per page |
| `text-display` | 44px | Section openers — their H2 |
| `text-title` | 24px | Card titles and pull quotes |
| `text-lead` | 18px | Standfirst, intro paragraph |
| `text-body` | 16px | Everything else |
| `text-small` | 14px | Labels, secondary |
| `text-legal` | 13px | Disclaimers, source citations |

Hero is 48px by default and raised to 72px only on the home page: 72px is a landing-page hero, not a
size every page title should inherit.

## Shape and space

Their radii run large: **24px cards, 40px panels, everything else a pill.** Base spacing unit 8px;
section rhythm 48–96px. Emphasis comes from **space, not shadow** — shadows are nearly invisible and
used only to lift an interactive card on hover.

Minimum touch target 44px; their own button is 56px, which is our `lg`.

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
