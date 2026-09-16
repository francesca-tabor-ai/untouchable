import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import { listTakedownRequests } from "@/lib/stories/takedowns";

import { ResolveRequestForm } from "../forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Corrections and removals" };

/**
 * The public correction and removal queue.
 *
 * Every request from the public form lands here. Nothing is decided automatically, and a
 * request is never closed without a note saying what was done.
 */
export default async function RequestsPage() {
  await requireEditor();
  const requests = await listTakedownRequests();

  const open = requests.filter((request) => request.status === "open");
  const closed = requests.filter((request) => request.status !== "open");

  return (
    <Container className="py-10">
      <p className="text-small text-muted">
        <Link href="/admin/editorial" className="text-forest-600 underline underline-offset-4">
          Editorial
        </Link>
      </p>
      <h1 className="mt-3 text-display">Corrections and removals</h1>
      <p className="mt-2 max-w-prose text-muted">
        Anyone can ask us to correct or take down a story — the person it is about, someone
        representing them, or a reader. Read it, check it against the sources, and say what you
        decided.
      </p>

      <section aria-labelledby="open-heading" className="mt-10">
        <h2 id="open-heading" className="text-title">
          Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="mt-4 text-ink-soft">Nothing waiting.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {open.map((request) => (
              <li key={request.id} className="rounded-card border border-line bg-white p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-title">
                    <Link
                      href={`/admin/editorial/stories/${request.story.id}`}
                      className="text-ink hover:text-forest-700 hover:underline underline-offset-4"
                    >
                      {request.story.title}
                    </Link>
                  </h3>
                  <Badge tone={request.type === "removal" ? "clay" : "quiet"}>
                    {request.type === "removal" ? "Removal" : "Correction"}
                  </Badge>
                </div>

                <p className="mt-3 text-small text-muted">
                  {request.requesterName} · {request.relationship} ·{" "}
                  <a
                    href={`mailto:${request.requesterEmail}`}
                    className="text-forest-600 underline underline-offset-4"
                  >
                    {request.requesterEmail}
                  </a>{" "}
                  · {request.createdAt.toLocaleDateString("en-GB")}
                </p>

                <p className="mt-4 text-ink-soft">{request.reason}</p>

                <ResolveRequestForm requestId={request.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="closed-heading" className="mt-14">
        <h2 id="closed-heading" className="text-title">
          Dealt with ({closed.length})
        </h2>
        {closed.length === 0 ? (
          <p className="mt-4 text-ink-soft">Nothing yet.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {closed.map((request) => (
              <li key={request.id} className="rounded-card border border-line bg-white p-5">
                <p className="text-small text-muted">
                  {request.story.title} · {request.type === "removal" ? "Removal" : "Correction"} ·{" "}
                  {request.status === "actioned" ? "Actioned" : "Declined"}
                  {request.resolvedAt ? ` · ${request.resolvedAt.toLocaleDateString("en-GB")}` : ""}
                </p>
                {request.resolutionNote ? (
                  <p className="mt-2 text-ink-soft">{request.resolutionNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
