import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { EditorialStory } from "@/lib/stories/editorial";

const STATUS_LABELS: Record<EditorialStory["status"], string> = {
  draft: "Draft",
  in_review: "In review",
  published: "Published",
  retracted: "Retracted",
};

export function StatusBadge({ status }: { status: EditorialStory["status"] }) {
  const tone = status === "published" ? "forest" : status === "retracted" ? "clay" : "quiet";
  return <Badge tone={tone}>{STATUS_LABELS[status]}</Badge>;
}

/** One story in an admin list. Says where it is, and what it is waiting for. */
export function StoryRow({ story, actorId }: { story: EditorialStory; actorId: string }) {
  return (
    <li className="rounded-card border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-small text-muted">
            {story.publicFigure ? story.publicFigure.name : "Community story"}
          </p>
          <h3 className="text-title">
            <Link
              href={`/admin/editorial/stories/${story.id}`}
              className="text-ink hover:text-forest-700 hover:underline underline-offset-4"
            >
              {story.title}
            </Link>
          </h3>
        </div>
        <StatusBadge status={story.status} />
      </div>

      <p className="mt-3 text-small text-muted">
        {story.sourceCount} {story.sourceCount === 1 ? "source" : "sources"} · drafted by{" "}
        {story.draftedBy.email}
        {story.verifiedBy ? ` · verified by ${story.verifiedBy.email}` : ""}
      </p>

      <p className="mt-2 text-small text-ink-soft">{nextStep(story, actorId)}</p>

      {story.openRequestCount > 0 ? (
        <p className="mt-2 text-small text-clay-700">
          {story.openRequestCount} open{" "}
          {story.openRequestCount === 1 ? "request" : "requests"} about this story.
        </p>
      ) : null}
    </li>
  );
}

function nextStep(story: EditorialStory, actorId: string): string {
  if (story.status === "draft") {
    return story.sourceCount === 0
      ? "Needs at least one source before it can go for review."
      : "Ready to send for review.";
  }
  if (story.status === "in_review") {
    return story.draftedById === actorId
      ? "You drafted this, so another editor has to check the sources and publish it."
      : "Waiting for you to check the sources and publish it.";
  }
  if (story.status === "retracted") {
    return "Taken down. Not on the public site.";
  }
  return story.lastReviewedAt
    ? `Live. Last checked ${story.lastReviewedAt.toLocaleDateString("en-GB")}.`
    : "Live. Never re-checked.";
}
