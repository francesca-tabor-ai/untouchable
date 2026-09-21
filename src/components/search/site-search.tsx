import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

/**
 * The one search box, at the top of the home page.
 *
 * A plain GET form pointed at `/`. It works with JavaScript switched off or still on its
 * way down a slow connection, every result set has its own web address that can be shared
 * or kept, and the back button does what people expect. This is the same decision as the
 * story index filters, for the same reasons.
 *
 * **It searches conditions, and only conditions.** It used to offer a row of chips —
 * everything, conditions, medicines, charities, stories — and the front page was the one
 * place on the site asking a frightened person to decide which of five drawers the thing
 * they are looking for lives in. A condition is the word somebody actually arrives with,
 * and the condition page is the doorway to the rest: it carries the stories, the medicines
 * and the charities for that condition already. Medicines, charities and stories each keep
 * their own index, linked from the footer and from every condition page, and the
 * empty-results copy offers all three by name.
 *
 * The scope is stated rather than offered, because there is nothing left to choose. It is
 * deliberately not a chip you can press: a control that does nothing is worse than a label.
 */

export function SiteSearch({ query = "" }: { query?: string }) {
  return (
    <section aria-labelledby="site-search-heading" className="mt-10">
      <h2 id="site-search-heading" className="sr-only">
        Search UnTouchable
      </h2>

      <form action="/" method="get" role="search" className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="site-search-input" className="block text-small font-medium text-ink">
            Search conditions
          </label>
          <Input
            id="site-search-input"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="A condition, like tinnitus or endometriosis"
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

      <p className="mt-5 flex flex-wrap items-center gap-2 text-small text-ink-soft">
        Searching
        <span className="inline-flex items-center rounded-pill border border-forest-800 bg-forest-800 px-3 py-1 font-medium text-white">
          Conditions
        </span>
      </p>
    </section>
  );
}
