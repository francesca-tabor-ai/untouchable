import Link from "next/link";

import { BODY_SYSTEMS, type BodySystem } from "@/lib/conditions/body-systems";

/**
 * The row of body-system filters, shared by the conditions page and the front page so that
 * the two cannot drift into different words, orders or counts.
 *
 * Every filter is a link, and the choice is a word in the query string, so it works with
 * JavaScript switched off and a filtered page can be bookmarked or sent. Each shows its
 * count, so an empty one is visible before anybody taps it. The chosen one is marked for a
 * screen reader with `aria-current` and for everybody else by a filled pill with heavier
 * type — never by colour alone.
 */
export function BodySystemFilter({
  current,
  counts,
  total,
  hrefFor,
  label = "Filter by body system",
}: {
  current: BodySystem | null;
  counts: Record<BodySystem, number>;
  total: number;
  /** The address for a system, or for everything when given null. */
  hrefFor: (system: BodySystem | null) => string;
  label?: string;
}) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-2">
        <li>
          <FilterLink href={hrefFor(null)} current={current === null} name="All" count={total} />
        </li>
        {BODY_SYSTEMS.map((system) => (
          <li key={system.key}>
            <FilterLink
              href={hrefFor(system.key)}
              current={current === system.key}
              name={system.label}
              count={counts[system.key]}
            />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function FilterLink({
  href,
  current,
  name,
  count,
}: {
  href: string;
  current: boolean;
  name: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={current ? "page" : undefined}
      className={
        current
          ? "inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-forest-800 bg-forest-800 px-4 text-small font-semibold text-white"
          : "inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-line bg-white px-4 text-small font-medium text-ink hover:border-line-strong hover:bg-cream-50"
      }
    >
      {name}
      <span className={current ? "text-cream-200" : "text-muted"}>{count}</span>
    </Link>
  );
}
