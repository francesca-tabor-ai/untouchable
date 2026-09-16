import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import { editorialCounts, listEditorialStories } from "@/lib/stories/editorial";

import { StoryRow } from "./story-row";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Editorial" };

export default async function EditorialHomePage() {
  const actor = await requireEditor();
  const [counts, stories] = await Promise.all([editorialCounts(), listEditorialStories()]);

  const waitingForYou = stories.filter(
    (story) => story.status === "in_review" && story.draftedById !== actor.id,
  );

  return (
    <Container className="py-10">
      <h1 className="text-display">Editorial</h1>
      <p className="mt-2 max-w-prose text-muted">
        Every story here is about a real, named person. One editor drafts and sends it for
        review; a different editor checks the sources and publishes it. Neither step can be
        skipped.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="sm">
          <Link href="/admin/editorial/stories/new">Draft a story</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/editorial/figures/new">Add a public figure</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/editorial/requests">
            Corrections and removals ({counts.openRequests})
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/editorial/review">Due for review ({counts.dueForReview})</Link>
        </Button>
      </div>

      <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Count label="Drafts" value={counts.draft} />
        <Count label="In review" value={counts.inReview} />
        <Count label="Published" value={counts.published} />
        <Count label="Retracted" value={counts.retracted} />
      </dl>

      {waitingForYou.length > 0 ? (
        <Callout tone="care" title="Waiting for a second pair of eyes" className="mt-10">
          <p>
            {waitingForYou.length}{" "}
            {waitingForYou.length === 1 ? "story was" : "stories were"} drafted by someone else
            and can be verified by you.
          </p>
        </Callout>
      ) : null}

      <section aria-labelledby="all-stories-heading" className="mt-12">
        <h2 id="all-stories-heading" className="text-title">
          All stories
        </h2>
        {stories.length === 0 ? (
          <p className="mt-4 text-muted">Nothing drafted yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {stories.map((story) => (
              <StoryRow key={story.id} story={story} actorId={actor.id} />
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-line bg-white p-5">
      <dt className="text-small text-muted">{label}</dt>
      <dd className="mt-1 font-display text-display">{value}</dd>
    </div>
  );
}
