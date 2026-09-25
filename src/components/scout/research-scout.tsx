"use client";

import * as Tabs from "@radix-ui/react-tabs";
import * as React from "react";

import { Callout } from "@/components/ui/callout";
import { ON_DEVICE, WHAT_IS_SENT } from "@/lib/scout/copy";
import { scoutSnapshot, serverScoutSnapshot, subscribeToScout } from "@/lib/scout/storage";

import { CourseQueue } from "./course-queue";
import { ReadingList } from "./reading-list";
import { SearchPanel } from "./search-panel";
import { TrialsPanel } from "./trials-panel";
import { WatchTopics } from "./watch-topics";

/**
 * The Research Scout shell. Five tabs over one on-device store (see `storage.ts`).
 *
 * `claudeOn` comes from the server and only changes what the page offers — a summary button
 * or a note that summaries are off. Whether a request is allowed is decided again on the
 * server, every time.
 */

const TAB_TRIGGER =
  "rounded-pill px-4 py-2 text-small font-medium text-forest-700 hover:bg-forest-50 data-[state=active]:bg-forest-800 data-[state=active]:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600";

export function ResearchScout({ claudeOn }: { claudeOn: boolean }) {
  const store = React.useSyncExternalStore(subscribeToScout, scoutSnapshot, serverScoutSnapshot);
  const [tab, setTab] = React.useState("search");
  const newCount = store.watches.reduce((total, topic) => total + topic.new_count, 0);

  return (
    <div className="space-y-8">
      <Tabs.Root value={tab} onValueChange={setTab}>
        <Tabs.List aria-label="Research Scout" className="flex flex-wrap gap-2">
          <Tabs.Trigger value="search" className={TAB_TRIGGER}>
            Search
          </Tabs.Trigger>
          <Tabs.Trigger value="reading" className={TAB_TRIGGER}>
            Reading list ({store.saved.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="watching" className={TAB_TRIGGER}>
            Watching{newCount > 0 ? ` (${newCount} new)` : ""}
          </Tabs.Trigger>
          <Tabs.Trigger value="trials" className={TAB_TRIGGER}>
            Studies recruiting
          </Tabs.Trigger>
          <Tabs.Trigger value="course" className={TAB_TRIGGER}>
            For a course ({store.course.length})
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="search" className="mt-8 focus-visible:outline-none">
          <SearchPanel store={store} claudeOn={claudeOn} />
        </Tabs.Content>
        <Tabs.Content value="reading" className="mt-8 focus-visible:outline-none">
          <ReadingList store={store} claudeOn={claudeOn} />
        </Tabs.Content>
        <Tabs.Content value="watching" className="mt-8 focus-visible:outline-none">
          <WatchTopics store={store} claudeOn={claudeOn} />
        </Tabs.Content>
        <Tabs.Content value="trials" className="mt-8 focus-visible:outline-none">
          <TrialsPanel claudeOn={claudeOn} />
        </Tabs.Content>
        <Tabs.Content value="course" className="mt-8 focus-visible:outline-none">
          <CourseQueue store={store} />
        </Tabs.Content>
      </Tabs.Root>

      <Callout title="Where your words go">
        <p>{WHAT_IS_SENT}</p>
        <p className="mt-3">{ON_DEVICE}</p>
      </Callout>
    </div>
  );
}
