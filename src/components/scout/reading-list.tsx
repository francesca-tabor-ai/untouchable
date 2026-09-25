"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ON_DEVICE } from "@/lib/scout/copy";
import { deleteScout, exportScout, updateSaved, type ScoutStore } from "@/lib/scout/storage";
import type { SavedPaper } from "@/lib/scout/types";

import { PaperCard } from "./paper-card";

/**
 * Saved papers, with the person's own notes, a read mark and their own tags. All of it on
 * this device (see `storage.ts`).
 */
export function ReadingList({ store, claudeOn }: { store: ScoutStore; claudeOn: boolean }) {
  const [tag, setTag] = React.useState<string | null>(null);
  const [show, setShow] = React.useState<"all" | "unread" | "read">("all");
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const tags = [...new Set(store.saved.flatMap((entry) => entry.tags))].sort((a, b) => a.localeCompare(b));
  const visible = store.saved
    .filter((entry) => (tag ? entry.tags.includes(tag) : true))
    .filter((entry) => (show === "all" ? true : show === "read" ? entry.read : !entry.read));

  const download = () => {
    const blob = new Blob([exportScout()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "research-scout.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (store.saved.length === 0) {
    return (
      <div className="max-w-3xl space-y-4">
        <h2 className="text-title">Your reading list is empty</h2>
        <p className="text-body text-ink-soft">Search for a question and choose &ldquo;Save to reading list&rdquo; on any paper you want to come back to.</p>
        <p className="text-small text-muted">{ON_DEVICE}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-6">
        <div role="group" aria-label="Show" className="flex flex-wrap gap-2">
          {(["all", "unread", "read"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={show === option}
              onClick={() => setShow(option)}
              className={`rounded-pill border px-4 py-2 text-small font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 ${
                show === option ? "border-forest-800 bg-forest-800 text-white" : "border-line bg-white text-forest-700 hover:bg-forest-50"
              }`}
            >
              {option === "all" ? "All" : option === "unread" ? "Not read yet" : "Read"}
            </button>
          ))}
        </div>
        {tags.length > 0 ? (
          <div role="group" aria-label="Theme" className="flex flex-wrap gap-2">
            {[null, ...tags].map((option) => (
              <button
                key={option ?? "any"}
                type="button"
                aria-pressed={tag === option}
                onClick={() => setTag(option)}
                className={`rounded-pill border px-4 py-2 text-small font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600 ${
                  tag === option ? "border-forest-800 bg-forest-800 text-white" : "border-line bg-white text-forest-700 hover:bg-forest-50"
                }`}
              >
                {option ?? "Every theme"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <h2 className="text-title">
        {visible.length} of {store.saved.length} saved {store.saved.length === 1 ? "paper" : "papers"}
      </h2>

      <ol className="space-y-8">
        {visible.map((entry) => (
          <li key={entry.paper.id} className="space-y-3">
            <PaperCard paper={entry.paper} store={store} claudeOn={claudeOn} topicTerms={entry.paper.topics.slice(0, 3)} />
            <SavedExtras entry={entry} />
          </li>
        ))}
      </ol>

      <Callout title="Kept on this device">
        <p>{ON_DEVICE}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" size="sm" onClick={download}>
            Save a copy as a file
          </Button>
          {confirmingDelete ? (
            <>
              <Button type="button" variant="dark" size="sm" onClick={() => { deleteScout(); setConfirmingDelete(false); }}>
                Yes, delete everything
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Keep it
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
              Delete my reading list, notes and watched searches
            </Button>
          )}
        </div>
      </Callout>
    </div>
  );
}

function SavedExtras({ entry }: { entry: SavedPaper }) {
  const [notes, setNotes] = React.useState(entry.notes);
  const [newTag, setNewTag] = React.useState("");

  const addTag = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = newTag.trim().toLowerCase().slice(0, 40);
    if (!clean || entry.tags.includes(clean)) return;
    updateSaved(entry.paper.id, { tags: [...entry.tags, clean] });
    setNewTag("");
  };

  return (
    <div className="rounded-card border border-line bg-cream-50 p-5">
      <CheckboxRow
        name={`read-${entry.paper.id}`}
        label="I have read this"
        checked={entry.read}
        onCheckedChange={(checked) => updateSaved(entry.paper.id, { read: checked })}
      />
      <Field label="Your notes" hint="Only you can see these. They stay on this device." className="mt-4">
        {(props) => (
          <Textarea
            {...props}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            onBlur={() => notes !== entry.notes && updateSaved(entry.paper.id, { notes })}
            className="min-h-24"
          />
        )}
      </Field>
      <div className="mt-4">
        <p className="text-small font-medium text-ink">Themes</p>
        {entry.tags.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {entry.tags.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => updateSaved(entry.paper.id, { tags: entry.tags.filter((existing) => existing !== item) })}
                  className="rounded-pill bg-cream-200 px-3 py-1 text-small text-ink-soft hover:bg-cream-300"
                >
                  {item} <span aria-hidden="true">×</span>
                  <span className="sr-only">, remove this theme</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <form onSubmit={addTag} className="mt-3 flex max-w-md items-end gap-3">
          <Field label="Add a theme" className="flex-1">
            {(props) => <Input {...props} value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="jaw" />}
          </Field>
          <Button type="submit" variant="secondary" size="sm">
            Add
          </Button>
        </form>
      </div>
    </div>
  );
}
