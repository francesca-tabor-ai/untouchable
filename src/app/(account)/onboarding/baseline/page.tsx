import type { Metadata } from "next";
import Link from "next/link";

import { StepHeader } from "@/components/onboarding/step-header";
import { QuestionnaireForm } from "@/components/questionnaires/questionnaire-form";
import { ResponseRecorded } from "@/components/questionnaires/response-recorded";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { nextHrefAfter, ONBOARDING_STEPS } from "@/lib/onboarding";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { baselineResponseFor, baselineVersion } from "@/lib/questionnaires/baseline";
import { readDraft } from "@/lib/questionnaires/drafts";
import { evaluateRedFlags } from "@/lib/questionnaires/red-flags";
import { ownResponse } from "@/lib/questionnaires/responses";

import { autosaveBaselineAction, saveBaselineAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your first check-in" };

const POSITION = ONBOARDING_STEPS.findIndex((step) => step.key === "baseline") + 1;

const LEAD =
  "A short set of questions about how things are for you right now. Everything you record later sits next to this, so it is worth doing when you have a quiet few minutes.";

/**
 * The baseline assessment — the last step of onboarding (brief 7.1).
 *
 * The questions are not written here. They come from whichever published questionnaire
 * version declares itself the baseline, so changing them is an admin publishing a new
 * version, not a deployment.
 *
 * Nothing on this page says what any answer means. Nothing on it asks anybody for money
 * either, and nothing that does may be added — brief 6.4, AGENTS.md rule 5.
 *
 * Once the answers are in, the same address shows them back with `?recorded=<id>`, rather
 * than a page of its own: one step, one screen, and the flow keeps its shape.
 */
export default async function BaselineStepPage({
  searchParams,
}: {
  searchParams: Promise<{ recorded?: string }>;
}) {
  const user = await requireAdult("/onboarding/baseline");
  await requireTrackingConsent(user.id);

  const version = await baselineVersion();
  const skipHref = await nextHrefAfter(user.id, "baseline");
  const { recorded: recordedId } = await searchParams;

  if (recordedId) {
    const recorded = await ownResponse(user.id, recordedId);
    if (recorded) {
      return (
        <Container reading className="py-12 sm:py-16">
          <h1 className="text-display">Your answers are recorded</h1>
          <p className="mt-4 text-lead text-ink-soft">
            That is the setting up finished. Thank you for taking the time.
          </p>

          <div className="mt-8">
            <ResponseRecorded
              summary={recorded.summary}
              redFlags={evaluateRedFlags(recorded.version.row, recorded.answers)}
            />
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={skipHref}>Carry on</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/check-ins">See your check-ins</Link>
            </Button>
          </div>

          <p className="mt-10 text-small text-muted">
            UnTouchable records and shows information. It does not tell you what a score means, and
            nothing here replaces your GP or your clinical team.
          </p>
        </Container>
      );
    }
  }

  if (!version) {
    return (
      <Container reading className="py-12 sm:py-16">
        <StepHeader position={POSITION} total={ONBOARDING_STEPS.length} title="Your first check-in" lead={LEAD} />
        <Callout tone="care" className="mt-8" title="There are no questions set up yet">
          <p>
            Nothing is wrong with your account. Skip this for now — it will be waiting on your
            account page once the questions are published.
          </p>
        </Callout>
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href={skipHref}>Skip for now</Link>
          </Button>
        </div>
      </Container>
    );
  }

  const [already, draft] = await Promise.all([
    baselineResponseFor(user.id),
    readDraft({ key: `baseline-${version.id}`, path: "/onboarding/baseline" }, version.definition.items),
  ]);

  return (
    <Container reading className="py-12 sm:py-16">
      <StepHeader position={POSITION} total={ONBOARDING_STEPS.length} title="Your first check-in" lead={LEAD} />

      {already ? (
        <Callout tone="care" className="mt-8" title="You have already answered these">
          <p>
            You answered them on{" "}
            {already.completedAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            . Answering again keeps both sets — nothing you have already recorded is written over.
          </p>
        </Callout>
      ) : null}

      {Object.keys(draft).length > 0 ? (
        <Callout className="mt-8" title="We kept what you had filled in">
          <p>Your answers from last time are below. Carry on where you left off.</p>
        </Callout>
      ) : null}

      <div className="mt-8">
        <QuestionnaireForm
          items={version.definition.items}
          values={draft}
          action={saveBaselineAction}
          autosave={autosaveBaselineAction}
          submitLabel="Save my answers"
          cancelHref={skipHref}
        />
      </div>

      <Callout className="mt-10" title="What happens to these answers">
        <p>
          They are stored against the exact set of questions you were asked, so that what you
          record later can sit beside them. Anything you write in your own words is only ever shown
          back to you, and is never included in research.
        </p>
        <p className="mt-2">{version.licenceNote}</p>
      </Callout>
    </Container>
  );
}
