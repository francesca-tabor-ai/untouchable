import type { Metadata } from "next";
import Link from "next/link";

import { AboutNav } from "@/components/about/about-nav";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";

/**
 * Why we exist.
 *
 * Since PL-55 took the explanatory blocks off the front page, this is where somebody who has
 * never heard of us finds out what the site is. Every promise on it is kept somewhere a test
 * can see — AGENTS.md section 1 — and this page describes those guarantees; it is not the
 * mechanism for any of them. If one of them changes, this copy has to change with it.
 *
 * It reads no data and renders no donation prompt.
 */
export const metadata: Metadata = {
  title: "Why we exist",
  description:
    "UnTouchable brings together the health stories people you know have chosen to tell, and puts them next to the help that exists.",
};

export default function AboutPage() {
  return (
    <Container reading className="py-12 sm:py-16">
      <p className="text-small font-medium tracking-wide text-clay-700 uppercase">
        Nobody is untouchable. Nobody is alone.
      </p>
      <h1 className="mt-4 text-hero">Why we exist</h1>

      <div className="mt-6 space-y-5 text-lead text-ink-soft">
        <p>
          When you are ill, it can feel as if it is only happening to you. It is not. People you
          have heard of have lived with the same conditions, and many of them have chosen to talk
          about it.
        </p>
        <p>
          UnTouchable brings what they said together in one place, with a link to where they said
          it, and puts it next to the help that exists.
        </p>
      </div>

      <h2 className="mt-12 text-display">What is here</h2>
      <ul className="mt-5 space-y-4 text-ink-soft">
        <li>
          <strong className="text-ink">Stories.</strong> Health stories that people have told
          publicly themselves — in an interview, a book, a podcast or a statement. We write them in
          our own words and link to the original.
        </li>
        <li>
          <strong className="text-ink">Conditions.</strong> A page for each condition, with the
          people who have spoken about it, the charities working on it, and where to get help.
        </li>
        <li>
          <strong className="text-ink">Medicines.</strong> Information from the NHS, the British
          National Formulary and the electronic Medicines Compendium. Never from a company that
          sells treatment.
        </li>
        <li>
          <strong className="text-ink">Charities.</strong> UK charities we have checked against the
          official charity register. If you choose to give, you give on the charity&rsquo;s own
          page.
        </li>
        <li>
          <strong className="text-ink">Your health.</strong> If you make an account, you can keep a
          record of your symptoms and treatments, for yourself, and take it to your GP.
        </li>
      </ul>

      <h2 className="mt-12 text-display">What we will not do</h2>
      <ul className="mt-5 space-y-4 text-ink-soft">
        <li>
          <strong className="text-ink">We will not give medical advice.</strong> We show you what
          you have recorded. We do not tell you what it means, and we never say a treatment worked.
          Your GP and your clinical team are the people to ask.
        </li>
        <li>
          <strong className="text-ink">We will not guess about anyone.</strong> We publish only
          what a person chose to say about their own health, or what their family said publicly.
          No rumours, no gossip, nothing about a child&rsquo;s health.{" "}
          <Link href="/about/editorial" className="underline underline-offset-2">
            How we write stories
          </Link>
          .
        </li>
        <li>
          <strong className="text-ink">We will not sell you anything.</strong> No advertising, no
          paid placements, no health products. Nobody paid to be on this site.
        </li>
        <li>
          <strong className="text-ink">We will not take your donation.</strong> Money goes to the
          charity, not to us. When you press Donate, we count which charity and what kind of page
          you came from. We do not record who you are.
        </li>
        <li>
          <strong className="text-ink">We will not ask for money when things are hard.</strong>{" "}
          There is no request to donate while you are signing up, on any page that points you to
          urgent help, or after a check-in where your answers suggested you might need it.
        </li>
        <li>
          <strong className="text-ink">We will not follow you around.</strong> Once you are signed
          in, there are no third-party analytics or advertising trackers on any page.
        </li>
      </ul>

      <h2 className="mt-12 text-display">How it is paid for</h2>
      <div className="mt-5 space-y-4 text-ink-soft">
        <p>It is free to read the stories, and free to keep your own health record here.</p>
        <p>
          Later, we plan to be paid by organisations that want better evidence about what helps
          people — researchers, and companies that run medical studies. What they would get is
          grouped figures from people who said yes. Never your name, never your email address,
          never anything you wrote in your own words.{" "}
          <Link href="/about/evidence" className="underline underline-offset-2">
            How the data is used
          </Link>
          .
        </p>
        <p>
          We keep the stories and the money apart. Nobody can pay to be written about, pay to be
          left out, or pay for a treatment to look better than it is.
        </p>
      </div>

      <Callout className="mt-12">
        <p>
          The people whose stories are here are not connected to UnTouchable and have not endorsed
          it. We tell their stories because they chose to tell them first.
        </p>
      </Callout>

      <AboutNav current="/about" />
    </Container>
  );
}
