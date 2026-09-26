import type { Metadata } from "next";
import Link from "next/link";

import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { PERSONALISED_NOT_ADVICE } from "@/lib/personalised-medicine/topics";
import {
  WOMENS_HEALTH,
  WOMENS_HEALTH_SECTIONS,
  womensHealthSources,
  type Source,
} from "@/lib/personalised-medicine/womens-health";

/**
 * Women's health, under Personalised medicine.
 *
 * All of the words live in `src/lib/personalised-medicine/womens-health.ts`, where they are
 * tested; this file only lays them out. Each point names its source beside it rather than in
 * a footnote, so someone reading on a phone can check it without scrolling to the bottom.
 *
 * Static and public. No donation prompt, no stories, no tracking scripts.
 */
export const metadata: Metadata = {
  title: WOMENS_HEALTH.title,
  description: WOMENS_HEALTH.summary,
  alternates: { canonical: `/personalised-medicine/${WOMENS_HEALTH.slug}` },
};

const linkClass = "text-forest-600 underline underline-offset-4";

export default function WomensHealthPage() {
  return (
    <>
      <section className="border-line bg-cream-50 border-b">
        <Container reading className="py-12 sm:py-16">
          <p className="text-small text-muted">
            <Link href="/personalised-medicine" className={linkClass}>
              Personalised medicine
            </Link>
          </p>
          <h1 className="text-hero mt-4">{WOMENS_HEALTH.title}</h1>
          <p className="text-lead text-ink-soft mt-5">{WOMENS_HEALTH.lead}</p>
          <p className="text-small text-muted mt-4">{WOMENS_HEALTH.whoThisIsFor}</p>

          <Callout className="mt-8" title="This is not medical advice">
            <p>{PERSONALISED_NOT_ADVICE}</p>
          </Callout>

          <nav aria-label="On this page" className="mt-8">
            <h2 className="text-small text-ink font-semibold">On this page</h2>
            <ul className="mt-3 space-y-2">
              {WOMENS_HEALTH_SECTIONS.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className={linkClass}>
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </section>

      <Container reading className="py-12">
        {WOMENS_HEALTH_SECTIONS.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-heading`}
            className={index > 0 ? "mt-16 scroll-mt-6" : "scroll-mt-6"}
          >
            <h2 id={`${section.id}-heading`} className="text-display">
              {section.heading}
            </h2>
            <p className="text-ink-soft mt-3">{section.intro}</p>

            <ul className="mt-6 list-none space-y-6 p-0">
              {section.points.map((point) => (
                <li key={point.title} className="border-forest-200 border-l-2 pl-4">
                  <h3 className="text-title">{point.title}</h3>
                  <p className="text-ink-soft mt-2">{point.body}</p>
                  <p className="text-small text-muted mt-2">
                    From <SourceLinks sources={point.sources} />
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="gp-heading" className="mt-16">
          <h2 id="gp-heading" className="text-display">
            Talking to your GP
          </h2>
          <p className="text-ink-soft mt-3">
            You can tell your GP or pharmacist if your symptoms change with your cycle, in pregnancy
            or around the menopause. Some people find it easier to say when there is a record of
            what happened and when.
          </p>
          <ul className="mt-4 space-y-2">
            <li>
              <Link href="/log" className={linkClass}>
                Symptom tracker
              </Link>
            </li>
            <li>
              <Link href="/timeline/questions" className={linkClass}>
                Questions to ask
              </Link>
            </li>
            <li>
              <Link href="/conditions" className={linkClass}>
                Conditions, and people&apos;s stories about them
              </Link>
            </li>
          </ul>
          <p className="text-small text-muted mt-3">
            The symptom tracker and your questions are private to you, and need you to sign in.
          </p>
        </section>

        <section aria-labelledby="sources-heading" className="mt-16">
          <h2 id="sources-heading" className="text-title">
            Where this comes from
          </h2>
          <p className="text-small text-muted mt-2">
            Written in our own words from these pages, read in September 2026. We never take health
            information from a company that sells treatment.
          </p>
          <ul className="text-small mt-4 space-y-2">
            {womensHealthSources().map((source) => (
              <li key={source.href}>
                <ExternalLink source={source} />
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </>
  );
}

function SourceLinks({ sources }: { sources: Source[] }) {
  return (
    <>
      {sources.map((source, index) => (
        <span key={source.href}>
          {index > 0 ? (index === sources.length - 1 ? " and " : ", ") : null}
          <ExternalLink source={source} />
        </span>
      ))}
    </>
  );
}

function ExternalLink({ source }: { source: Source }) {
  return (
    <a href={source.href} rel="noopener noreferrer" className={linkClass}>
      {source.label}
    </a>
  );
}
