import Link from "next/link";

import { Card, CardTitle } from "@/components/ui/card";
import type { PublicCharity } from "@/lib/charities/queries";

import { CharityIdentity } from "./charity-identity";

/**
 * One charity in a list. The whole card is not a link — the name is — so the description
 * stays selectable and the tab order stays one stop per charity.
 */
export function CharityCard({
  charity,
  headingLevel = "h3",
}: {
  charity: PublicCharity;
  /** Set so the card sits at the right depth in the page's heading outline. */
  headingLevel?: "h2" | "h3" | "h4";
}) {
  return (
    <Card interactive className="flex h-full flex-col">
      <CardTitle as={headingLevel}>
        <Link
          href={`/charities/${charity.slug}`}
          className="text-ink hover:text-forest-700 underline-offset-4 hover:underline"
        >
          <CharityIdentity charity={charity} />
        </Link>
      </CardTitle>
      <p className="text-ink-soft mt-3">{charity.description}</p>
      <p className="text-legal text-muted mt-4">Registered charity {charity.registeredNumber}</p>
    </Card>
  );
}
