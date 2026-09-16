import Link from "next/link";
import type { ReactNode } from "react";

import { StoryCardGrid } from "@/components/stories/story-card";
import { Container } from "@/components/ui/container";
import type { PublicStory, StoryCard } from "@/lib/stories/queries";
import { contentNoteText, needsSupportSignposting } from "@/lib/stories/safety";

import { ContentNote, NoEndorsement, SupportSignposting } from "./safety-blocks";
import {
  ConditionLinks,
  DisclosureLine,
  KeyMomentsTimeline,
  SourceList,
  StoryQuote,
  formatDate,
} from "./story-detail";

/**
 * A whole story page.
 *
 * The order is fixed and deliberate: content note first, story, sources, then support. It
 * is one component rather than a page assembling parts so that a sensitive-topic story can
 * never end up without its note or its signposting — brief 5.2, and tested in
 * tests/unit/stories-public-surfaces.test.tsx.
 */
export function StoryArticle({
  story,
  related,
  saveSlot,
  charitySlot,
}: {
  story: PublicStory;
  related: StoryCard[];
  /** The save toggle. Rendered under the summary where it is easy to reach on a phone. */
  saveSlot?: ReactNode;
  /** Charities linked to this story. Owned by the charity team. */
  charitySlot?: ReactNode;
}) {
  const note = contentNoteText(story);
  const showSupport = needsSupportSignposting(story);

  return (
    <article>
      <Container reading className="py-10 sm:py-14">
        <p className="text-small text-muted">
          <Link href="/stories" className="text-forest-600 underline underline-offset-4">
            Stories
          </Link>
        </p>

        <h1 className="mt-4 text-hero">{story.title}</h1>

        {story.figure ? (
          <p className="mt-4 text-lead text-ink-soft">
            <Link
              href={`/public-figures/${story.figure.slug}`}
              className="text-forest-600 underline underline-offset-4"
            >
              {story.figure.name}
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-lead text-ink-soft">
            A community story, shared with the person&rsquo;s written permission.
          </p>
        )}

        <DisclosureLine story={story} />

        {note ? <ContentNote note={note} /> : null}

        <div className="mt-8 space-y-5 text-body text-ink-soft">
          {story.summary.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>

        {story.quote && story.quoteSource ? (
          <StoryQuote quote={story.quote} source={story.quoteSource} />
        ) : null}

        {saveSlot}

        <KeyMomentsTimeline moments={story.keyMoments} />

        <ConditionLinks conditions={story.conditions} heading="What this story is about" />

        {/* On a sensitive-topic story this renders as support rather than as an ask — no
            donate hand-off, no giving copy. `StoryCharitiesSlot` owns that decision, so the
            slot is rendered here exactly as the caller built it. DECISIONS.md D-015. */}
        {charitySlot}

        <SourceList sources={story.sources} />

        {story.figure ? <NoEndorsement name={story.figure.name} /> : null}

        <p className="mt-6 text-legal text-muted">
          {story.publishedAt ? `Published ${formatDate(story.publishedAt)}. ` : ""}
          Something wrong here?{" "}
          <Link href="/corrections" className="text-forest-600 underline underline-offset-4">
            Ask us to correct or remove this story
          </Link>
          .
        </p>

        {showSupport ? <SupportSignposting /> : null}
      </Container>

      {related.length > 0 ? (
        <section aria-labelledby="related-heading" className="border-t border-line bg-cream-50">
          <Container className="py-14">
            <h2 id="related-heading" className="text-display">
              You are not the only one
            </h2>
            <p className="mt-2 text-muted">Other stories about the same conditions.</p>
            <div className="mt-8">
              <StoryCardGrid stories={related} />
            </div>
          </Container>
        </section>
      ) : null}
    </article>
  );
}
