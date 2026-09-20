import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Food Advisor" };

/**
 * Placeholder. The Food Advisor is in the navigation before it is built, so this page exists
 * to say that plainly rather than to 404 at somebody who followed a link we put there.
 *
 * Whatever is built here records what a person eats. It does not read a log back to them as a
 * cause, a ranking or a recommendation, and it never says a food helped or harmed — AGENTS.md
 * rule 9. The name in the menu is an editorial decision recorded in DECISIONS.md; the copy on
 * the page is not allowed to make the promise the name implies.
 */
export default async function FoodPage() {
  await requireAdult("/food");

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Food Advisor</h1>
      <p className="mt-4 text-lead text-ink-soft">This part of UnTouchable is not built yet.</p>

      <Callout tone="neutral" className="mt-8" title="What it will do">
        <p>
          It will let you keep a record of what you eat alongside the rest of what you track, so it
          is there when you want to look back at it or show it to your GP.
        </p>
        <p className="mt-3">
          It will not tell you what to eat, and it will not tell you that a food helped or harmed
          you. UnTouchable records and shows information. Your GP and your clinical team are the
          people who work out what it means.
        </p>
      </Callout>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/log">Go to today&rsquo;s log</Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/check-ins">Your check-ins</Link>
        </Button>
      </div>
    </Container>
  );
}
