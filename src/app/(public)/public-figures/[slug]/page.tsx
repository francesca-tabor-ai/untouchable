import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicFigureProfileView } from "@/components/stories/public-figure-profile";
import { getPublicFigure } from "@/lib/stories/queries";

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

  return <PublicFigureProfileView figure={result.figure} stories={result.stories} />;
}
