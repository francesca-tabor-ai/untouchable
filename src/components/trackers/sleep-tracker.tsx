"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { newId, type SleepEntry } from "@/lib/trackers/records";
import { sleepStore } from "@/lib/trackers/storage";
import {
  formatDay,
  formatMinutes,
  localToday,
  sleepNewestFirst,
} from "@/lib/trackers/summaries";

import { DataControls, ImportedTag, OnThisDevice, RemoveButton, useRecords } from "./tracker-parts";

/**
 * Sleep: how long, and how well, in the person's own rating.
 *
 * "How well" is theirs, on the same 0 to 10 scale as the daily log, and it is shown as the
 * number they chose. We do not call a night short or long, and there is no recommended
 * number of hours anywhere on the screen.
 */

function yesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return localToday(date);
}

export function SleepTracker() {
  const entries = useRecords(sleepStore);
  const [night, setNight] = React.useState(yesterday);
  const [hours, setHours] = React.useState("");
  const [minutes, setMinutes] = React.useState("");
  const [howWell, setHowWell] = React.useState<number | null>(null);
  const [timesWoke, setTimesWoke] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [said, setSaid] = React.useState("");

  const existing = entries.find((entry) => entry.night === night);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const h = hours === "" ? 0 : Number(hours);
    const m = minutes === "" ? 0 : Number(minutes);
    const total = h * 60 + m;
    if (hours === "" && minutes === "") {
      setError("Write roughly how long you slept. A guess is fine.");
      return;
    }
    if (!Number.isInteger(h) || !Number.isInteger(m) || m > 59 || total > 24 * 60) {
      setError("Write whole hours, and minutes from 0 to 59.");
      return;
    }
    setError(undefined);

    const entry: SleepEntry = {
      id: existing?.id ?? newId(),
      night,
      minutesAsleep: total,
      howWell: howWell ?? undefined,
      timesWoke: timesWoke === "" ? undefined : Number(timesWoke),
      origin: "typed",
    };
    // One record per night. Saving the same night again replaces it, including an imported
    // one: what somebody writes down themselves wins over what a watch recorded.
    sleepStore.save([...entries.filter((item) => item.night !== night), entry]);
    setSaid(`Saved the night of ${formatDay(night)}.`);
    setHours("");
    setMinutes("");
    setHowWell(null);
    setTimesWoke("");
  };

  const remove = (id: string) => sleepStore.save(entries.filter((entry) => entry.id !== id));
  const nights = sleepNewestFirst(entries);

  return (
    <div className="space-y-10">
      <OnThisDevice />

      <form onSubmit={save} className="space-y-6" noValidate aria-labelledby="sleep-add">
        <h2 id="sleep-add" className="text-title">
          Add a night
        </h2>

        <Field
          label="The night of"
          hint="The date you went to bed. Monday night into Tuesday is Monday."
          required
        >
          {(props) => (
            <Input
              {...props}
              type="date"
              value={night}
              max={localToday()}
              onChange={(event) => setNight(event.target.value || yesterday())}
              className="max-w-60"
            />
          )}
        </Field>
        {existing ? (
          <p className="text-small text-ink-soft">
            You already have this night written down ({formatMinutes(existing.minutesAsleep)}).
            Saving replaces it.
          </p>
        ) : null}

        <fieldset className="space-y-2">
          <legend className="text-small font-medium text-ink">
            Time asleep <span className="text-clay-700">*</span>
          </legend>
          <p className="text-small text-muted">Roughly. A guess is fine.</p>
          <div className="flex flex-wrap gap-3">
            <Field label="Hours" className="w-28">
              {(props) => (
                <Input
                  {...props}
                  inputMode="numeric"
                  value={hours}
                  onChange={(event) => setHours(event.target.value.replace(/[^\d]/g, ""))}
                />
              )}
            </Field>
            <Field label="Minutes" className="w-28">
              {(props) => (
                <Input
                  {...props}
                  inputMode="numeric"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value.replace(/[^\d]/g, ""))}
                />
              )}
            </Field>
          </div>
          {error ? (
            <p className="text-small text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-small font-medium text-ink">
            How well did you sleep? <span className="font-normal text-muted">(optional)</span>
          </legend>
          <p className="text-small text-muted">
            0 is the worst night you can remember. 10 is the best.
          </p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 11 }, (_, score) => (
              <label
                key={score}
                className="flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-pill border border-line bg-white px-3 text-body has-[:checked]:border-forest-800 has-[:checked]:bg-forest-800 has-[:checked]:text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-600"
              >
                <input
                  type="radio"
                  name="how-well"
                  value={score}
                  checked={howWell === score}
                  onChange={() => setHowWell(score)}
                  className="sr-only"
                />
                {score}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="How many times did you wake?" className="w-60">
          {(props) => (
            <Input
              {...props}
              inputMode="numeric"
              value={timesWoke}
              onChange={(event) => setTimesWoke(event.target.value.replace(/[^\d]/g, ""))}
            />
          )}
        </Field>

        <Button type="submit" size="lg">
          Save this night
        </Button>
        <p role="status" className="text-small text-ink-soft">
          {said}
        </p>
      </form>

      <p className="text-small text-muted">
        Sleep from a phone or watch can be brought in from a file on the{" "}
        <Link href="/trackers/wearables" className="underline underline-offset-2">
          wearables page
        </Link>
        .
      </p>

      {nights.length > 0 ? (
        <section aria-labelledby="sleep-nights" className="space-y-3">
          <h2 id="sleep-nights" className="text-title">
            Nights you have written down
          </h2>
          <ul className="divide-y divide-line rounded-card border border-line bg-white">
            {nights.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="space-y-1">
                  <p className="font-medium text-ink">{formatDay(entry.night)}</p>
                  <p className="text-small text-ink-soft">
                    Asleep for {formatMinutes(entry.minutesAsleep)}
                    {entry.howWell !== undefined ? ` · You rated it ${entry.howWell} out of 10` : ""}
                    {entry.timesWoke !== undefined
                      ? ` · Woke ${entry.timesWoke === 1 ? "once" : `${entry.timesWoke} times`}`
                      : ""}
                  </p>
                  {entry.origin === "imported" ? <ImportedTag from={entry.importedFrom} /> : null}
                </div>
                <RemoveButton
                  label={`the night of ${formatDay(entry.night)}`}
                  onRemove={() => remove(entry.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <DataControls tracker="sleep" store={sleepStore} records={entries} noun="sleep records" />
    </div>
  );
}
