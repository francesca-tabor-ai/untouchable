import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StoryCharitiesSlot } from "@/components/stories/charity-slots";
import { SaveStory } from "@/components/stories/save-story";
import { StoryArticle } from "@/components/stories/story-article";
import { getCurrentUser } from "@/lib/auth/guards";
import { getPublishedStory, getRelatedStories } from "@/lib/stories/queries";
import { isStorySaved } from "@/lib/stories/saved";
import { needsSupportSignposting } from "@/lib/stories/safety";

import { toggleSavedStoryAction } from "../actions";

/**
 * One story.
 *
 * Server-rendered on every request, with no caching: a retracted story returns a 404 here
 * on the next request, not on the next revalidation. Brief 5.2.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  if (!story) return { title: "Story not found" };

  return {
    title: story.title,
    description: story.summary.slice(0, 180),
    alternates: { canonical: `/stories/${story.slug}` },
  };
}

export default async function StoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getPublishedStory(slug);
  if (!story) notFound();

  const [related, user] = await Promise.all([
    getRelatedStories(
      story.id,
      story.conditions.map((condition) => condition.slug),
    ),
    getCurrentUser(),
  ]);

  const saved = user ? await isStorySaved(user.id, story.id) : false;

  return (
    <StoryArticle
      story={story}
      related={related}
      saveSlot={
        <SaveStory
          storyId={story.id}
          saved={saved}
          signedIn={Boolean(user)}
          action={toggleSavedStoryAction}
          returnTo={`/stories/${story.slug}`}
        />
      }
      charitySlot={
        <StoryCharitiesSlot storyId={story.id} sensitive={needsSupportSignposting(story)} />
      }
    />
  );
}
