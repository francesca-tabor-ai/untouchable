import Image from "next/image";
import Link from "next/link";

import { parseAttribution } from "@/components/stories/figure-portrait";
import { Container } from "@/components/ui/container";
import { medicinesForPublishedStory } from "@/lib/medicines/queries";
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

/** How many people the front page introduces. Enough to make the point, few enough to read. */
const CARDS = 6;

interface FigureCardData {
  story: StoryCard;
  /** Conditions first, then any medicines the story links to. Plain text, never links. */
  tags: string[];
}

export async function FigureStrip() {
  const stories = await listPublishedStories({ take: 24 });
  const figures = stories.filter((story) => story.figure !== null).slice(0, CARDS);

  // A row of two looks like an oversight rather than a feature.
  if (figures.length < 3) return null;

  // Medicines are read through the medicines module, which checks the story is published
  // itself rather than trusting this caller — a public read that trusts its caller is a
  // retraction bug waiting to happen.
  const cards: FigureCardData[] = await Promise.all(
    figures.map(async (story) => {
      const medicines = await medicinesForPublishedStory(story.id);
      return {
        story,
        tags: [
          ...story.conditions.map((condition) => condition.name),
          ...medicines.map((medicine) => medicine.name),
        ].slice(0, 4),
      };
    }),
  );

  return (
    <section aria-labelledby="figure-strip-heading" className="border-b border-line bg-white py-16">
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

        <span className="mt-1 block text-small text-cream-200">
          {story.disclosureType === "own" ? "On their own health" : "On someone they love"}
        </span>

        <span className="mt-3 line-clamp-2 block text-small text-cream-200">{story.title}</span>

        {tags.length > 0 ? (
          <span className="mt-4 flex flex-wrap gap-2">
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

        {/* Nobody should meet a story about suicide as a glamorous photograph with no
            warning. The note travels with the card onto every surface it appears on. */}
        {story.needsContentNote ? (
          <span className="mt-4 block text-legal text-clay-200">
            Content note — this story covers a subject some people would rather choose when to
            read.
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
