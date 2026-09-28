import type { Metadata } from "next";
import Link from "next/link";

import { AboutNav } from "@/components/about/about-nav";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";

/**
 * How the data is used.
 *
 * A public summary of consent (brief 7.2) and the research rules in AGENTS.md section 1 —
 * rules 6, 7 and 8. The detail a person actually agrees to lives in
 * `src/lib/consent/text.ts` and is shown at the moment they decide; this page must not
 * promise more, or less, than that wording does.
 *
 * It says nothing about downloading your data or deleting your account, because neither is
 * built yet. Add them here when they are.
 */
export const metadata: Metadata = {
  title: "How the data is used",
  description:
    "What we keep when you track your health here, who can see it, and what you can say no to.",
};

export default function EvidencePage() {
  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-hero">How the data is used</h1>

      <div className="mt-6 space-y-5 text-lead text-ink-soft">
        <p>
          You can read everything on this site without an account, and without telling us anything
          about yourself.
        </p>
        <p>
          If you choose to track your health here, you are trusting us with something private.
          This page says what we keep, who can see it, and what you can say no to.
        </p>
      </div>

      <h2 className="mt-12 text-display">Your record is for you</h2>
      <div className="mt-5 space-y-4 text-ink-soft">
        <p>
          We keep the conditions, symptoms and treatments you choose to record, your answers to
          check-ins, and your daily entries. We keep your year of birth, not your date of birth,
          and never your address.
        </p>
        <p>
          Nobody else sees your record with your name on it. Not charities, not researchers, not
          advertisers. A small number of our engineers can reach the database to keep it running,
          and every administrative access is logged.
        </p>
        <p>
          We show you what you recorded. We do not tell you what it means.
        </p>
      </div>

      <h2 className="mt-12 text-display">Five separate choices</h2>
      <p className="mt-5 text-ink-soft">
        We ask about each use of your data on its own. Saying no to one does not affect the others.
      </p>
      <ul className="mt-5 space-y-4 text-ink-soft">
        <li>
          <strong className="text-ink">Keeping your record for you.</strong> Needed for tracking to
          work at all.
        </li>
        <li>
          <strong className="text-ink">Anonymised research.</strong> Optional. Your answers join
          grouped figures about what helps people with your condition.
        </li>
        <li>
          <strong className="text-ink">Studies funded by companies.</strong> Optional, and off
          unless you turn it on. The same grouped figures, used in studies a company has paid for.
        </li>
        <li>
          <strong className="text-ink">Being contacted about studies.</strong> Optional, and off
          unless you turn it on.
        </li>
        <li>
          <strong className="text-ink">News and charity emails.</strong> Optional, and off unless
          you turn it on.
        </li>
      </ul>

      <h2 className="mt-12 text-display">What research looks like</h2>
      <p className="mt-5 text-ink-soft">
        This is why the platform exists: to learn, from many people over time, what actually
        helps. These rules apply to every figure that leaves your own record.
      </p>
      <ul className="mt-5 space-y-4 text-ink-soft">
        <li>
          <strong className="text-ink">Grouped figures only.</strong> For example, the average
          symptom score for people on a particular treatment. Never one person&rsquo;s answers.
        </li>
        <li>
          <strong className="text-ink">Never fewer than ten people.</strong> If a group is smaller
          than ten, its figures are held back, so nobody can be picked out of a small number.
        </li>
        <li>
          <strong className="text-ink">Never your own words.</strong> Notes and anything else you
          write yourself are never included, in any export, for any reason.
        </li>
        <li>
          <strong className="text-ink">Only people who said yes.</strong> Every figure is worked
          out from people whose choice covers that use, at that moment.
        </li>
        <li>
          <strong className="text-ink">Every export is recorded.</strong> Who took it, when, what
          they asked for, and under which choice.
        </li>
      </ul>

      <h2 className="mt-12 text-display">Changing your mind</h2>
      <div className="mt-5 space-y-4 text-ink-soft">
        <p>
          You can change any of these choices at any time in Settings. A change takes effect
          straight away. The next figure we work out, the next export and the next email already
          leave you out — not overnight, not at the end of the month.
        </p>
        <p>
          Grouped figures that were already worked out before you changed your mind are not
          recalled. They were never about you alone, and they never had your name on them.
        </p>
      </div>

      <Callout tone="care" className="mt-12" title="Charities and donations">
        <p>
          The causes you follow and any donations you note are yours. Following a charity for a
          condition can say something about your health, so we never share it with the charity or
          anyone else. When you press Donate, we count the click against the charity. We do not
          record who you are.
        </p>
      </Callout>

      <p className="mt-10 text-ink-soft">
        <Link
          href="/settings/consent"
          className="font-medium text-forest-600 underline underline-offset-2"
        >
          View and change your data choices
        </Link>
      </p>

      <AboutNav current="/about/evidence" />
    </Container>
  );
}
