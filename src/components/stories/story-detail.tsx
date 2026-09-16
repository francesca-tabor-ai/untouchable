import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { KeyMoment } from "@/lib/stories/key-moments";
import type { PublicStory, StorySource } from "@/lib/stories/queries";

const SOURCE_TYPE_LABELS: Record<StorySource["sourceType"], string> = {
  interview: "Interview",
  own_social: "Their own social media",
  book: "Book",
  podcast: "Podcast",
  statement: "Official statement",
  article: "Article they wrote",
};

/** How the story came to be public. Said plainly, because it is the whole basis for it. */
export function DisclosureLine({ story }: { story: PublicStory }) {
  const who = story.figure ? story.figure.name : "The person in this story";
  const what =
    story.disclosureType === "own"
      ? "shared this about their own health"
      : "shared this about someone they love";
  return (
    <p className="mt-4 text-small text-muted">
      {who} {what}, publicly. Everything below is written in our own words, from the sources
      listed at the end.
    </p>
  );
}

export function KeyMomentsTimeline({ moments }: { moments: KeyMoment[] }) {
  if (moments.length === 0) return null;

  return (
    <section aria-labelledby="key-moments-heading" className="mt-12">
      <h2 id="key-moments-heading" className="text-display">
        Key moments
      </h2>
      <ol className="mt-6 space-y-0">
        {moments.map((moment, index) => (
          <li
            key={`${moment.label}-${index}`}
            className="border-l-2 border-forest-200 py-4 pl-6 first:pt-0"
          >
            <h3 className="text-title">{moment.label}</h3>
            {moment.when ? <p className="text-small text-muted">{moment.when}</p> : null}
            {moment.body ? <p className="mt-2 text-ink-soft">{moment.body}</p> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * A quote is optional, at most twenty-five words, and always carries the link it came from.
 * Anything longer is summarised in our own words instead — brief 5.2.
 */
export function StoryQuote({ quote, source }: { quote: string; source: StorySource }) {
  return (
    <figure className="mt-10 border-l-2 border-clay-200 pl-6">
      <blockquote className="font-display text-title text-ink">
        <p>&ldquo;{quote}&rdquo;</p>
      </blockquote>
      <figcaption className="mt-3 text-legal text-muted">
        Said to{" "}
        <a
          href={source.url}
          rel="noopener noreferrer nofollow"
          target="_blank"
          className="text-forest-600 underline underline-offset-4"
        >
          {source.publisher}
        </a>
        {source.publishedDate ? `, ${formatDate(source.publishedDate)}` : ""}.
      </figcaption>
    </figure>
  );
}

export function SourceList({ sources }: { sources: StorySource[] }) {
  return (
    <section aria-labelledby="sources-heading" className="mt-12">
      <h2 id="sources-heading" className="text-display">
        Where this came from
      </h2>
      <p className="mt-2 text-small text-muted">
        Every story here is built only from what the person said publicly themselves. These are
        the sources we used.
      </p>
      <ol className="mt-6 space-y-5">
        {sources.map((source) => (
          <li key={source.id} className="border-t border-line pt-5">
            <p>
              <a
                href={source.url}
                rel="noopener noreferrer nofollow"
                target="_blank"
                className="text-forest-600 underline underline-offset-4"
              >
                {source.title}
              </a>
            </p>
            <p className="mt-1 text-legal text-muted">
              {source.publisher} · {SOURCE_TYPE_LABELS[source.sourceType]}
              {source.publishedDate ? ` · ${formatDate(source.publishedDate)}` : ""}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ConditionLinks({
  conditions,
  heading,
}: {
  conditions: { name: string; slug: string }[];
  heading: string;
}) {
  if (conditions.length === 0) return null;
  return (
    <section aria-labelledby="conditions-heading" className="mt-12">
      <h2 id="conditions-heading" className="text-display">
        {heading}
      </h2>
      <ul className="mt-5 flex flex-wrap gap-2">
        {conditions.map((condition) => (
          <li key={condition.slug}>
            <Link href={`/conditions/${condition.slug}`} className="rounded-pill">
              <Badge tone="forest">{condition.name}</Badge>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}
