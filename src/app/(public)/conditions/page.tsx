import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { listConditions } from "@/lib/stories/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Conditions",
  description:
    "The conditions people have spoken about here, what they are in plain English, and the stories behind them.",
};

export default async function ConditionsPage() {
  const conditions = await listConditions();

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
        <h2 className="sr-only">All conditions</h2>
        <ul className="grid gap-5 sm:grid-cols-2">
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
          <p className="mt-6 text-ink-soft">There is nothing here yet.</p>
        ) : null}
      </Container>
    </>
  );
}
