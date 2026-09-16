import type { Metadata } from "next";
import Link from "next/link";

import { StoryCardGrid } from "@/components/stories/story-card";
import { StoryFilters } from "@/components/stories/story-filters";
import { Container } from "@/components/ui/container";
import {
  countPublishedStories,
  listConditions,
  listPublishedStories,
} from "@/lib/stories/queries";
import { storySearchSchema, type StorySearchInput } from "@/lib/stories/schemas";

/**
 * The story index.
 *
 * Rendered on the server on every request. Nothing here is cached, because a story that is
 * retracted has to be gone from this list on the very next request — brief 5.2, and
 * DECISIONS.md D-013.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stories",
  description:
    "Health stories that well-known people chose to share themselves, told carefully, in our own words, with the sources listed.",
};

export default async function StoriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = storySearchSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    condition: typeof raw.condition === "string" ? raw.condition : undefined,
  });
  const filters: StorySearchInput = parsed.success
    ? parsed.data
    : { q: undefined, condition: undefined };

  const [conditions, stories, total] = await Promise.all([
    listConditions(),
    listPublishedStories(filters),
    countPublishedStories(),
  ]);

  const activeCondition = conditions.find((c) => c.slug === filters.condition);

  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <Container className="py-12 sm:py-16">
          <div className="max-w-[38rem]">
            <h1 className="text-hero">Stories</h1>
            <p className="mt-5 text-lead text-ink-soft">
              People who are known for something else, saying what happened to them or to someone
              they love. Every story here was shared publicly by the person themselves, and every
              one of them lists its sources.
            </p>
          </div>

          <StoryFilters
            conditions={conditions}
            activeCondition={filters.condition}
            query={filters.q}
          />
        </Container>
      </section>

      <Container className="py-12">
        <div aria-live="polite">
          <h2 className="text-title">
            {describeResults(stories.length, total, filters.q, activeCondition?.name)}
          </h2>
        </div>

        {stories.length > 0 ? (
          <div className="mt-8">
            <StoryCardGrid stories={stories} />
          </div>
        ) : (
          <p className="mt-6 max-w-[34rem] text-ink-soft">
            Nothing matched that. Try a different word, or browse{" "}
            <Link href="/stories" className="text-forest-600 underline underline-offset-4">
              all the stories
            </Link>
            . We are adding more as editors check the sources.
          </p>
        )}
      </Container>
    </>
  );
}

function describeResults(
  shown: number,
  total: number,
  query?: string,
  conditionName?: string,
): string {
  if (shown === 0) return "No stories match that yet";

  const count = `${shown} ${shown === 1 ? "story" : "stories"}`;
  if (query && conditionName) return `${count} about ${conditionName}, matching “${query}”`;
  if (query) return `${count} matching “${query}”`;
  if (conditionName) return `${count} about ${conditionName}`;
  return `All ${total} ${total === 1 ? "story" : "stories"}`;
}
