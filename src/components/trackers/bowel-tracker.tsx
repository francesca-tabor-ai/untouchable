"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { CheckboxRow } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/field";
import { BLOOD_SIGNPOST, needsBloodSignpost } from "@/lib/trackers/bowel";
import { newId, STOOL_TYPES, type BowelEntry } from "@/lib/trackers/records";
import { bowelStore } from "@/lib/trackers/storage";
import { bowelByDay, formatDay, localToday, timesInWords } from "@/lib/trackers/summaries";

import { DataControls, OnThisDevice, RemoveButton, useRecords } from "./tracker-parts";

/**
 * Bowel habits: how often, and what it was like.
 *
 * "What it was like" is the Bristol stool chart, the seven types GPs use, in plain words and
 * with none of them marked as the one to aim for. How often is a count per day, shown as a
 * count.
 *
 * Ticking blood brings up the NHS signposting in `bowel.ts`, straight away, before saving —
 * the moment somebody says so is the moment it is useful to them.
 */

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

const describe = (type: number) =>
  STOOL_TYPES.find((option) => option.type === type)?.description ?? "";

export function BowelTracker() {
  const entries = useRecords(bowelStore);
  const [day, setDay] = React.useState(localToday);
  const [time, setTime] = React.useState(nowTime);
  const [stoolType, setStoolType] = React.useState<number | null>(null);
  const [blood, setBlood] = React.useState(false);
  const [pain, setPain] = React.useState(false);
  const [urgent, setUrgent] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>();
  const [said, setSaid] = React.useState("");
  const [lastHadBlood, setLastHadBlood] = React.useState(false);

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (stoolType === null) {
      setError("Choose the one that is closest. It does not have to be exact.");
      return;
    }
    setError(undefined);
    const entry: BowelEntry = {
      id: newId(),
      day,
      time: time || undefined,
      stoolType,
      blood,
      pain,
      urgent,
    };
    bowelStore.save([...entries, entry]);
    setSaid(`Saved, ${formatDay(day)}${time ? ` at ${time}` : ""}.`);
    setLastHadBlood(blood);
    setStoolType(null);
    setBlood(false);
    setPain(false);
    setUrgent(false);
    setTime(nowTime());
  };

  const remove = (id: string) => bowelStore.save(entries.filter((entry) => entry.id !== id));
  const days = bowelByDay(entries);
  const showSignpost = needsBloodSignpost([{ blood }, { blood: lastHadBlood }]);

  return (
    <div className="space-y-10">
      <OnThisDevice />

      <form onSubmit={save} className="space-y-6" noValidate aria-labelledby="bowel-add">
        <h2 id="bowel-add" className="text-title">
          Add one
        </h2>

        <div className="flex flex-wrap gap-4">
          <Field label="Day" required>
            {(props) => (
              <Input
                {...props}
                type="date"
                value={day}
                max={localToday()}
                onChange={(event) => setDay(event.target.value || localToday())}
                className="w-48"
              />
            )}
          </Field>
          <Field label="Time">
            {(props) => (
              <Input
                {...props}
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-36"
              />
            )}
          </Field>
        </div>

        <fieldset className="space-y-2" aria-describedby={error ? "bowel-type-error" : undefined}>
          <legend className="text-small font-medium text-ink">
            What was it like? <span className="text-clay-700">*</span>
          </legend>
          <p className="text-small text-muted">Choose the closest. It does not have to be exact.</p>
          <div className="space-y-2">
            {STOOL_TYPES.map((option) => (
              <label
                key={option.type}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-field border border-line bg-white px-4 py-2 has-[:checked]:border-forest-800 has-[:checked]:bg-forest-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-600"
              >
                <input
                  type="radio"
                  name="stool-type"
                  value={option.type}
                  checked={stoolType === option.type}
                  onChange={() => setStoolType(option.type)}
                  className="size-4 accent-forest-800"
                />
                <span>
                  <span className="font-medium">Type {option.type}.</span> {option.description}
                </span>
              </label>
            ))}
          </div>
          {error ? (
            <p id="bowel-type-error" className="text-small text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-small font-medium text-ink">
            Anything else? <span className="font-normal text-muted">(optional)</span>
          </legend>
          <CheckboxRow
            name="blood"
            label="There was blood, or it was black and sticky"
            checked={blood}
            onCheckedChange={setBlood}
          />
          <CheckboxRow name="pain" label="It hurt" checked={pain} onCheckedChange={setPain} />
          <CheckboxRow
            name="urgent"
            label="I had to rush to get there"
            checked={urgent}
            onCheckedChange={setUrgent}
          />
        </fieldset>

        {showSignpost ? (
          <section
            aria-labelledby="bowel-signpost"
            className="rounded-card border border-forest-200 bg-forest-50 p-5"
          >
            <h3 id="bowel-signpost" className="font-semibold text-ink">
              {BLOOD_SIGNPOST.title}
            </h3>
            <p className="mt-2 text-ink-soft">{BLOOD_SIGNPOST.body}</p>
            <p className="mt-2 text-ink-soft">{BLOOD_SIGNPOST.urgent}</p>
            <p className="mt-3 text-small">
              <a
                href={BLOOD_SIGNPOST.source.href}
                className="underline underline-offset-2"
                rel="noopener noreferrer"
                target="_blank"
              >
                {BLOOD_SIGNPOST.source.label}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </section>
        ) : null}

        <Button type="submit" size="lg">
          Save
        </Button>
        <p role="status" className="text-small text-ink-soft">
          {said}
        </p>
      </form>

      {days.length > 0 ? (
        <section aria-labelledby="bowel-days" className="space-y-4">
          <h2 id="bowel-days" className="text-title">
            Days you have written down
          </h2>
          {days.map((group) => (
            <div key={group.day} className="space-y-2">
              <h3 className="font-semibold text-ink">
                {formatDay(group.day)}{" "}
                <span className="font-normal text-muted">· {timesInWords(group.entries.length)}</span>
              </h3>
              <ul className="divide-y divide-line rounded-card border border-line bg-white">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-ink">
                        {entry.time ? <span className="tabular-nums">{entry.time} · </span> : null}
                        Type {entry.stoolType}: {describe(entry.stoolType)}
                      </p>
                      {entry.blood || entry.pain || entry.urgent ? (
                        <p className="text-small text-ink-soft">
                          {[
                            entry.blood ? "Blood, or black" : null,
                            entry.pain ? "It hurt" : null,
                            entry.urgent ? "Had to rush" : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      ) : null}
                    </div>
                    <RemoveButton
                      label={`the one from ${formatDay(entry.day)}${entry.time ? ` at ${entry.time}` : ""}`}
                      onRemove={() => remove(entry.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <DataControls tracker="bowel" store={bowelStore} records={entries} noun="bowel records" />
    </div>
  );
}
