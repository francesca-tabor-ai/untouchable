import type { Metadata } from "next";
import Link from "next/link";

import { CharityCard } from "@/components/charities/charity-card";
import { DonateLink } from "@/components/charities/donate-link";
import { Container } from "@/components/ui/container";
import { charityConditionFilters, listPublicCharities } from "@/lib/charities/queries";

// Always rendered per request: these pages read the database, and some of them read the
// session. Nothing here may be cached into a static page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Charities",
  description:
    "UK charities we have checked against the official register, and the conditions they work on.",
};

export default async function CharitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ condition?: string }>;
}) {
  const { condition } = await searchParams;
  const [conditions, charities] = await Promise.all([
    charityConditionFilters(),
    listPublicCharities({ conditionSlug: condition }),
  ]);

  const selected = conditions.find((item) => item.slug === condition) ?? null;

  return (
    <>
      <section className="border-line bg-cream-50 border-b">
        <Container className="py-14 sm:py-20">
          <h1 className="text-hero">Charities</h1>
          <p className="text-lead text-ink-soft mt-5 max-w-[42rem]">
            Every charity here has been checked against the official register by one of our editors,
            who recorded their name and the date they checked. When you give, you give on the
            charity&rsquo;s own website. We never hold your money and we take none of it.
          </p>
        </Container>
      </section>

      <Container className="py-14">
        <nav aria-label="Filter by condition">
          <h2 className="text-small text-ink font-semibold">Filter by condition</h2>
          <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
            <li>
              <FilterLink href="/charities" active={selected === null}>
                All charities
              </FilterLink>
            </li>
            {conditions.map((item) => (
              <li key={item.id}>
                <FilterLink
                  href={`/charities?condition=${item.slug}`}
                  active={selected?.slug === item.slug}
                >
                  {item.name} ({item.charityCount})
                </FilterLink>
              </li>
            ))}
          </ul>
        </nav>

        <h2 className="text-display mt-12">
          {selected
            ? `Charities working on ${selected.name.toLowerCase()}`
            : "All the charities we list"}
        </h2>
        <p className="text-small text-muted mt-3">
          {charities.length === 1 ? "1 charity" : `${charities.length} charities`}
          {selected ? ` tagged with ${selected.name.toLowerCase()}` : ""}.
        </p>

        {charities.length === 0 ? (
          <p className="text-ink-soft mt-8 max-w-[38rem]">
            There is nothing listed here yet. Our editors add a charity only once they have checked
            it against the official register, so this page fills up slowly and on purpose.{" "}
            <Link href="/charities" className="text-forest-600 underline underline-offset-4">
              See all the charities we list
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {charities.map((charity) => (
              <li key={charity.id} className="flex flex-col gap-4">
                <CharityCard charity={charity} headingLevel="h3" />
                <DonateLink charity={charity} origin="charity" size="sm" showHint={false} />
              </li>
            ))}
          </ul>
        )}
      </Container>
    </>
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
      aria-current={active ? "page" : undefined}
      className={[
        "rounded-pill text-small inline-flex min-h-11 items-center border px-4",
        active
          ? "border-forest-800 bg-forest-800 text-white"
          : "border-line text-ink-soft hover:border-line-strong hover:text-forest-700 bg-white",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
