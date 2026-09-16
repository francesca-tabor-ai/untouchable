import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/guards";
import { donationPromptAllowed } from "@/lib/charities/prompt-context";
import { SUPPORT_COPY, type CharityBlockVariant } from "@/lib/charities/prompt-policy";
import { charitiesForStory } from "@/lib/charities/queries";

import { CharityIdentity } from "./charity-identity";
import { CharitySupportList } from "./charity-support-list";
import { DonateLink } from "./donate-link";

/**
 * Charities linked to a story.
 *
 * Contract with the stories team. The rule that matters here is an editorial one, not a
 * technical one:
 *
 * **A claim that a named person supports a charity is a claim about that person.** It is
 * publishable only with a source, like every other fact in a story (brief 5.3, principle 1).
 * A `StoryCharity` row with a source is shown as their support, with the source cited. A row
 * with no source is shown in a separate list with no attribution to anybody — it is just a
 * charity that works on this condition. The two lists are never merged, and the wording of
 * the second never mentions the person.
 *
 * `variant="support"` is for a sensitive-topic story — one carrying a content note and
 * support contacts. It drops the giving frame entirely: no Donate button, no giving copy,
 * and no attribution to anyone. What somebody reading a story about suicide needs from this
 * block is a helpline, not a fact about whose cause it is. Making no claim about the person
 * also satisfies the sourcing rule by construction. See DECISIONS.md D-028.
 *
 * Like `CharitiesForCondition`, this never breaks the host page.
 */
export async function StoryCharities({
  storyId,
  variant = "default",
}: {
  storyId: string;
  variant?: CharityBlockVariant;
}) {
  let links;
  try {
    // Brief 6.4: the default block brings giving to someone reading a story, so it asks
    // first. A support block has no donation prompt to suppress. D-028.
    if (variant === "default") {
      const user = await getCurrentUser();
      if (!(await donationPromptAllowed("story_page", user))) return null;
    }
    links = await charitiesForStory(storyId);
  } catch {
    return null;
  }

  if (links.length === 0) return null;

  if (variant === "support") {
    return (
      <section aria-labelledby="story-charities" className="mt-14">
        <h2 id="story-charities" className="text-display">
          {SUPPORT_COPY.heading}
        </h2>
        <p className="text-ink-soft mt-3 max-w-[42rem]">{SUPPORT_COPY.storyIntro}</p>
        <CharitySupportList charities={links.map((link) => link.charity)} headingLevel="h3" />
        <p className="text-small text-muted mt-8 max-w-[42rem]">{SUPPORT_COPY.clinicalReminder}</p>
      </section>
    );
  }

  // flatMap rather than filter so the source is non-null in the type, not just in fact.
  const sourced = links.flatMap((link) =>
    link.source ? [{ charity: link.charity, source: link.source }] : [],
  );
  const unsourced = links.filter((link) => link.source === null);

  return (
    <section aria-labelledby="story-charities" className="mt-14">
      <h2 id="story-charities" className="text-display">
        Where to give
      </h2>

      {sourced.length > 0 ? (
        <>
          <h3 className="text-title mt-8">Charities they have publicly supported</h3>
          <ul className="mt-5 list-none space-y-6 p-0">
            {sourced.map(({ charity, source }) => (
              <li key={charity.id} className="rounded-card border-line border bg-white p-6">
                <p className="text-title">
                  <Link
                    href={`/charities/${charity.slug}`}
                    className="text-ink hover:text-forest-700 underline-offset-4 hover:underline"
                  >
                    <CharityIdentity charity={charity} />
                  </Link>
                </p>
                <p className="text-ink-soft mt-3">{charity.description}</p>
                <p className="text-legal text-muted mt-4">
                  Said publicly in{" "}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2"
                  >
                    {source.title}
                  </a>
                  , {source.publisher}
                  {source.publishedDate
                    ? `, ${source.publishedDate.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}`
                    : ""}
                  . Registered charity {charity.registeredNumber}.
                </p>
                <div className="mt-5">
                  <DonateLink charity={charity} origin="story" size="sm" showHint={false} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {unsourced.length > 0 ? (
        <>
          <h3 className="text-title mt-10">Charities working on this condition</h3>
          <p className="text-small text-muted mt-3 max-w-[42rem]">
            These charities work on the conditions in this story. We are not saying anyone in the
            story supports them.
          </p>
          <ul className="mt-5 grid list-none gap-6 p-0 sm:grid-cols-2">
            {unsourced.map(({ charity }) => (
              <li key={charity.id} className="rounded-card border-line border bg-white p-6">
                <p className="text-title">
                  <Link
                    href={`/charities/${charity.slug}`}
                    className="text-ink hover:text-forest-700 underline-offset-4 hover:underline"
                  >
                    <CharityIdentity charity={charity} />
                  </Link>
                </p>
                <p className="text-ink-soft mt-3">{charity.description}</p>
                <p className="text-legal text-muted mt-4">
                  Registered charity {charity.registeredNumber}
                </p>
                <div className="mt-5">
                  <DonateLink charity={charity} origin="story" size="sm" showHint={false} />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
