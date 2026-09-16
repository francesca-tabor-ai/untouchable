import Link from "next/link";

import { listPublishedStories } from "@/lib/stories/queries";
import type { StoryCard } from "@/lib/stories/queries";
import { Container } from "@/components/ui/container";

import { Scroller } from "./scroller";

/**
 * The row of people directly under the hero. The point it makes is the whole premise of the
 * platform: these are not patients in the abstract, they are people you have heard of.
 *
 * No photographs. We hold a licence for none of them, and a public figure's picture is
 * almost never free to reuse — so each person gets a monogram, which the brief anticipates
 * ("initials or neutral illustration"). When a licensed image exists for a figure it can be
 * dropped in here without changing anything else.
 *
 * Only published stories appear, because this reads through the same query as every other
 * public surface. Retract a story and the person leaves this row on the next request.
 */
export async function FigureStrip() {
  const stories = await listPublishedStories({ take: 18 });
  const figures = stories.filter((story) => story.figure !== null);

  // A row of two looks like an oversight rather than a feature.
  if (figures.length < 3) return null;

  return (
    <section aria-labelledby="figure-strip-heading" className="border-b border-line bg-white py-14">
      <Container>
        <div className="mb-8 max-w-[34rem]">
          <h2 id="figure-strip-heading" className="text-display">
            People you have heard of
          </h2>
          <p className="mt-3 text-ink-soft">
            Every one of them chose to talk about it publicly. Nothing here is second-hand, and
            every story lists where it came from.
          </p>
        </div>

        <Scroller label="People who have shared their health story">
          {figures.map((story, index) => (
            <FigureCard key={story.id} story={story} index={index} />
          ))}
        </Scroller>

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

// Rotated so a row of monograms reads as a group of people rather than a spreadsheet.
const TINTS = [
  "bg-forest-100 text-forest-800",
  "bg-clay-100 text-clay-700",
  "bg-cream-200 text-ink-soft",
  "bg-forest-50 text-forest-700",
];

function FigureCard({ story, index }: { story: StoryCard; index: number }) {
  const figure = story.figure!;
  const condition = story.conditions[0];
  // Rotated by position rather than by name: hashing the name left whole tints unused and
  // the row looked like one colour with noise in it.
  const tint = TINTS[index % TINTS.length];

  return (
    <li className="w-[17rem] shrink-0 snap-start">
      <Link
        href={`/stories/${story.slug}`}
        className="flex h-full flex-col rounded-card border border-line bg-cream-50 p-6 transition-shadow duration-[--duration-calm] ease-[--ease-out-soft] hover:shadow-soft"
      >
        <span
          aria-hidden
          className={`flex h-14 w-14 items-center justify-center rounded-pill font-display text-title ${tint}`}
        >
          {initials(figure.name)}
        </span>

        <span className="mt-4 font-display text-title text-ink">{figure.name}</span>

        <span className="mt-1 text-small text-muted">
          {story.disclosureType === "own" ? "On their own health" : "On someone they love"}
          {condition ? ` · ${condition.name}` : ""}
        </span>

        <span className="mt-3 line-clamp-3 text-small text-ink-soft">{story.title}</span>

        {story.needsContentNote ? (
          <span className="mt-4 text-legal text-clay-700">
            Content note — this story covers a subject some people would rather choose when to read.
          </span>
        ) : null}
      </Link>
    </li>
  );
}
