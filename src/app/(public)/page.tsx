import Link from "next/link";

import { FigureStrip, parseShown } from "@/components/home/figure-strip";
import { SearchResults } from "@/components/search/search-results";
import { SiteSearch } from "@/components/search/site-search";
import { Button } from "@/components/ui/button";
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
 * has just searched for "tinnitus" is looking for an answer, and repeating the same faces
 * immediately underneath their results is noise.
 *
 * The box searches conditions and nothing else — see `SiteSearch` for why, and D-058.
 * Medicines, charities and stories keep their own indexes, and every condition page leads
 * to all three.
 *
 * The grid shows everybody with a published story, a page at a time. `?people=N` is how far
 * down it somebody has asked to go — see `parseShown`.
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
  const params = await searchParams;
  const { q } = parseSearchParams(params);
  // Conditions only, always. The kind is fixed here rather than read off the URL, so a
  // hand-typed `?kind=stories` cannot widen the front-page search behind the box's back.
  const outcome = await search({ q, kind: "conditions" });
  const searching = outcome.query.length > 0;
  // How far down the grid of people somebody has asked to go. A number in the URL rather
  // than state in the browser, so "View more" works without JavaScript and the page they
  // are looking at is the page they can share or come back to.
  const shown = parseShown(params.people);

  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <Container className="py-16 sm:py-24">
          <div className="max-w-[34rem]">
            <p className="text-small font-medium tracking-wide text-clay-700 uppercase">
              Nobody is untouchable
            </p>
            <h1 className="mt-4 text-hero lg:text-[4.5rem]">Celebrity Health Stories</h1>
            <p className="mt-6 text-lead text-ink-soft">
              UnTouchable tells the health stories of people you know, so that nobody has to feel
              alone in their own.
            </p>
          </div>

          <div className="max-w-[44rem]">
            <SiteSearch query={outcome.query} />
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

      {searching ? <SearchResults outcome={outcome} /> : <FigureStrip shown={shown} />}
    </>
  );
}
