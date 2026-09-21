import Link from "next/link";

import {
  FigureMonogram,
  FigurePhotoCredits,
  FigureThumbnail,
  hasLicensedPhotograph,
} from "@/components/stories/figure-portrait";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import type { StoryCard as StoryCardData } from "@/lib/stories/queries";

/**
 * One story in a list. The whole card is not a link — the title is — so that the card can
 * carry its own condition links without nesting interactive elements.
 *
 * With `portrait`, the card leads with the person's face. A condition page is the place
 * somebody lands the week they were diagnosed, and a column of names is a list; a column of
 * faces is the point the platform is making, which is that these are people you have heard
 * of. The picture is decorative here — the name is right beside it — so it carries an empty
 * alt and the credit is made collectively by `StoryCardGrid`, never card by card.
 *
 * A photograph renders only when a licence is recorded on the same record. Somebody with no
 * licensed picture keeps their initials. See `figure-portrait.tsx`.
 */
export function StoryCard({
  story,
  headingLevel = "h3",
  portrait = false,
}: {
  story: StoryCardData;
  headingLevel?: "h2" | "h3" | "h4";
  portrait?: boolean;
}) {
  const figure = story.figure;
  const byline = (
    <>
      {figure ? figure.name : "A community story"}
      {story.disclosureType === "loved_one" ? " · on someone they love" : ""}
    </>
  );

  return (
    <Card interactive className="flex h-full flex-col">
      {portrait && figure ? (
        <div className="flex items-center gap-3" data-testid="story-card-byline">
          {/* One or the other, never both and never nothing: the thumbnail returns null
              unless a licence is recorded with the image, and the monogram takes the space
              it would have filled. */}
          {hasLicensedPhotograph(figure) ? (
            <FigureThumbnail figure={figure} />
          ) : (
            <FigureMonogram name={figure.name} />
          )}
          <p className="text-small text-muted">{byline}</p>
        </div>
      ) : (
        <p className="text-small text-muted" data-testid="story-card-byline">
          {byline}
        </p>
      )}

      <CardTitle as={headingLevel} className="mt-1">
        <Link
          href={`/stories/${story.slug}`}
          className="text-ink hover:text-forest-700 hover:underline underline-offset-4"
        >
          {story.title}
        </Link>
      </CardTitle>

      {story.needsContentNote ? (
        <p className="mt-3 text-legal text-clay-700">
          Content note — this story covers a subject some people would rather choose when to
          read.
        </p>
      ) : null}

      <p className="mt-3 line-clamp-4 text-small text-ink-soft">{story.summary}</p>

      {story.conditions.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-2">
          {story.conditions.map((condition) => (
            <li key={condition.slug}>
              <Link href={`/conditions/${condition.slug}`} className="rounded-pill">
                <Badge tone="forest">{condition.name}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function StoryCardGrid({
  stories,
  headingLevel = "h3",
  portraits = false,
}: {
  stories: StoryCardData[];
  headingLevel?: "h2" | "h3" | "h4";
  /** Show each person's photograph, with the attribution the licences require beneath. */
  portraits?: boolean;
}) {
  return (
    <>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <li key={story.id}>
            <StoryCard story={story} headingLevel={headingLevel} portrait={portraits} />
          </li>
        ))}
      </ul>

      {/* The credit is half of the licence, not a footnote to it. It is rendered here rather
          than by the page so that turning the photographs on cannot turn it off. */}
      {portraits ? (
        <FigurePhotoCredits
          className="mt-8"
          figures={stories
            .map((story) => story.figure)
            .filter((figure): figure is NonNullable<typeof figure> => figure !== null)}
        />
      ) : null}
    </>
  );
}
