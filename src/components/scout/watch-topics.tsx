"use client";

import * as React from "react";

import { runSearch } from "@/app/(account)/research/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { WATCH_NOTICE } from "@/lib/scout/copy";
import { EMPTY_STORE, setWatches, type ScoutStore } from "@/lib/scout/storage";
import type { Paper, WatchTopic } from "@/lib/scout/types";
import { afterRun, isDue, markSeen } from "@/lib/scout/watch";

import { PaperCard } from "./paper-card";

/**
 * Watched searches. Each one is re-run when this page is opened, if a week has passed — see
 * `watch.ts` for why that is the only schedule there can be.
 */
export function WatchTopics({ store, claudeOn }: { store: ScoutStore; claudeOn: boolean }) {
  const [running, setRunning] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<{ id: string; papers: Paper[]; newIds: string[] } | null>(null);
  const checked = React.useRef(false);

  const run = React.useCallback(async (topic: WatchTopic) => {
    setRunning(topic.id);
    try {
      const outcome = await runSearch({ queries: topic.queries, filters: topic.filters });
      // Only record a run that heard from every source; half an answer would mark the other
      // half's papers as new next week.
      if (outcome.unavailable.length === 0) {
        setWatches((watches) => watches.map((existing) => (existing.id === topic.id ? afterRun(existing, outcome.papers) : existing)));
      }
      return outcome.papers;
    } catch {
      return null;
    } finally {
      setRunning(null);
    }
  }, []);

  // Once per visit, anything a week old is checked, one at a time.
  React.useEffect(() => {
    // The first render is the server's empty snapshot; wait for the stored one.
    if (checked.current || store === EMPTY_STORE) return;
    checked.current = true;
    const due = store.watches.filter((topic) => isDue(topic));
    void (async () => {
      for (const topic of due) await run(topic);
    })();
  }, [store, run]);

  const show = async (topic: WatchTopic) => {
    const papers = await run(topic);
    if (!papers) return;
    setOpen({ id: topic.id, papers, newIds: afterRun(topic, papers).new_ids });
    // Seen now, so not new next time.
    setWatches((watches) => watches.map((existing) => (existing.id === topic.id ? markSeen(existing) : existing)));
  };

  const stop = (id: string) => {
    setWatches((watches) => watches.filter((topic) => topic.id !== id));
    if (open?.id === id) setOpen(null);
  };

  return (
    <div className="space-y-8">
      <p className="max-w-3xl text-small text-muted">{WATCH_NOTICE}</p>

      {store.watches.length === 0 ? (
        <div className="max-w-3xl space-y-3">
          <h2 className="text-title">You are not watching any searches</h2>
          <p className="text-body text-ink-soft">
            After a search, choose &ldquo;Watch this search for new papers&rdquo;. When you come back, new papers are marked.
          </p>
        </div>
      ) : (
        <ul className="space-y-6">
          {store.watches.map((topic) => (
            <li key={topic.id}>
              <Card>
                <h2 className="text-title">{topic.query}</h2>
                <p className="mt-2 text-small text-muted">
                  {running === topic.id
                    ? "Checking now…"
                    : topic.last_run
                      ? `Last checked ${new Date(topic.last_run).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
                      : "Not checked yet."}{" "}
                  {topic.new_count > 0 ? (
                    <strong className="font-semibold text-ink">
                      {topic.new_count} new {topic.new_count === 1 ? "paper" : "papers"} since your last visit.
                    </strong>
                  ) : (
                    "Nothing new since your last visit."
                  )}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button type="button" size="sm" onClick={() => show(topic)} disabled={running !== null}>
                    {topic.new_count > 0 ? "Show the new papers" : "Show the papers"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => stop(topic.id)}>
                    Stop watching
                  </Button>
                </div>
              </Card>

              {open?.id === topic.id ? (
                <ol className="mt-6 space-y-6">
                  {[...open.papers]
                    .sort((a, b) => Number(open.newIds.includes(b.id)) - Number(open.newIds.includes(a.id)))
                    .map((paper) => (
                      <li key={paper.id}>
                        <PaperCard
                          paper={paper}
                          store={store}
                          claudeOn={claudeOn}
                          isNew={open.newIds.includes(paper.id)}
                          topicTerms={paper.topics.slice(0, 3)}
                          onChange={(next) =>
                            setOpen((current) => (current ? { ...current, papers: current.papers.map((item) => (item.id === next.id ? next : item)) } : current))
                          }
                        />
                      </li>
                    ))}
                </ol>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
