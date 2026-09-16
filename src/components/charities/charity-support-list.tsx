import Link from "next/link";

import type { PublicCharity } from "@/lib/charities/queries";
import { SUPPORT_COPY } from "@/lib/charities/prompt-policy";

import { CharityIdentity } from "./charity-identity";

/**
 * Charities as signposting, not as a giving opportunity.
 *
 * Used on surfaces that carry a content note and support contacts. There is deliberately no
 * Donate button, no hand-off link and no giving copy anywhere in here — the visible action is
 * the charity's own website, which is where the helpline is.
 *
 * The charity's name still links to its listing on this site. Someone who goes there has
 * navigated to it deliberately, which is the line drawn in DECISIONS.md D-023.
 */
export function CharitySupportList({
  charities,
  headingLevel: Heading = "h3",
}: {
  charities: PublicCharity[];
  headingLevel?: "h3" | "h4";
}) {
  return (
    <ul className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-2">
      {charities.map((charity) => (
        <li key={charity.id} className="rounded-card border-line border bg-white p-6">
          <Heading className="text-title">
            <Link
              href={`/charities/${charity.slug}`}
              className="text-ink hover:text-forest-700 underline-offset-4 hover:underline"
            >
              <CharityIdentity charity={charity} />
            </Link>
          </Heading>
          <p className="text-ink-soft mt-3">{charity.description}</p>
          <p className="text-small mt-5">
            <a
              href={charity.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest-600 underline underline-offset-4"
            >
              {SUPPORT_COPY.websiteLabel}
              <span className="sr-only"> for {charity.name}</span>
            </a>{" "}
            <span className="text-muted">({SUPPORT_COPY.newTab})</span>
          </p>
          <p className="text-legal text-muted mt-4">
            Registered charity {charity.registeredNumber}
          </p>
        </li>
      ))}
    </ul>
  );
}
