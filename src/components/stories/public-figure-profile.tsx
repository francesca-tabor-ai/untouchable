import { StoryCardGrid } from "@/components/stories/story-card";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import type { PublicFigureProfile, StoryCard } from "@/lib/stories/queries";

import { NoEndorsement } from "./safety-blocks";
import { ConditionLinks } from "./story-detail";

/**
 * A public figure's page.
 *
 * Kept as one presentational component so the no-endorsement disclaimer cannot be left off
 * a variant of this page by accident — brief 5.2, and tested in
 * tests/unit/stories-public-surfaces.test.tsx.
 */
export function PublicFigureProfileView({
  figure,
  stories,
}: {
  figure: PublicFigureProfile;
  stories: StoryCard[];
}) {
  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <Container className="py-14 sm:py-20">
          <div className="max-w-[40rem]">
            {figure.isDeceased ? (
              <Badge tone="quiet">Shared by their family or estate</Badge>
            ) : null}
            <h1 className="mt-3 text-hero">{figure.name}</h1>
            <p className="mt-5 text-lead text-ink-soft">{figure.shortBio}</p>
            <NoEndorsement name={figure.name} />
          </div>
        </Container>
      </section>

      <Container className="py-14">
        <section aria-labelledby="their-stories-heading">
          <h2 id="their-stories-heading" className="text-display">
            {stories.length === 1 ? "Their story" : "Their stories"}
          </h2>
          <p className="mt-2 text-muted">
            Written in our own words, from what {figure.name} has said publicly.
          </p>
          <div className="mt-8">
            <StoryCardGrid stories={stories} />
          </div>
        </section>

        <ConditionLinks
          conditions={figure.conditions}
          heading="What these stories are about"
        />
      </Container>
    </>
  );
}
