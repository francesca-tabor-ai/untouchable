import type { Metadata } from "next";

import { Container } from "@/components/ui/container";
import { listStoriesForCorrectionForm } from "@/lib/stories/queries";

import { CorrectionForm } from "./correction-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Request a correction or removal",
  description:
    "Ask us to correct or take down a story. Open to anyone: the person in the story, someone representing them, or a reader.",
};

export default async function CorrectionsPage() {
  const stories = await listStoriesForCorrectionForm();

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-hero">Request a correction or removal</h1>

      <div className="mt-6 space-y-5 text-lead text-ink-soft">
        <p>
          If something here is wrong, tell us and we will fix it. If you are the person a story is
          about, or you represent them, and you would rather it was not here at all, ask us to
          take it down.
        </p>
        <p>
          You do not need an account and you do not need a reason we would agree with. Anyone can
          use this form.
        </p>
      </div>

      <h2 className="mt-12 text-display">What happens next</h2>
      <ol className="mt-5 space-y-4 text-ink-soft">
        <li>
          <strong className="text-ink">An editor reads it.</strong> Every request becomes a task
          for the editorial team. Nothing is decided automatically.
        </li>
        <li>
          <strong className="text-ink">We check it against the sources.</strong> We only publish
          what someone has said publicly themselves, so a correction usually means going back to
          the original interview, book or statement.
        </li>
        <li>
          <strong className="text-ink">We write back.</strong> Whether we change the story or not,
          we tell you what we decided.
        </li>
      </ol>

      {stories.length > 0 ? (
        <CorrectionForm stories={stories} />
      ) : (
        <p className="mt-10 text-ink-soft">
          There are no published stories at the moment, so there is nothing to correct. If you
          think that is wrong, please get in touch.
        </p>
      )}
    </Container>
  );
}
