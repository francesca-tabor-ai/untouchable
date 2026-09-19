import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicFigureProfileView } from "@/components/stories/public-figure-profile";
import { Container } from "@/components/ui/container";
import { StoryVideoSection } from "@/components/video/story-video";
import { getPublicFigure } from "@/lib/stories/queries";
import { findFigureVideo } from "@/lib/video";

/**
 * A public figure's page.
 *
 * The page exists only while at least one of their stories is published. Retract the last
 * one and this becomes a 404 on the next request — a page that stayed up would still be
 * asserting that we hold something about their health. Brief 5.2.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicFigure(slug);
  if (!result) return { title: "Page not found" };

  return {
    title: result.figure.name,
    description: `${result.figure.name} is not affiliated with and has not endorsed UnTouchable. ${result.figure.shortBio}`.slice(
      0,
      200,
    ),
    alternates: { canonical: `/public-figures/${result.figure.slug}` },
  };
}

export default async function PublicFigurePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = await getPublicFigure(slug);
  if (!result) notFound();

  // Read back through `getPublishedStory`, so a retracted story cannot leave its video
  // behind here. Nothing loads from Google until the reader presses play.
  const video = await findFigureVideo(result.stories);

  return (
    <>
      <PublicFigureProfileView figure={result.figure} stories={result.stories} />

      {video ? (
        <section className="border-t border-line bg-cream-50">
          <Container className="py-14">
            <StoryVideoSection
              video={video}
              personName={result.figure.name}
              headingId="figure-video-heading"
              className="max-w-[46rem]"
            />
          </Container>
        </section>
      ) : null}
    </>
  );
}
