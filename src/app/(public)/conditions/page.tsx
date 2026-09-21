import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import {
  BODY_SYSTEMS,
  countBySystem,
  filterBySystem,
  parseSystem,
} from "@/lib/conditions/body-systems";
import { listConditions } from "@/lib/stories/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conditions",
  description:
    "The conditions people have spoken about here, what they are in plain English, and the stories behind them.",
};

/**
 * Every condition, with a row of filters by body system.
 *
 * The filter is a set of links, and the choice is a word in the query string, so it works
 * with JavaScript switched off and a filtered list can be bookmarked or sent to somebody.
 * Anything in the URL that is not a system is treated as no filter at all — a mistyped
 * address is not a reason to show an error to somebody who is already worried.
 *
 * Each filter shows how many conditions it holds, so an empty one is visible before
 * anybody taps it. Some conditions are in no system on purpose; they are always on the
 * full list. See `src/lib/conditions/body-systems.ts`.
 */
export default async function ConditionsPage({
  searchParams,
}: {
  searchParams: Promise<{ system?: string | string[] }>;
}) {
  const everything = await listConditions();
  const system = parseSystem((await searchParams).system);
  const conditions = filterBySystem(everything, system);
  const counts = countBySystem(everything);
  const selected = BODY_SYSTEMS.find((entry) => entry.key === system) ?? null;

  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <Container className="py-12 sm:py-16">
          <div className="max-w-[38rem]">
            <h1 className="text-hero">Conditions</h1>
            <p className="mt-5 text-lead text-ink-soft">
              A diagnosis can feel like it has only ever happened to you. It has not. Here is what
              each condition is, in plain English, and the people who have talked about living
              with it.
            </p>
          </div>
        </Container>
      </section>

      <Container className="py-12">
        <nav aria-label="Filter by body system">
          <ul className="flex flex-wrap gap-2">
            <li>
              <FilterLink
                href="/conditions"
                current={system === null}
                label="All"
                count={everything.length}
              />
            </li>
            {BODY_SYSTEMS.map((entry) => (
              <li key={entry.key}>
                <FilterLink
                  href={`/conditions?system=${entry.key}`}
                  current={system === entry.key}
                  label={entry.label}
                  count={counts[entry.key]}
                />
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-8">
          <h2 className={selected ? "text-title" : "sr-only"}>
            {selected ? `${selected.label} system` : "All conditions"}
          </h2>
          {selected ? <p className="mt-2 text-ink-soft">{selected.about}</p> : null}
        </div>

        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {conditions.map((condition) => (
            <li key={condition.slug}>
              <Card interactive className="h-full">
                <CardTitle>
                  <Link
                    href={`/conditions/${condition.slug}`}
                    className="text-ink hover:text-forest-700 hover:underline underline-offset-4"
                  >
                    {condition.name}
                  </Link>
                </CardTitle>
                <CardBody className="line-clamp-4">{condition.summary}</CardBody>
                <p className="mt-5">
                  <Badge tone="forest">
                    {condition.storyCount}{" "}
                    {condition.storyCount === 1 ? "story" : "stories"}
                  </Badge>
                </p>
              </Card>
            </li>
          ))}
        </ul>

        {conditions.length === 0 ? (
          <p className="mt-6 text-ink-soft">
            {selected ? (
              <>
                Nothing is filed under {selected.label.toLowerCase()} yet.{" "}
                <Link href="/conditions" className="text-forest-600 underline underline-offset-4">
                  See every condition
                </Link>
                .
              </>
            ) : (
              "There is nothing here yet."
            )}
          </p>
        ) : null}
      </Container>
    </>
  );
}

/**
 * One filter. The chosen one is marked for a screen reader with `aria-current` and for
 * everybody else by a filled background — never by colour alone, because the filled pill
 * also changes weight and border.
 */
function FilterLink({
  href,
  current,
  label,
  count,
}: {
  href: string;
  current: boolean;
  label: string;
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
      {label}
      <span className={current ? "text-cream-200" : "text-muted"}>{count}</span>
    </Link>
  );
}
