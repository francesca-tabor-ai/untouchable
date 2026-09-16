import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { QuestionnaireForm } from "@/components/questionnaires/questionnaire-form";
import { formatDate } from "@/components/questionnaires/response-recorded";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { draftScopeForCheckIn, ownCheckIn } from "@/lib/questionnaires/check-ins";
import { readDraft } from "@/lib/questionnaires/drafts";

import { autosaveCheckInAction, saveCheckInAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "A check-in" };

/**
 * Answering one scheduled check-in.
 *
 * The questions come from the version the check-in points at — not the newest one — so a
 * check-in created weeks ago still asks what it was created to ask, and the answers land
 * against that exact version.
 *
 * Nothing on this page asks anybody for money, and nothing that does may be added.
 */
export default async function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAdult(`/check-ins/${id}`);
  await requireTrackingConsent(user.id);

  const found = await ownCheckIn(user.id, id);
  if (!found) notFound();

  if (found.status === "completed") {
    return (
      <Container reading className="py-12 sm:py-16">
        <h1 className="text-display">{found.checkIn.questionnaireTitle}</h1>
        <Callout tone="care" className="mt-8" title="You have already answered this one">
          <p>
            It is on{" "}
            <Link href="/check-ins" className="underline underline-offset-2">
              your check-ins page
            </Link>
            , with the date you answered it.
          </p>
        </Callout>
      </Container>
    );
  }

  const draft = await readDraft(draftScopeForCheckIn(id), found.version.definition.items);

  return (
    <Container reading className="py-12 sm:py-16">
      <p className="text-small">
        <Link href="/check-ins" className="text-forest-600 underline underline-offset-4">
          Your check-ins
        </Link>
      </p>
      <h1 className="mt-6 text-display">{found.checkIn.questionnaireTitle}</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Due {formatDate(found.checkIn.dueAt)}. You can stop part way through and come back to it.
      </p>

      {Object.keys(draft).length > 0 ? (
        <Callout className="mt-8" title="We kept what you had filled in">
          <p>Your answers from last time are below. Carry on where you left off.</p>
        </Callout>
      ) : null}

      <div className="mt-8">
        <QuestionnaireForm
          items={found.version.definition.items}
          values={draft}
          action={saveCheckInAction}
          autosave={autosaveCheckInAction}
          hidden={{ checkInId: id }}
          cancelHref="/check-ins"
        />
      </div>

      <Callout className="mt-10" title="What happens to these answers">
        <p>
          They are stored against the exact set of questions you were asked. Anything you write in
          your own words is only ever shown back to you, and is never included in research.
        </p>
        <p className="mt-2">{found.version.licenceNote}</p>
      </Callout>
    </Container>
  );
}
