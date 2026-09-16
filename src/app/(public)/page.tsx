import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Container } from "@/components/ui/container";

export default function HomePage() {
  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <Container className="py-20 sm:py-28">
          <div className="max-w-[34rem]">
            <p className="text-small font-medium tracking-wide text-clay-700 uppercase">
              Nobody is untouchable
            </p>
            <h1 className="mt-4 text-hero sm:text-[3.5rem]">
              Illness does not care who you are.
            </h1>
            <p className="mt-6 text-lead text-ink-soft">
              Well-known people have stood up and said what happened to them, or to someone they
              love. Their stories are here, told carefully and with sources. So are the charities
              behind them, and a quiet place to keep track of how you are really doing.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/stories">Read the stories</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/about">Why we built this</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-20">
        <h2 className="text-display">Three things, in one place</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <Card>
            <CardTitle>Stories people chose to share</CardTitle>
            <CardBody>
              Only what someone has said publicly themselves, in their own interview, book or
              statement. Every story carries its sources, and anyone can ask us to correct or
              remove one.
            </CardBody>
          </Card>
          <Card>
            <CardTitle>Charities worth your money</CardTitle>
            <CardBody>
              Every charity here has been checked against the official register by a person. When
              you give, you go straight to the charity. We never hold your money and we never take
              a penny of it.
            </CardBody>
          </Card>
          <Card>
            <CardTitle>A record of how you are doing</CardTitle>
            <CardBody>
              Track symptoms and treatments over time, in a form that is actually useful — to you,
              to the conversation with your GP, and one day to research, but only if you say so.
            </CardBody>
          </Card>
        </div>
      </Container>

      <section className="border-y border-line bg-white">
        <Container reading className="py-20 text-center">
          <h2 className="text-display">Free, and staying free</h2>
          <p className="mt-5 text-ink-soft">
            UnTouchable costs nothing to use and never will. We do not sell health products, we do
            not run advertising, and we take nothing from the money you give to charity. What we
            learn from people who choose to share their data is what pays for it — and independence
            is the only thing that makes any of it worth having.
          </p>
        </Container>
      </section>
    </>
  );
}
