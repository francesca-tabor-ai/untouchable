import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Card, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { readingFor } from "@/lib/my-health/learning";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Education" };

/**
 * My health → Education. Our own published pages, picked out by the conditions and
 * medicines this person has told us about. See `src/lib/my-health/learning.ts` for what
 * "personalised" is allowed to mean here, and what it is not.
 *
 * It reads which conditions somebody has, which is tracking data, so it is behind the same
 * two guards as the tracker pages.
 */
export default async function LearnPage() {
  const user = await requireAdult("/learn");
  await requireTrackingConsent(user.id);

  const { conditions, medicines } = await readingFor(user.id);

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Education</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Reading about the conditions and medicines you have told us about. Everything here is
        written from independent sources, like the NHS. None of it is advice about you.
      </p>

      <section className="mt-12" aria-labelledby="your-conditions">
        <h2 id="your-conditions" className="text-title">
          Your conditions
        </h2>

        {conditions.length === 0 ? (
          <Callout tone="care" className="mt-5" title="Tell us what you are living with">
            <p>
              This page is built from the conditions you choose. You have not chosen any yet.
            </p>
            <p className="mt-3">
              <Link href="/onboarding/conditions">Choose your conditions</Link>
            </p>
          </Callout>
        ) : (
          <ul className="mt-5 space-y-5">
            {conditions.map((condition) => (
              <li key={condition.id}>
                <Card>
                  <CardTitle>{condition.name}</CardTitle>
                  <p className="mt-2 text-small text-ink-soft">{condition.summary}</p>

                  {condition.stories.length > 0 ? (
                    <>
                      <h4 className="mt-5 text-small font-semibold text-ink">
                        People who have spoken about it
                      </h4>
                      <ul className="mt-2 space-y-2 text-small">
                        {condition.stories.map((story) => (
                          <li key={story.id} className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/stories/${story.slug}`}
                              className="text-forest-700 underline underline-offset-2"
                            >
                              {story.title}
                            </Link>
                            {story.needsContentNote ? <Badge>Content note</Badge> : null}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}

                  <div className="mt-5">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/conditions/${condition.slug}`}>
                        Read about {condition.name}
                      </Link>
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {medicines.length > 0 ? (
        <section className="mt-14" aria-labelledby="your-medicines">
          <h2 id="your-medicines" className="text-title">
            Medicines you have logged
          </h2>
          <p className="mt-2 text-small text-ink-soft">
            Only the ones we have a page about. Each page says where its information comes from.
          </p>
          <ul className="mt-5 space-y-4">
            {medicines.map((medicine) => (
              <li key={medicine.id}>
                <Card>
                  <CardTitle>
                    <Link
                      href={`/medicines/${medicine.slug}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {medicine.name}
                    </Link>
                  </CardTitle>
                  <p className="mt-2 text-small text-ink-soft">{medicine.summary}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-14" aria-labelledby="more">
        <h2 id="more" className="text-title">
          More to read
        </h2>
        <ul className="mt-4 space-y-2 text-small">
          <li>
            <Link href="/conditions" className="text-forest-700 underline underline-offset-2">
              Every condition we cover
            </Link>
          </li>
          <li>
            <Link href="/medicines" className="text-forest-700 underline underline-offset-2">
              Every medicine we cover
            </Link>
          </li>
          <li>
            <a
              href="https://www.nhs.uk/conditions/"
              rel="noreferrer"
              className="text-forest-700 underline underline-offset-2"
            >
              The NHS guide to conditions and how the body works
            </a>{" "}
            <span className="text-muted">(on the NHS website)</span>
          </li>
        </ul>
      </section>
    </Container>
  );
}
