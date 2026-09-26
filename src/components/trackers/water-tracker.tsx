"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { newId, WATER_QUICK_AMOUNTS, type WaterEntry } from "@/lib/trackers/records";
import { waterStore } from "@/lib/trackers/storage";
import { formatDay, formatMl, localToday, waterByDay } from "@/lib/trackers/summaries";

import { DataControls, ImportedTag, OnThisDevice, RemoveButton, useRecords } from "./tracker-parts";

/**
 * Water: how much somebody drank in a day.
 *
 * A drink is one tap. There is no daily amount to reach, no progress bar and no "you have
 * had enough" — how much water a person needs depends on their body, their medicines and
 * their condition, and some people are told by a clinician to drink less, not more. The
 * screen adds up what was typed, and that is all.
 */
export function WaterTracker() {
  const entries = useRecords(waterStore);
  const [day, setDay] = React.useState(localToday);
  const [custom, setCustom] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [said, setSaid] = React.useState("");

  const add = (amountMl: number) => {
    const entry: WaterEntry = { id: newId(), day, amountMl, origin: "typed" };
    waterStore.save([...entries, entry]);
    setSaid(`Added ${formatMl(amountMl)} on ${formatDay(day)}.`);
  };

  const addCustom = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(custom);
    if (!Number.isInteger(amount) || amount < 1 || amount > 5000) {
      setError("Write an amount in millilitres, from 1 to 5,000.");
      return;
    }
    setError(undefined);
    add(amount);
    setCustom("");
  };

  const remove = (id: string) => waterStore.save(entries.filter((entry) => entry.id !== id));

  const days = waterByDay(entries);
  const chosenDay = entries.filter((entry) => entry.day === day);
  const chosenTotal = chosenDay.reduce((sum, entry) => sum + entry.amountMl, 0);

  return (
    <div className="space-y-10">
      <OnThisDevice />

      <section aria-labelledby="water-add" className="space-y-5">
        <h2 id="water-add" className="text-title">
          Add a drink
        </h2>

        <Field label="Day" required>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={day}
              max={localToday()}
              onChange={(event) => setDay(event.target.value || localToday())}
              className="max-w-60"
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {WATER_QUICK_AMOUNTS.map((option) => (
            <Button
              key={option.amountMl}
              type="button"
              variant="secondary"
              className="h-auto flex-col py-3"
              onClick={() => add(option.amountMl)}
            >
              <span>{option.label}</span>
              <span className="text-small text-muted">{formatMl(option.amountMl)}</span>
            </Button>
          ))}
        </div>

        <form onSubmit={addCustom} className="flex flex-wrap items-end gap-3" noValidate>
          <Field label="Another amount, in ml" error={error} className="w-48">
            {(props) => (
              <Input
                {...props}
                inputMode="numeric"
                value={custom}
                onChange={(event) => setCustom(event.target.value.replace(/[^\d]/g, ""))}
              />
            )}
          </Field>
          <Button type="submit" variant="secondary">
            Add
          </Button>
        </form>

        <p role="status" className="text-small text-ink-soft">
          {said}
        </p>
      </section>

      <section aria-labelledby="water-day" className="space-y-3">
        <h2 id="water-day" className="text-title">
          {formatDay(day)}
        </h2>
        {chosenDay.length === 0 ? (
          <p className="text-muted">Nothing written down for this day.</p>
        ) : (
          <>
            <p className="text-lead">
              {formatMl(chosenTotal)}{" "}
              <span className="text-body text-muted">
                in {chosenDay.length === 1 ? "1 drink" : `${chosenDay.length} drinks`}
              </span>
            </p>
            <ul className="divide-y divide-line rounded-card border border-line bg-white">
              {chosenDay.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="flex flex-wrap items-center gap-2">
                    {formatMl(entry.amountMl)}
                    {entry.origin === "imported" ? <ImportedTag from={entry.importedFrom} /> : null}
                  </span>
                  <RemoveButton label={formatMl(entry.amountMl)} onRemove={() => remove(entry.id)} />
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {days.length > 0 ? (
        <section aria-labelledby="water-days" className="space-y-3">
          <h2 id="water-days" className="text-title">
            Every day you have written down
          </h2>
          <table className="w-full text-left">
            <caption className="sr-only">Water by day, newest first</caption>
            <thead>
              <tr className="border-b border-line text-small text-muted">
                <th scope="col" className="py-2 font-medium">
                  Day
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((row) => (
                <tr key={row.day} className="border-b border-line">
                  <td className="py-2">
                    <button
                      type="button"
                      className="text-left underline underline-offset-2 hover:text-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600"
                      onClick={() => setDay(row.day)}
                    >
                      {formatDay(row.day)}
                    </button>
                  </td>
                  <td className="py-2 text-right tabular-nums">{formatMl(row.totalMl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <DataControls tracker="water" store={waterStore} records={entries} noun="water records" />
    </div>
  );
}
