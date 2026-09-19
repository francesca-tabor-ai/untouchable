import type { StoryVideo } from "@/lib/video";

import { YouTubeFacade } from "./youtube-facade";

/**
 * The video block as it appears on a story and on a public figure's page.
 *
 * One component so the two pages cannot drift apart — in particular so neither can end up
 * with the player but without the line that says where it plays from.
 *
 * The heading id is passed in because the two pages sit at different depths in their own
 * outlines, and heading order is not decoration.
 */
export function StoryVideoSection({
  video,
  personName,
  headingId,
  heading = "In their own words",
  headingLevel: Heading = "h2",
  className,
}: {
  video: StoryVideo;
  personName?: string | null;
  headingId: string;
  heading?: string;
  headingLevel?: "h2" | "h3";
  className?: string;
}) {
  return (
    <section aria-labelledby={headingId} className={className}>
      <Heading id={headingId} className="text-title">
        {heading}
      </Heading>
      <p className="mt-2 text-small text-muted">
        One of the sources for this story is an interview
        {personName ? ` with ${personName}` : ""}. You can watch it here.
      </p>
      <YouTubeFacade video={video} personName={personName} className="mt-5" />
    </section>
  );
}
