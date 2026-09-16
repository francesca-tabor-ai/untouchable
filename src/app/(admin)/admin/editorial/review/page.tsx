import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import { REVIEW_INTERVAL_MONTHS, reviewQueue } from "@/lib/stories/editorial";

import { StoryRow } from "../story-row";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Due for review" };

/**
 * The twelve-month re-check. Brief 5.2: stories are flagged for re-review after a year,
 * because what somebody said about their health in 2024 may not be where they are now.
 */
export default async function ReviewQueuePage() {
  const actor = await requireEditor();
  const stories = await reviewQueue();

  return (
    <Container className="py-10">
      <p className="text-small text-muted">
        <Link href="/admin/editorial" className="text-forest-600 underline underline-offset-4">
          Editorial
        </Link>
      </p>
      <h1 className="mt-3 text-display">Due for review</h1>
      <p className="mt-2 max-w-prose text-muted">
        Published stories nobody has checked in the last {REVIEW_INTERVAL_MONTHS} months. Open
        each one, check that the sources still work and that nothing has changed, then mark it as
        re-checked.
      </p>

      {stories.length === 0 ? (
        <p className="mt-8 text-ink-soft">Nothing is waiting. Every published story has been checked within the last year.</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {stories.map((story) => (
            <StoryRow key={story.id} story={story} actorId={actor.id} />
          ))}
        </ul>
      )}
    </Container>
  );
}
