import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { SEARCH_KINDS, type SearchKind } from "@/lib/search";

/**
 * The one search box, at the top of the home page.
 *
 * A plain GET form pointed at `/`. It works with JavaScript switched off or still on its
 * way down a slow connection, every result set has its own web address that can be shared
 * or kept, and the back button does what people expect. This is the same decision as the
 * story index filters, for the same reasons.
 *
 * The kind filter is a row of links rather than a `<select>`, because on a phone tapping a
 * word beats opening a picker — and because links keep working without a script too.
 */

const CHIP_LABELS: Record<SearchKind, string> = {
  all: "Everything",
  conditions: "Conditions",
  medicines: "Medicines",
  charities: "Charities",
  stories: "Stories",
};

function hrefFor(kind: SearchKind, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (kind !== "all") params.set("kind", kind);
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export function SiteSearch({ query = "", kind = "all" }: { query?: string; kind?: SearchKind }) {
  return (
    <section aria-labelledby="site-search-heading" className="mt-10">
      <h2 id="site-search-heading" className="sr-only">
        Search UnTouchable
      </h2>

      <form action="/" method="get" role="search" className="flex flex-col gap-3 sm:flex-row">
        {/* Keeps the chosen filter when the form is submitted, with no script involved. */}
        {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}

        <div className="flex-1">
          <label htmlFor="site-search-input" className="block text-small font-medium text-ink">
            Search conditions, medicines, charities and stories
          </label>
          <Input
            id="site-search-input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="A condition, a medicine, a charity, or a name"
            className="mt-2"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit">Search</Button>
          {query ? (
            <Button asChild variant="secondary">
              <Link href="/">Clear</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <nav aria-label="Narrow the search" className="mt-5">
        <ul className="flex flex-wrap gap-2">
          {SEARCH_KINDS.map((option) => (
            <li key={option}>
              <Link
                href={hrefFor(option, query)}
                aria-current={option === kind ? "true" : undefined}
                className={[
                  "inline-flex min-h-11 items-center rounded-pill border px-4 text-small",
                  option === kind
                    ? "border-forest-800 bg-forest-800 font-medium text-white"
                    : "border-line bg-white text-ink-soft hover:border-line-strong hover:text-forest-700",
                ].join(" ")}
              >
                {CHIP_LABELS[option]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
