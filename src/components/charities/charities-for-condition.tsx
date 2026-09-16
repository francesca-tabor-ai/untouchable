import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/guards";
import { donationPromptAllowed } from "@/lib/charities/prompt-context";
import { SUPPORT_COPY, type CharityBlockVariant } from "@/lib/charities/prompt-policy";
import { charitiesForCondition } from "@/lib/charities/queries";

import { CharityCard } from "./charity-card";
import { CharitySupportList } from "./charity-support-list";
import { DonateLink } from "./donate-link";

/**
 * Verified charities tagged with one condition, for a condition page.
 *
 * Contract with the stories team. Three promises:
 *
 * - Only charities an editor has verified against the official register ever appear. That is
 *   enforced in the query, not here.
 * - It never breaks the host page. No charities, or a database that is having a bad day,
 *   means nothing at all — not an error boundary on a page somebody came to read.
 * - `variant="support"` contains no donation affordance of any kind.
 *
 * `default` brings giving to someone who came to read about a condition, so it is a prompt in
 * the sense of brief 6.4 and asks the no-pressure policy before it renders.
 *
 * `support` is for a sensitive-topic condition page — one carrying a content note and support
 * contacts. It shows the same verified charities as places to get help, with no Donate button
 * and no giving copy. See DECISIONS.md D-028.
 */
export async function CharitiesForCondition({
  conditionId,
  variant = "default",
}: {
  conditionId: string;
  variant?: CharityBlockVariant;
}) {
  let charities;
  try {
    // The no-pressure gate, unchanged, on the variant that actually asks for something. A
    // support block carries no donation prompt, so the gate has nothing here to suppress —
    // and suppressing the block itself would take the helpline away from the person the rule
    // exists to protect. D-028.
    if (variant === "default") {
      const user = await getCurrentUser();
      if (!(await donationPromptAllowed("condition_page", user))) return null;
    }
    charities = await charitiesForCondition(conditionId);
  } catch {
    return null;
  }

  if (charities.length === 0) return null;

  if (variant === "support") {
    return (
      <section aria-labelledby="charities-for-condition" className="mt-14">
        <h2 id="charities-for-condition" className="text-display">
          {SUPPORT_COPY.heading}
        </h2>
        <p className="text-ink-soft mt-3 max-w-[42rem]">{SUPPORT_COPY.conditionIntro}</p>
        <CharitySupportList charities={charities} headingLevel="h3" />
        <p className="text-small text-muted mt-8 max-w-[42rem]">{SUPPORT_COPY.clinicalReminder}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="charities-for-condition" className="mt-14">
      <h2 id="charities-for-condition" className="text-display">
        Charities working on this
      </h2>
      <p className="text-ink-soft mt-3 max-w-[42rem]">
        Each of these has been checked against the official register by one of our editors. If you
        give, you give on their own website — we never handle the money and we take none of it.
      </p>

      <ul className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-2">
        {charities.map((charity) => (
          <li key={charity.id} className="flex">
            <div className="flex w-full flex-col gap-4">
              <CharityCard charity={charity} headingLevel="h3" />
              <DonateLink charity={charity} origin="condition" size="sm" showHint={false} />
            </div>
          </li>
        ))}
      </ul>

      <p className="text-small mt-8">
        <Link href="/charities" className="text-forest-600 underline underline-offset-4">
          See all the charities we list
        </Link>
      </p>
    </section>
  );
}
