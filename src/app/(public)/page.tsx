import Link from "next/link";

import { FigureStrip } from "@/components/home/figure-strip";
import { SearchResults } from "@/components/search/search-results";
import { SiteSearch } from "@/components/search/site-search";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { search } from "@/lib/search";
import { parseSearchParams } from "@/lib/search/schema";

/**
 * The home page.
 *
 * Rendered on the server on every request, with no caching, for the same reason as every
 * other public surface: a retracted story, a withdrawn charity or a medicine an editor has
 * unpublished has to be gone from the front page on the very next request, not on the next
 * revalidation. Brief 5.2, DECISIONS.md D-013.
 *
 * Search results and the grid of people are alternatives rather than a stack. Somebody who
 * has just searched for "tinnitus" is looking for an answer, and repeating the same six
 * faces immediately underneath their results is noise.
 *
 * There is no donation prompt anywhere on this page, and nothing rendered here is capable of
 * producing one. `donationPromptAllowed(surface, user)` in
 * `src/lib/charities/prompt-context.ts` remains the only thing that decides whether a prompt
 * may appear anywhere.
 */
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q, kind } = parseSearchParams(await searchParams);
  const outcome = await search({ q, kind });
  const searching = outcome.query.length > 0;

  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <Container className="py-16 sm:py-24">
          <div className="max-w-[34rem]">
            <p className="text-small font-medium tracking-wide text-clay-700 uppercase">
              Nobody is untouchable
            </p>
            <h1 className="mt-4 text-hero lg:text-[4.5rem]">
              Illness does not care who you are.
            </h1>
            <p className="mt-6 text-lead text-ink-soft">
              Well-known people have stood up and said what happened to them, or to someone they
              love. Their stories are here, told carefully and with sources. So are the charities
              behind them, and a quiet place to keep track of how you are really doing.
            </p>
          </div>

          <div className="max-w-[44rem]">
            <SiteSearch query={outcome.query} kind={kind} />
          </div>

          {!searching ? (
            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/stories">Read the stories</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/about">Why we built this</Link>
              </Button>
            </div>
          ) : null}
        </Container>
      </section>

      {searching ? <SearchResults outcome={outcome} /> : <FigureStrip />}

      <Container className="py-20">
        <h2 className="text-display">Three things, in one place</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card>
            <CardTitle>Stories people chose to share</CardTitle>
            <CardBody>
              Only what someone has said publicly themselves, in their own interview, book or
              statement. Every story carries its sources, and anyone can ask us to correct or
              remove one.
            </CardBody>
          </Card>
          <Card>
            <CardTitle>Charities worth your money</CardTitle>
            <CardBody>
              Every charity here has been checked against the official register by a person. When
              you give, you go straight to the charity. We never hold your money and we never take
              a penny of it.
            </CardBody>
          </Card>
          <Card>
            <CardTitle>A record of how you are doing</CardTitle>
            <CardBody>
              Track symptoms and treatments over time, in a form that is actually useful — to you,
              to the conversation with your GP, and one day to research, but only if you say so.
            </CardBody>
          </Card>
        </div>
      </Container>

      <section className="border-y border-line bg-white">
        <Container reading className="py-20 text-center">
          <h2 className="text-display">Free, and staying free</h2>
          <p className="mt-5 text-ink-soft">
            UnTouchable costs nothing to use and never will. We do not sell health products, we do
            not run advertising, and we take nothing from the money you give to charity. What we
            learn from people who choose to share their data is what pays for it — and independence
            is the only thing that makes any of it worth having.
          </p>
        </Container>
      </section>
    </>
  );
}
