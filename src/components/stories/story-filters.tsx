import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import type { ConditionSummary } from "@/lib/stories/queries";

/**
 * Search and filter for the story index.
 *
 * A plain GET form, on purpose. It works with no JavaScript, every result has its own web
 * address that can be shared or saved, and the back button does what people expect. The
 * condition filter is a list of links rather than a select, because on a phone tapping a
 * word beats opening a picker.
 */
export function StoryFilters({
  conditions,
  activeCondition,
  query,
}: {
  conditions: ConditionSummary[];
  activeCondition?: string;
  query?: string;
}) {
  return (
    <section aria-labelledby="filters-heading" className="mt-8">
      <h2 id="filters-heading" className="sr-only">
        Find a story
      </h2>

      <form action="/stories" method="get" className="flex flex-col gap-3 sm:flex-row">
        {activeCondition ? (
          <input type="hidden" name="condition" value={activeCondition} />
        ) : null}

        <div className="flex-1">
          <label htmlFor="story-search" className="block text-small font-medium text-ink">
            Search by name or condition
          </label>
          <Input
            id="story-search"
            type="search"
            name="q"
            defaultValue={query ?? ""}
            placeholder="A name, or a condition"
            className="mt-2"
          />
        </div>

        <div className="flex items-end gap-2">
          <Button type="submit">Search</Button>
          {query ? (
            <Button asChild variant="secondary">
              <Link href={activeCondition ? `/stories?condition=${activeCondition}` : "/stories"}>
                Clear
              </Link>
            </Button>
          ) : null}
        </div>
      </form>

      <nav aria-label="Filter by condition" className="mt-6">
        <ul className="flex flex-wrap gap-2">
          <li>
            <FilterLink
              href={query ? `/stories?q=${encodeURIComponent(query)}` : "/stories"}
              active={!activeCondition}
            >
              All conditions
            </FilterLink>
          </li>
          {conditions.map((condition) => {
            const params = new URLSearchParams({ condition: condition.slug });
            if (query) params.set("q", query);
            return (
              <li key={condition.slug}>
                <FilterLink
                  href={`/stories?${params.toString()}`}
                  active={activeCondition === condition.slug}
                >
                  {condition.name}
                </FilterLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </section>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={[
        "inline-flex min-h-11 items-center rounded-pill border px-4 text-small",
        active
          ? "border-forest-800 bg-forest-800 font-medium text-white"
          : "border-line bg-white text-ink-soft hover:border-line-strong hover:text-forest-700",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
