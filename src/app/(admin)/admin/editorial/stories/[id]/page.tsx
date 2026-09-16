import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import {
  getEditorialStory,
  listAllConditions,
  listPublicFigures,
  type EditorialStory,
} from "@/lib/stories/editorial";
import { listTakedownRequests } from "@/lib/stories/takedowns";

import {
  ActionButton,
  AddSourceForm,
  RemoveSourceButton,
  RetractForm,
} from "../../forms";
import {
  markReviewedAction,
  publishStoryAction,
  returnToDraftAction,
  submitForReviewAction,
} from "../../actions";
import { StatusBadge } from "../../story-row";
import { StoryForm } from "../../story-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Story" };

export default async function EditorialStoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireEditor();
  const { id } = await params;

  const story = await getEditorialStory(id);
  if (!story) notFound();

  const [figures, conditions, requests] = await Promise.all([
    listPublicFigures(),
    listAllConditions(),
    listTakedownRequests(),
  ]);
  const aboutThisStory = requests.filter((request) => request.story.id === story.id);

  return (
    <Container className="py-10">
      <p className="text-small text-muted">
        <Link href="/admin/editorial" className="text-forest-600 underline underline-offset-4">
          Editorial
        </Link>
      </p>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-display">{story.title}</h1>
        <StatusBadge status={story.status} />
      </div>

      <p className="mt-2 text-small text-muted">
        Drafted by {story.draftedBy.email}
        {story.verifiedBy ? ` · verified by ${story.verifiedBy.email}` : ""}
        {story.status === "published" ? (
          <>
            {" · "}
            <Link
              href={`/stories/${story.slug}`}
              className="text-forest-600 underline underline-offset-4"
            >
              see it on the site
            </Link>
          </>
        ) : null}
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-12">
          <section aria-labelledby="content-heading">
            <h2 id="content-heading" className="text-title">
              The story
            </h2>
            <div className="mt-6">
              <StoryForm
                mode="edit"
                values={{
                  id: story.id,
                  type: story.type,
                  publicFigureId: story.publicFigureId,
                  disclosureType: story.disclosureType,
                  title: story.title,
                  slug: story.slug,
                  summary: story.summary,
                  keyMoments: story.keyMoments,
                  quote: story.quote,
                  quoteSourceId: story.quoteSourceId,
                  contentNote: story.contentNote,
                  communityPermissionConfirmed: story.communityPermissionConfirmed,
                  conditionIds: story.conditions.map((link) => link.condition.id),
                }}
                figures={figures}
                conditions={conditions}
                sources={story.sources}
                editable={story.status !== "published"}
              />
            </div>
          </section>

          <section aria-labelledby="sources-heading">
            <h2 id="sources-heading" className="text-title">
              Sources
            </h2>
            <p className="mt-2 max-w-prose text-small text-muted">
              At least one is needed before a story can be published, and the last one cannot be
              removed while it is live. Each one should be the person speaking for themselves.
            </p>

            {story.sources.length === 0 ? (
              <p className="mt-5 text-ink-soft">No sources yet.</p>
            ) : (
              <ul className="mt-5 space-y-3">
                {story.sources.map((source) => (
                  <li
                    key={source.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-line bg-white p-5"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{source.title}</p>
                      <p className="mt-1 text-small text-muted">
                        {source.publisher}
                        {source.publishedDate
                          ? ` · ${source.publishedDate.toLocaleDateString("en-GB")}`
                          : ""}
                      </p>
                      <p className="mt-1 text-legal break-all text-muted">
                        <a
                          href={source.url}
                          rel="noopener noreferrer nofollow"
                          target="_blank"
                          className="text-forest-600 underline underline-offset-4"
                        >
                          {source.url}
                        </a>
                      </p>
                    </div>
                    <RemoveSourceButton sourceId={source.id} />
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8 rounded-card border border-line bg-white p-6">
              <h3 className="text-title">Add a source</h3>
              <div className="mt-5">
                <AddSourceForm storyId={story.id} />
              </div>
            </div>
          </section>

          {aboutThisStory.length > 0 ? (
            <section aria-labelledby="requests-heading">
              <h2 id="requests-heading" className="text-title">
                Requests about this story
              </h2>
              <ul className="mt-5 space-y-3">
                {aboutThisStory.map((request) => (
                  <li key={request.id} className="rounded-card border border-line bg-white p-5">
                    <p className="text-small text-muted">
                      {request.type === "removal" ? "Removal" : "Correction"} ·{" "}
                      {request.status} · {request.relationship}
                    </p>
                    <p className="mt-2 text-ink-soft">{request.reason}</p>
                    <p className="mt-3 text-small">
                      <Link
                        href="/admin/editorial/requests"
                        className="text-forest-600 underline underline-offset-4"
                      >
                        Handle it in the requests queue
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <PublishingPanel story={story} actorId={actor.id} />

          {story.status === "published" || story.status === "retracted" ? (
            <div className="rounded-card border border-line bg-white p-6">
              <h2 className="text-title">
                {story.status === "published" ? "Take it down" : "Bring it back"}
              </h2>
              <div className="mt-5">
                {story.status === "published" ? (
                  <RetractForm storyId={story.id} />
                ) : (
                  <ActionButton
                    action={returnToDraftAction}
                    storyId={story.id}
                    label="Move back to draft"
                    pendingLabel="Moving…"
                    help="It goes through review and a second editor again before it can be published."
                  />
                )}
              </div>
              {story.status === "retracted" && story.retractionReason ? (
                <p className="mt-5 text-small text-muted">
                  Reason recorded: {story.retractionReason}
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}

/**
 * Two-step publishing, said plainly.
 *
 * The panel never shows a publish button to the person who drafted the story, and never
 * shows one at all until there is a source. The rules are enforced in the domain layer and
 * in the database; this is the part that stops an editor wondering why.
 */
function PublishingPanel({ story, actorId }: { story: EditorialStory; actorId: string }) {
  const isDrafter = story.draftedById === actorId;

  return (
    <div className="rounded-card border border-line bg-white p-6">
      <h2 className="text-title">Publishing</h2>
      <ol className="mt-4 space-y-3 text-small text-ink-soft">
        <li>
          <strong className="text-ink">1. An editor drafts it</strong> and adds the sources.
        </li>
        <li>
          <strong className="text-ink">2. A different editor</strong> opens every source, checks
          the story against them, and publishes.
        </li>
      </ol>

      <div className="mt-6 border-t border-line pt-6">
        {story.status === "draft" ? (
          story.sourceCount === 0 ? (
            <Callout tone="warm" title="Not ready yet">
              <p>Add at least one source. A story cannot be published without one.</p>
            </Callout>
          ) : (
            <ActionButton
              action={submitForReviewAction}
              storyId={story.id}
              label="Send for review"
              pendingLabel="Sending…"
              variant="primary"
              help="Another editor will check the sources. You will not be able to publish it yourself."
            />
          )
        ) : null}

        {story.status === "in_review" ? (
          isDrafter ? (
            <Callout tone="neutral" title="Waiting for another editor">
              <p>
                You drafted this story, so you cannot verify it. Ask another editor to open every
                source and publish it. This is not something the interface can let you skip — the
                database refuses it too.
              </p>
            </Callout>
          ) : (
            <>
              <p className="text-small text-ink-soft">
                Before you publish: open every source, check that the person is speaking about
                their own health or a loved one&rsquo;s, and that the summary is in our own words.
              </p>
              <div className="mt-4">
                <ActionButton
                  action={publishStoryAction}
                  storyId={story.id}
                  label="Sources checked — publish"
                  pendingLabel="Publishing…"
                  variant="primary"
                />
              </div>
              <div className="mt-4">
                <ActionButton
                  action={returnToDraftAction}
                  storyId={story.id}
                  label="Send back to the drafter"
                  pendingLabel="Sending back…"
                />
              </div>
            </>
          )
        ) : null}

        {story.status === "published" ? (
          <>
            <p className="text-small text-ink-soft">
              Live since {story.publishedAt?.toLocaleDateString("en-GB")}. Stories are re-checked
              every twelve months.
            </p>
            <div className="mt-4">
              <ActionButton
                action={markReviewedAction}
                storyId={story.id}
                label="I have re-checked this"
                pendingLabel="Saving…"
                help={
                  story.lastReviewedAt
                    ? `Last checked ${story.lastReviewedAt.toLocaleDateString("en-GB")}.`
                    : "Never re-checked."
                }
              />
            </div>
          </>
        ) : null}

        {story.status === "retracted" ? (
          <p className="text-small text-ink-soft">
            This story is off the public site. Move it back to draft to work on it again.
          </p>
        ) : null}
      </div>
    </div>
  );
}
