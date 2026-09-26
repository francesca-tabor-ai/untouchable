import type { Metadata } from "next";
import Link from "next/link";

import { WearableImport } from "@/components/trackers/wearable-import";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { DIRECT_CONNECTION_PROMISES, WEARABLE_SOURCES } from "@/lib/trackers/wearables";

export const metadata: Metadata = { title: "Connect a wearable" };

/**
 * Health wearables.
 *
 * Today this is a file import that runs entirely in the browser. A direct, always-on
 * connection to a device maker is a later phase of the brief and needs decisions that are
 * the platform lead's — DECISIONS.md HT-02. The page says which is which, rather than
 * showing "Connect" buttons that go nowhere.
 */
export default async function WearablesPage() {
  await requireAdult("/trackers/wearables");

  const fromFile = WEARABLE_SOURCES.filter((source) => source.status === "file");
  const notYet = WEARABLE_SOURCES.filter((source) => source.status === "not-yet");

  return (
    <Container reading className="py-12 sm:py-16">
      <p className="text-small">
        <Link href="/trackers" className="text-forest-700 underline underline-offset-2">
          Health trackers
        </Link>
      </p>
      <h1 className="mt-2 text-display">Connect a wearable</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Bring in sleep and water from your phone or watch, so you do not have to type them.
      </p>

      <section aria-labelledby="from-a-file" className="mt-10 space-y-5">
        <h2 id="from-a-file" className="text-title">
          Bring in a file
        </h2>
        <p className="text-ink-soft">
          Export the data from your phone or watch app, then choose the file here. We only take
          sleep and water from it. Everything else in the file is left alone.
        </p>

        <ul className="space-y-4">
          {fromFile.map((source) => (
            <li key={source.key} className="rounded-card border border-line bg-white p-5">
              <h3 className="font-semibold text-ink">{source.name}</h3>
              <p className="mt-1 text-small text-ink-soft">{source.today}</p>
              {source.howToExport ? (
                <p className="mt-2 text-small text-muted">{source.howToExport}</p>
              ) : null}
            </li>
          ))}
        </ul>

        <WearableImport />
      </section>

      <section aria-labelledby="direct" className="mt-12 space-y-4">
        <h2 id="direct" className="text-title">
          Connecting directly
        </h2>
        <p className="text-ink-soft">
          A direct connection would bring new readings in by itself, every day. We have not
          built it yet. It means your device maker sending health data to us, and we will not
          do that until we can keep it safe and you can stop it in one tap.
        </p>

        <ul className="divide-y divide-line rounded-card border border-line bg-white">
          {notYet.map((source) => (
            <li key={source.key} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-ink">{source.name}</span>
              <span className="text-small text-muted">{source.today}</span>
            </li>
          ))}
        </ul>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-ink">What it would read</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-small text-ink-soft">
              {DIRECT_CONNECTION_PROMISES.wouldRead.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-ink">What it would never read</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-small text-ink-soft">
              {DIRECT_CONNECTION_PROMISES.neverRead.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-small text-ink-soft">
          {DIRECT_CONNECTION_PROMISES.always.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </Container>
  );
}
