import Link from "next/link";

import type { MedicineSource, MedicineStory } from "@/lib/medicines/queries";

/**
 * The people who have talked about one medicine.
 *
 * Every row is a published story. A retracted one is gone from here on the next request,
 * because the query behind it reads `status = "published"` and nothing else.
 *
 * Each row says three things and stops: who, in what circumstances (the editor's context
 * line, in our own words), and where that came from. There is no outcome, no rating and no
 * verdict on the medicine — a medicine page shows what people said, not whether a drug
 * works.
 */

export function MedicineSourceLine({ source }: { source: MedicineSource | null }) {
  if (!source) {
    return (
      <p className="mt-2 text-legal text-muted">
        No source is recorded for this particular detail. Read the story for the sources it is
        built from.
      </p>
    );
  }

  return (
    <p className="mt-2 text-legal text-muted">
      Source:{" "}
      <a
        href={source.url}
        rel="noopener noreferrer nofollow"
        target="_blank"
        className="text-forest-600 underline underline-offset-4"
      >
        {source.title}
      </a>{" "}
      — {source.publisher}
      {source.publishedDate ? `, ${formatDate(source.publishedDate)}` : ""}
    </p>
  );
}

export function MedicineStories({
  stories,
  medicineName,
}: {
  stories: MedicineStory[];
  medicineName: string;
}) {
  if (stories.length === 0) {
    return (
      <p className="mt-2 max-w-[38rem] text-muted">
        Nobody has talked about {medicineName} here yet, or the stories that did have been taken
        down.{" "}
        <Link href="/stories" className="text-forest-600 underline underline-offset-4">
          Read the other stories
        </Link>{" "}
        in the meantime.
      </p>
    );
  }

  return (
    <ul className="mt-8 list-none space-y-6 p-0" data-testid="medicine-stories">
      {stories.map((story) => (
        <li key={story.id} className="rounded-card border border-line bg-white p-6">
          <h3 className="text-title">
            <Link
              href={`/stories/${story.slug}`}
              className="text-ink underline-offset-4 hover:text-forest-700 hover:underline"
            >
              {story.title}
            </Link>
          </h3>
          {story.figureName ? (
            <p className="mt-1 text-small text-muted">{story.figureName}</p>
          ) : (
            <p className="mt-1 text-small text-muted">
              A community story, shared with the person&rsquo;s written permission.
            </p>
          )}
          {story.context ? <p className="mt-3 text-ink-soft">{story.context}</p> : null}
          <MedicineSourceLine source={story.source} />
        </li>
      ))}
    </ul>
  );
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}
