import Link from "next/link";

import { Container } from "@/components/ui/container";
import type { SearchOutcome, SearchResult } from "@/lib/search";

/**
 * Search results, grouped by what kind of thing each one is.
 *
 * The groups are labelled and headed rather than colour-coded, so the grouping survives a
 * screen reader, greyscale and a phone in the sun. Every result is a link to the page it
 * belongs to.
 *
 * These are deliberately our own plain rows rather than the charity or medicine cards from
 * those features. Those cards carry things that belong on their own pages — in the charity
 * card's case, the giving hand-off — and none of it belongs on the front page of a health
 * platform. Nothing in this file can render a donation prompt, because there is nothing in
 * it that could.
 */
export function SearchResults({ outcome }: { outcome: SearchOutcome }) {
  return (
    <section aria-labelledby="search-results-heading" className="border-b border-line bg-white">
      <Container className="py-12 sm:py-16">
        <div aria-live="polite">
          <h2 id="search-results-heading" className="text-display">
            {describe(outcome)}
          </h2>
        </div>

        {outcome.total === 0 ? (
          <p className="mt-5 max-w-[34rem] text-ink-soft">
            Try a different word, or a shorter one. You can also browse{" "}
            <Link href="/conditions" className="text-forest-600 underline underline-offset-4">
              conditions
            </Link>
            ,{" "}
            <Link href="/medicines" className="text-forest-600 underline underline-offset-4">
              medicines
            </Link>
            ,{" "}
            <Link href="/charities" className="text-forest-600 underline underline-offset-4">
              charities
            </Link>{" "}
            or{" "}
            <Link href="/stories" className="text-forest-600 underline underline-offset-4">
              stories
            </Link>
            .
          </p>
        ) : (
          <div className="mt-10 space-y-12">
            {outcome.groups.map((group) => (
              <section key={group.kind} aria-labelledby={`search-group-${group.kind}`}>
                <h3 id={`search-group-${group.kind}`} className="text-title">
                  {group.label}
                </h3>
                <p className="mt-1 text-small text-muted">
                  {group.results.length}{" "}
                  {group.results.length === 1 ? "result" : "results"}
                </p>

                <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.results.map((result) => (
                    <li key={`${group.kind}-${result.id}`}>
                      <ResultRow result={result} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

function ResultRow({ result }: { result: SearchResult }) {
  return (
    <Link
      href={result.href}
      className="flex h-full flex-col rounded-card border border-line bg-cream-50 p-5 transition-shadow duration-[--duration-calm] ease-[--ease-out-soft] hover:shadow-soft"
    >
      <span className="font-display text-title text-ink">{result.title}</span>

      {/* A content note travels with the thing it warns about, on every surface it appears
          on. Meeting a story about suicide in a list with no warning is the harm. */}
      {result.needsContentNote ? (
        <span className="mt-2 text-legal text-clay-700">
          Content note — this covers a subject some people would rather choose when to read.
        </span>
      ) : null}

      <span className="mt-2 line-clamp-3 text-small text-ink-soft">{result.description}</span>
    </Link>
  );
}

function describe({ query, total }: SearchOutcome): string {
  if (total === 0) return `Nothing matches “${query}” yet`;
  return `${total} ${total === 1 ? "result" : "results"} for “${query}”`;
}
