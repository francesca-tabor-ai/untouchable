import type { Metadata } from "next";
import Link from "next/link";

import { AboutNav } from "@/components/about/about-nav";
import { Container } from "@/components/ui/container";

/**
 * How we write stories.
 *
 * The editorial rules in AGENTS.md section 1 and brief 5.2, in the words of somebody who is
 * not an engineer. Rules 2, 3, 13, 15, 16 and 17 in particular are summarised here — the
 * exceptions for families and friends are stated narrowly on purpose, because a reader
 * should be able to hold us to them, and a broader description would be a broader promise.
 */
export const metadata: Metadata = {
  title: "How we write stories",
  description:
    "Whose stories we tell, where they come from, who checks them, and what we leave out.",
};

export default function EditorialPage() {
  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-hero">How we write stories</h1>

      <div className="mt-6 space-y-5 text-lead text-ink-soft">
        <p>
          Every story here is about a real person, and it is about their health. That is private
          unless they decide otherwise. These are the rules we follow so that we only ever repeat
          what someone chose to say.
        </p>
      </div>

      <h2 className="mt-12 text-display">Whose stories we tell</h2>
      <div className="mt-5 space-y-4 text-ink-soft">
        <p>
          <strong className="text-ink">People telling their own story.</strong> Most stories come
          from a person talking publicly about their own health — in an interview, on their own
          social media, in a book, on a podcast or in a statement.
        </p>
        <p>
          <strong className="text-ink">Families, after a death.</strong> A family or estate can
          share someone&rsquo;s story publicly after they have died.
        </p>
        <p>
          <strong className="text-ink">Families, when someone can no longer speak.</strong> Some
          conditions take away the ability to tell your own story — advanced dementia, aphasia, a
          severe brain injury. We will tell that story only if the family made a deliberate public
          statement in their own words, meant to be public. We write from that statement, not
          from news coverage of it, and we add nothing about how the person is now.
        </p>
        <p>
          <strong className="text-ink">Someone close, after a death.</strong> A friend who was
          there may tell their own story of it, once considerable time has passed. We use only the
          name they use, add nothing to what they said, and say nothing about anyone living. We
          are stricter still when the condition is one that has been used against people.
        </p>
        <p>
          <strong className="text-ink">Never a child&rsquo;s health.</strong> We do not publish
          anything about the health of a living child, from anyone. An adult looking back on their
          own childhood is different: that is their story, and theirs to tell.
        </p>
      </div>

      <h2 className="mt-12 text-display">Where a story comes from</h2>
      <ul className="mt-5 space-y-4 text-ink-soft">
        <li>
          <strong className="text-ink">At least one source.</strong> Every story links to where the
          person said it, with the title, the publisher and the date. A story without a source
          cannot be published. The system will not allow it.
        </li>
        <li>
          <strong className="text-ink">In our own words.</strong> We write a summary rather than
          copying. A quote, if there is one, is short — 25 words at most — and says who said it and
          where.
        </li>
        <li>
          <strong className="text-ink">Two editors.</strong> One editor writes the story. A second,
          different editor checks it against the sources before it goes live. We record who did
          each step, and when.
        </li>
        <li>
          <strong className="text-ink">Looked at again.</strong> Each story is flagged for another
          check a year after it was published.
        </li>
      </ul>

      <h2 className="mt-12 text-display">What we leave out</h2>
      <ul className="mt-5 space-y-4 text-ink-soft">
        <li>Rumours, guesses and anything a person has not said themselves.</li>
        <li>
          Doses and how much of something someone took. A story can say a person was prescribed a
          medicine, or came off it. It will never read as instructions.
        </li>
        <li>
          Details of how someone harmed themselves. Stories about suicide, self-harm or eating
          disorders follow the Samaritans&rsquo; guidelines for writing about them. They have a
          note at the top so you can choose whether to read on, and places to get support at the
          bottom.
        </li>
        <li>
          Photographs we are not allowed to use. We show a photograph only when it has a licence
          that lets us. Otherwise you will see the person&rsquo;s initials.
        </li>
        <li>Any suggestion that the person supports UnTouchable. They have not been asked to.</li>
      </ul>

      <h2 className="mt-12 text-display">If we get something wrong</h2>
      <div className="mt-5 space-y-4 text-ink-soft">
        <p>
          Anyone can ask us to correct a story or take it down — the person it is about, someone
          who represents them, or a reader. You do not need an account.
        </p>
        <p>
          When we take a story down, it goes from every page on the site at once: the story
          itself, the condition pages, search, and the lists of related stories.
        </p>
        <p>
          <Link
            href="/corrections"
            className="font-medium text-forest-600 underline underline-offset-2"
          >
            Request a correction or removal
          </Link>
        </p>
      </div>

      <AboutNav current="/about/editorial" />
    </Container>
  );
}
