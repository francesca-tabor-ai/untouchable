import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import type { StoryCard as StoryCardData } from "@/lib/stories/queries";

/**
 * One story in a list. The whole card is not a link — the title is — so that the card can
 * carry its own condition links without nesting interactive elements.
 */
export function StoryCard({
  story,
  headingLevel = "h3",
}: {
  story: StoryCardData;
  headingLevel?: "h2" | "h3" | "h4";
}) {
  return (
    <Card interactive className="flex h-full flex-col">
      <p className="text-small text-muted">
        {story.figure ? story.figure.name : "A community story"}
        {story.disclosureType === "loved_one" ? " · on someone they love" : ""}
      </p>

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
}: {
  stories: StoryCardData[];
  headingLevel?: "h2" | "h3" | "h4";
}) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {stories.map((story) => (
        <li key={story.id}>
          <StoryCard story={story} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
