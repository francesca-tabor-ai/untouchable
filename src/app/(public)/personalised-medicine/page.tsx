import type { Metadata } from "next";
import Link from "next/link";

import { Callout } from "@/components/ui/callout";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { PERSONALISED_NOT_ADVICE, PERSONALISED_TOPICS } from "@/lib/personalised-medicine/topics";

/**
 * Personalised medicine — the hub.
 *
 * Static: nothing here reads the database, and there are no stories on it yet, so there is
 * nothing a retraction could leave behind. No donation prompt, for the same reason as the
 * medicines pages: this is not one of the charity team's approved surfaces.
 */
export const metadata: Metadata = {
  title: "Personalised medicine",
  description:
    "How who you are — your sex, your hormones, your stage of life — can change which conditions you get, how they show up and how they are treated.",
  alternates: { canonical: "/personalised-medicine" },
};

export default function PersonalisedMedicinePage() {
  return (
    <>
      <section className="border-line bg-cream-50 border-b">
        <Container className="py-12 sm:py-16">
          <div className="max-w-[38rem]">
            <h1 className="text-hero">Personalised medicine</h1>
            <p className="text-lead text-ink-soft mt-5">
              The same illness can look different in different people, and a medicine can act
              differently too. Your sex, your hormones and your stage of life can all play a part.
              These pages explain what is known, in plain words.
            </p>
          </div>
          <Callout className="mt-8 max-w-[38rem]" title="This is not medical advice">
            <p>{PERSONALISED_NOT_ADVICE}</p>
          </Callout>
        </Container>
      </section>

      <Container className="py-12">
        <h2 className="text-display">Topics</h2>
        <ul className="mt-6 grid list-none gap-5 p-0 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONALISED_TOPICS.map((topic) => (
            <li key={topic.href}>
              <Card interactive className="h-full">
                <CardTitle>
                  <Link
                    href={topic.href}
                    className="text-forest-700 underline-offset-4 hover:underline"
                  >
                    {topic.title}
                  </Link>
                </CardTitle>
                <CardBody>{topic.summary}</CardBody>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
