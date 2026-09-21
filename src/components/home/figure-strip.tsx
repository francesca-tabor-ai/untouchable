import Image from "next/image";
import Link from "next/link";

import { parseAttribution } from "@/components/stories/figure-portrait";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { listPublishedStories } from "@/lib/stories/queries";
import type { StoryCard } from "@/lib/stories/queries";

/**
 * The grid of people under the hero. The point it makes is the whole premise of the
 * platform: these are not patients in the abstract, they are people you have heard of.
 *
 * Only published stories appear, because this reads through `listPublishedStories` like
 * every other public surface. Retract a story and the person leaves the front page on the
 * next request — there is no cache and no copy of the row here to go stale.
 *
 * **Photographs where we hold a licence, and nothing at all where we do not.** Every image
 * is Creative Commons, self-hosted, and rendered only when a licence is recorded on the same
 * record. `PublicFigure.imageUrl` cannot be set without `imageLicence` — the database
 * refuses — and the check is repeated here so that an unreadable licence counts as no
 * licence. Somebody with no licensed photograph keeps the monogram. That is the intended
 * outcome, not a gap to fill with whatever an image search returns. See PL-16 and
 * `src/components/stories/figure-portrait.tsx`.
 *
 * **A card carries a name, a condition, and nothing else but a warning.** Not the headline,
 * not the line saying whose health the story is about. Twelve cards each arguing their own
 * case is a wall of text, and the reader scans past all of it; a face and two words is a
 * thing you can take in. The story itself is one tap away and has room for the rest. The
 * content note is the exception and always will be — it is not a summary, it is a warning,
 * and it travels with the card onto every surface.
 *
 * **On the contrast of white text over a photograph.** A gradient is not a guarantee: a
 * light photograph can defeat one, and "usually dark enough" is not a standard. So the text
 * does not sit on the gradient at all. It sits on `SCRIM`, a flat 95%-opaque forest-900
 * bed, with a short fade above it so the two read as one gradient rising from the bottom of
 * the picture. At 95% the worst case a photograph can produce is the one where every pixel
 * under the bed is solid white, and white text on that is still about 14:1 — three times
 * the 4.5:1 floor, whatever the picture turns out to be.
 */

/**
 * The text bed. 95% of forest-900 over the worst photograph possible (solid white) leaves
 * white text at roughly 14:1. This number is a contrast guarantee, so
 * `tests/unit/home-figure-cards.test.ts` and `tests/e2e/home.spec.ts` both check it.
 */
const SCRIM = "bg-forest-900/95";

/**
 * How many people the front page shows before somebody asks for more, and how many more each
 * press of the button adds.
 *
 * Everybody with a published story is reachable from here — the grid is no longer a sample of
 * six. It is still paged, because a phone that has to lay out forty photographs before it can
 * show anything has already lost the person holding it.
 */
const PAGE = 12;

/**
 * The ceiling on one read. Far above anything the platform holds today; it exists so that this
 * component cannot one day ask the database for an unbounded list because nobody thought about
 * it. Raise it deliberately, not by accident.
 */
const MOST_WE_WILL_READ = 300;

/** The smallest grid worth showing. A row of two looks like an oversight rather than a feature. */
const FEWEST_CARDS = 3;

/**
 * How many people the page is showing, read off the URL.
 *
 * The button that asks for more is a link, and the answer is a number in the query string, so
 * the whole thing works with JavaScript switched off and lands in browser history like any
 * other page. Anything that is not a sensible number falls back to the first page — a URL
 * somebody has typed into is not a reason to render an error.
 */
export function parseShown(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < PAGE) return PAGE;
  return Math.min(parsed, MOST_WE_WILL_READ);
}

interface FigureCardData {
  story: StoryCard;
  /** The conditions the story is about. Plain text, never links. */
  tags: string[];
}

export async function FigureStrip({ shown = PAGE }: { shown?: number }) {
  const stories = await listPublishedStories({ take: MOST_WE_WILL_READ });
  const everyone = stories.filter((story) => story.figure !== null);

  if (everyone.length < FEWEST_CARDS) return null;

  const figures = everyone.slice(0, shown);
  const remaining = everyone.length - figures.length;

  const cards: FigureCardData[] = figures.map((story) => ({
    story,
    tags: story.conditions.map((condition) => condition.name).slice(0, 4),
  }));

  return (
    <section
      id="people"
      aria-labelledby="figure-strip-heading"
      className="scroll-mt-6 border-b border-line bg-white py-16"
    >
      <Container>
        <div className="mb-10 max-w-[34rem]">
          <h2 id="figure-strip-heading" className="text-display">
            People you have heard of
          </h2>
          <p className="mt-3 text-ink-soft">
            Every one of them chose to talk about it publicly. Nothing here is second-hand, and
            every story lists where it came from.
          </p>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <li key={card.story.id}>
              <FigureCard card={card} index={index} />
            </li>
          ))}
        </ul>

        {/* The count is read out on arrival, because the button moves you down a page whose
            length has just changed and "View more" on its own does not say what happened. */}
        <p className="mt-8 text-small text-ink-soft" aria-live="polite" data-testid="figure-count">
          Showing {figures.length} of {everyone.length} people.
        </p>

        {remaining > 0 ? (
          <div className="mt-4">
            {/*
              A link, not a button that fetches. The next page of people is a different page,
              so it has its own address: it works with JavaScript switched off, it goes into
              browser history, and the back button does what a reader expects. The fragment
              returns them to the grid rather than to the top of the page.

              The label says how many more are coming. "View more" alone leaves somebody
              deciding whether a tap is worth it with nothing to decide on.
            */}
            <Button asChild variant="secondary" size="lg">
              <Link href={`/?people=${figures.length + PAGE}#people`} data-testid="view-more">
                View more
                <span className="text-muted">
                  {remaining} more {remaining === 1 ? "person" : "people"}
                </span>
              </Link>
            </Button>
          </div>
        ) : null}

        <PhotoCredits stories={figures} />

        <p className="mt-6">
          <Link href="/stories" className="text-forest-600 underline underline-offset-4">
            Read all {stories.length} stories
          </Link>
        </p>
      </Container>
    </section>
  );
}

/** Two initials. "Marla Quintrell" becomes MQ; a single name gives one letter. */
function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = [parts[0], parts.length > 1 ? parts[parts.length - 1] : undefined]
    .filter(Boolean)
    .map((part) => part![0]!.toUpperCase());
  return letters.join("");
}

/**
 * Backgrounds for a card with no photograph.
 *
 * All three are dark greens from the system, so a monogram card carries exactly the same
 * white text as a photograph card and needs no separate contrast argument. Rotated by
 * position so a run of them reads as a group of people rather than a spreadsheet.
 */
const MONOGRAM_TINTS = ["bg-forest-800", "bg-forest-700", "bg-forest-900"];

function FigureCard({ card, index }: { card: FigureCardData; index: number }) {
  const { story, tags } = card;
  const figure = story.figure!;
  // Never a picture we hold no licence for. The image and the credit come from one record,
  // and one without the other counts as neither.
  const photograph =
    figure.imageUrl && parseAttribution(figure.imageLicence) ? figure.imageUrl : null;

  return (
    <Link
      href={`/stories/${story.slug}`}
      data-testid="figure-card"
      data-photograph={photograph ? "yes" : "no"}
      className={`relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-card transition-shadow duration-[--duration-calm] ease-[--ease-out-soft] hover:shadow-lift ${
        photograph ? "bg-forest-900" : MONOGRAM_TINTS[index % MONOGRAM_TINTS.length]
      }`}
    >
      {photograph ? (
        <Image
          src={photograph}
          alt=""
          fill
          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 92vw"
          className="object-cover"
        />
      ) : (
        // A monogram, centred in the space a photograph would have filled.
        //
        // It was briefly a faint watermark at 25% white. `aria-hidden` hides it from a
        // screen reader but not from somebody with low vision, and at 80px it was the most
        // prominent thing on the card — axe reported 2.24:1 against forest-800, under the
        // 3:1 that large text needs. Faint decoration made of letters is still text. It is
        // now set in a solid tint from the system, which clears the bar on all three
        // backgrounds with room to spare.
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 flex h-3/5 items-center justify-center font-display text-[4rem] leading-none text-cream-200"
        >
          {initials(figure.name)}
        </span>
      )}

      {/* The fade and the bed are the same colour at the same opacity, so the two read as
          one gradient. The fade is decoration; the bed is what makes the contrast a fact. */}
      <span
        aria-hidden
        className="relative h-24 bg-gradient-to-t from-forest-900/95 to-forest-900/0"
      />

      {/* `text-white` on the bed itself, not only on each line inside it. Anything added
          here later that forgets a colour inherits white and stays readable, rather than
          inheriting body ink and landing at about 1:1 on a near-black scrim — which is
          invisible rather than merely low-contrast, and is how this class of bug ships. */}
      <span
        className={`relative ${SCRIM} px-5 pb-5 text-white`}
        data-testid="figure-card-scrim"
      >
        <span className="block font-display text-title text-white" data-testid="figure-card-name">
          {figure.name}
        </span>

        {tags.length > 0 ? (
          <span className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-pill border border-white/25 bg-white/15 px-3 py-1 text-legal font-medium text-white"
              >
                {tag}
              </span>
            ))}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/**
 * Creative Commons attribution for the photographs in the grid above.
 *
 * Credited collectively rather than on each card: the licences require attribution that is
 * reasonable to the medium, and a photographer's name inside a card already carrying a name,
 * a condition and a warning is not reasonable to anybody. Each story page carries the full
 * per-image credit beside the picture it belongs to. PL-16.
 *
 * This is a licence condition, not decoration. If the photographs render, this renders.
 */
function PhotoCredits({ stories }: { stories: StoryCard[] }) {
  const credits = stories
    .map((story) => ({
      figure: story.figure,
      attribution: parseAttribution(story.figure?.imageLicence ?? null),
    }))
    .filter((entry) => entry.figure?.imageUrl && entry.attribution);

  if (credits.length === 0) return null;

  return (
    <p className="mt-8 text-legal text-muted" data-testid="photo-credits">
      Photographs, in order:{" "}
      {credits.map((entry, index) => (
        <span key={entry.figure!.slug}>
          {index > 0 ? "; " : ""}
          {entry.figure!.name} by {entry.attribution!.author}
          {entry.attribution!.licenceUrl ? (
            <>
              {" ("}
              <a
                href={entry.attribution!.licenceUrl}
                rel="noopener noreferrer"
                className="underline"
              >
                {entry.attribution!.licence}
              </a>
              {")"}
            </>
          ) : (
            ` (${entry.attribution!.licence})`
          )}
        </span>
      ))}
      .
    </p>
  );
}
