import { getPublishedStory } from "@/lib/stories/queries";

import { parseYouTubeUrl, youTubeEmbedUrl, type YouTubeVideo } from "./youtube";

export { parseYouTubeUrl, youTubeEmbedUrl } from "./youtube";
export type { YouTubeVideo } from "./youtube";

/**
 * Finding the video a story already has.
 *
 * There is no new column and no new table: a video is simply one of the story's existing
 * `Source` rows that happens to point at YouTube. That matters for more than tidiness — it
 * means a video can never be attached to a story without also being a cited source, checked
 * by the two editors who published it, and it means retraction removes the video with the
 * story because the sources go with it.
 */

/**
 * The shape this module needs from a source row. `StorySource` from
 * `src/lib/stories/queries.ts` satisfies it; the structural type keeps this file testable
 * without a database.
 */
export interface VideoSourceLike {
  id: string;
  url: string;
  title: string;
  publisher: string;
}

export interface StoryVideo {
  /** The `Source` row this came from, so a caller can tie it back to the citation. */
  sourceId: string;
  /** The original source address. Shown as a plain link; never loaded by us. */
  sourceUrl: string;
  title: string;
  publisher: string;
  video: YouTubeVideo;
  /** Always a `youtube-nocookie.com` address, and never requested until somebody clicks. */
  embedUrl: string;
}

/**
 * The first source that is a YouTube video, or null.
 *
 * First rather than best: any ordering by "best" would be an editorial judgement made by
 * code. The sources arrive from `getPublishedStory` in the order editors gave them.
 */
export function findStoryVideo(sources: readonly VideoSourceLike[]): StoryVideo | null {
  for (const source of sources) {
    const video = parseYouTubeUrl(source.url);
    if (!video) continue;

    return {
      sourceId: source.id,
      sourceUrl: source.url,
      title: source.title,
      publisher: source.publisher,
      video,
      embedUrl: youTubeEmbedUrl(video),
    };
  }
  return null;
}

/**
 * The first video among a public figure's published stories.
 *
 * Reads each story back through `getPublishedStory`, which is the query that filters to
 * published — so a retracted story cannot leave its video behind on the figure's page. A
 * figure has one or two stories, so the loop is short by construction.
 */
export async function findFigureVideo(
  stories: readonly { slug: string }[],
): Promise<StoryVideo | null> {
  for (const story of stories) {
    const published = await getPublishedStory(story.slug);
    if (!published) continue;

    const video = findStoryVideo(published.sources);
    if (video) return video;
  }
  return null;
}
