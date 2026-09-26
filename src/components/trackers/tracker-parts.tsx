"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import type { TrackerKey } from "@/lib/trackers/records";
import { exportRecords, type TrackerStore } from "@/lib/trackers/storage";
import { localToday } from "@/lib/trackers/summaries";

/**
 * Pieces every tracker screen shares: reading its records, the note on where they are kept,
 * and taking a copy or deleting the lot.
 */

/** The records in a store, kept in step with local storage and with other open tabs. */
export function useRecords<T>(store: TrackerStore<T>): T[] {
  return React.useSyncExternalStore(store.subscribe, store.snapshot, store.serverSnapshot);
}

/**
 * Said on every tracker, near the top, because it is the thing most likely to surprise
 * somebody: these records are not in their account.
 */
export function OnThisDevice() {
  return (
    <p className="text-small text-muted">
      Kept on this device only. We never see it, and it is not part of your account. Clearing
      your browser deletes it, and it will not appear on another phone or computer.
    </p>
  );
}

export function DataControls<T>({
  tracker,
  store,
  records,
  noun,
}: {
  tracker: TrackerKey;
  store: TrackerStore<T>;
  records: readonly T[];
  /** "water records", "results" — what "Delete all …" deletes. */
  noun: string;
}) {
  const [confirming, setConfirming] = React.useState(false);
  const [deleted, setDeleted] = React.useState(false);

  if (records.length === 0) {
    return deleted ? (
      <p role="status" className="text-small text-ink-soft">
        Deleted. Nothing is left on this device.
      </p>
    ) : null;
  }

  const download = () => {
    const blob = new Blob([exportRecords(tracker, [...records])], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `untouchable-${tracker}-${localToday()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section aria-labelledby={`${tracker}-your-data`} className="space-y-3">
      <h2 id={`${tracker}-your-data`} className="text-title">
        Your records
      </h2>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={download}>
          Download a copy
        </Button>
        {confirming ? null : (
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Delete all {noun}
          </Button>
        )}
      </div>
      {confirming ? (
        <div className="rounded-card border border-line bg-cream-50 p-4" role="group" aria-label="Confirm delete">
          <p className="text-small text-ink">
            This deletes all {noun} on this device. It cannot be undone.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              type="button"
              variant="dark"
              size="sm"
              onClick={() => {
                store.clear();
                setConfirming(false);
                setDeleted(true);
              }}
            >
              Yes, delete them
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setConfirming(false)}>
              Keep them
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** A small "Remove" button, named for what it removes so a screen reader says which. */
export function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label}`}
      className="min-h-11 rounded-pill px-3 text-small font-medium text-forest-700 underline underline-offset-2 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
    >
      Remove
    </button>
  );
}

/** "Imported from Apple Health", so nobody mistakes a watch's record for their own diary. */
export function ImportedTag({ from }: { from?: string }) {
  return (
    <span className="rounded-pill bg-cream-100 px-2 py-0.5 text-legal text-ink-soft">
      Imported{from ? ` from ${from}` : ""}
    </span>
  );
}
