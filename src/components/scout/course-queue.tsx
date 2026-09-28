"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, Input } from "@/components/ui/field";
import { COURSE_NOTICE } from "@/lib/scout/copy";
import { clearCourse, toggleCourse, type ScoutStore } from "@/lib/scout/storage";
import { STUDY_TYPE_INFO } from "@/lib/scout/study-type";
import { courseHandoff } from "@/lib/scout/watch";

/**
 * Papers chosen for a course. The Course Generator does not exist yet, so this holds the
 * hand-off in the agreed shape (`CourseHandoff` in `watch.ts`) and lets the person save it as
 * a file. When the generator is built it reads the same shape, and nothing here changes.
 */
export function CourseQueue({ store }: { store: ScoutStore }) {
  const [topic, setTopic] = React.useState("");
  const chosen = store.saved.filter((entry) => store.course.includes(entry.paper.id));

  const download = () => {
    const handoff = courseHandoff(topic || "Research Scout papers", chosen);
    const blob = new Blob([JSON.stringify(handoff, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "course-papers.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <Callout tone="warm" title="Not ready yet">
        <p>{COURSE_NOTICE}</p>
      </Callout>

      {chosen.length === 0 ? (
        <div className="space-y-3">
          <h2 className="text-title">No papers chosen</h2>
          <p className="text-body text-ink-soft">
            Save papers to your reading list, then choose &ldquo;Choose for a course&rdquo; on the ones a course should be built from.
          </p>
        </div>
      ) : (
        <>
          <h2 className="text-title">
            {chosen.length} {chosen.length === 1 ? "paper" : "papers"} chosen
          </h2>
          <ul className="space-y-3">
            {chosen.map(({ paper }) => (
              <li key={paper.id} className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-line bg-white p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{paper.title}</p>
                  <p className="text-small text-muted">
                    {STUDY_TYPE_INFO[paper.study_type].label}
                    {paper.published_date ? ` · ${paper.published_date.slice(0, 4)}` : ""}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => toggleCourse(paper.id, false)}>
                  Take out
                </Button>
              </li>
            ))}
          </ul>
          <Field label="What the course is about" hint="A few words, like “tinnitus and the jaw”.">
            {(props) => <Input {...props} value={topic} maxLength={120} onChange={(event) => setTopic(event.target.value)} />}
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={download}>
              Save the list as a file
            </Button>
            <Button type="button" variant="ghost" onClick={clearCourse}>
              Clear the list
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
