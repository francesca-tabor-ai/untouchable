import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConditionCharitiesSlot } from "@/components/stories/charity-slots";
import { ContentNote, SupportSignposting } from "@/components/stories/safety-blocks";
import { StoryCardGrid } from "@/components/stories/story-card";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { getCondition, listPublishedStories } from "@/lib/stories/queries";

/**
 * The "you are not alone" page for one condition: what it is, who has talked about it, the
 * charities that work on it, and where to get help.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const condition = await getCondition(slug);
  if (!condition) return { title: "Condition not found" };

  return {
    title: condition.name,
    description: condition.summary.slice(0, 180),
    alternates: { canonical: `/conditions/${condition.slug}` },
  };
}

export default async function ConditionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const condition = await getCondition(slug);
  if (!condition) notFound();

  const stories = await listPublishedStories({ condition: condition.slug });

  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <Container reading className="py-12 sm:py-16">
          <p className="text-small text-muted">
            <Link href="/conditions" className="text-forest-600 underline underline-offset-4">
              Conditions
            </Link>
          </p>
          <h1 className="mt-4 text-hero">{condition.name}</h1>

          {condition.isSensitiveTopic ? (
            <ContentNote note="Some of the stories on this page talk about mental illness and how hard it can get. You do not have to read them now. Support is listed at the end of this page, and it is there any time." />
          ) : null}

          <p className="mt-6 text-lead text-ink-soft">{condition.summary}</p>

          <Callout tone="neutral" className="mt-8">
            <p>
              This is a plain summary, not medical advice, and it is not a substitute for talking
              to your GP or your clinical team. For NHS information about {condition.name.toLowerCase()},
              speak to your GP or call NHS 111.
            </p>
          </Callout>
        </Container>
      </section>

      <Container className="py-12">
        <section aria-labelledby="condition-stories-heading">
          <h2 id="condition-stories-heading" className="text-display">
            {stories.length > 0 ? "People who have talked about it" : "Stories are on their way"}
          </h2>
          {stories.length > 0 ? (
            <>
              <p className="mt-2 max-w-[38rem] text-muted">
                {stories.length} {stories.length === 1 ? "story" : "stories"}, each one written in
                our own words from what the person said publicly themselves.
              </p>
              {/* `portraits` puts each person's photograph on their card, with the credit
                  the licence requires underneath the grid. A condition page is where
                  somebody newly diagnosed arrives, and a face is the difference between a
                  list of names and the thing this platform is for. Nobody without a freely
                  licensed picture is shown one — they keep their initials. */}
              <div className="mt-8">
                <StoryCardGrid stories={stories} portraits />
              </div>
            </>
          ) : (
            <p className="mt-2 max-w-[38rem] text-muted">
              No story about {condition.name.toLowerCase()} has finished its source checks yet.{" "}
              <Link href="/stories" className="text-forest-600 underline underline-offset-4">
                Read the other stories
              </Link>{" "}
              in the meantime.
            </p>
          )}
        </section>

        {/* Charities appear on every condition page. On a sensitive-topic one they render as
            support rather than as an ask — no donate hand-off, no giving copy — because on
            that page the charities are the signposting somebody came for. DECISIONS.md D-015. */}
        <ConditionCharitiesSlot
          conditionId={condition.id}
          sensitive={condition.isSensitiveTopic}
        />

        {condition.isSensitiveTopic ? (
          <SupportSignposting heading="Where to get help with this" />
        ) : null}
      </Container>
    </>
  );
}
