"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Field, Input } from "@/components/ui/field";
import { bloodResultSchema, newId } from "@/lib/trackers/records";
import { bloodStore } from "@/lib/trackers/storage";
import { bloodResultsByTest, formatDay, localToday } from "@/lib/trackers/summaries";

import { DataControls, OnThisDevice, RemoveButton, useRecords } from "./tracker-parts";

/**
 * Blood test results, written down as they appear on the report.
 *
 * The result is kept as text, exactly as written, and the range beside it is kept exactly as
 * printed. Nothing on this screen compares one with the other: there is no "high", no "low",
 * no red number, no tick. Ranges differ between labs and between people, and what a result
 * means for somebody is for the clinician who ordered the test. AGENTS.md rule 9.
 */

const EMPTY = { takenOn: "", test: "", result: "", unit: "", rangeOnReport: "", cameFrom: "" };
type FormState = typeof EMPTY;
type Errors = Partial<Record<keyof FormState, string>>;

export function BloodTestsTracker() {
  const results = useRecords(bloodStore);
  const [form, setForm] = React.useState<FormState>(() => ({ ...EMPTY, takenOn: localToday() }));
  const [errors, setErrors] = React.useState<Errors>({});
  const [said, setSaid] = React.useState("");

  const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = bloodResultSchema.safeParse({
      id: newId(),
      takenOn: form.takenOn,
      test: form.test,
      result: form.result,
      unit: form.unit.trim() || undefined,
      rangeOnReport: form.rangeOnReport.trim() || undefined,
      cameFrom: form.cameFrom,
    });
    if (!parsed.success) {
      const found: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        found[key] ??= issue.message;
      }
      setErrors(found);
      return;
    }
    setErrors({});
    bloodStore.save([...results, parsed.data]);
    setSaid(`Saved ${parsed.data.test}, taken on ${formatDay(parsed.data.takenOn)}.`);
    // Keep the date and where it came from: results usually arrive several to a report.
    setForm((current) => ({ ...EMPTY, takenOn: current.takenOn, cameFrom: current.cameFrom }));
  };

  const remove = (id: string) => bloodStore.save(results.filter((result) => result.id !== id));
  const groups = bloodResultsByTest(results);

  return (
    <div className="space-y-10">
      <OnThisDevice />

      <Callout tone="care" title="We do not mark results">
        <p>
          Nothing here says whether a result is high, low or in range. Ranges differ between
          labs. Your GP, or whoever ordered the test, can tell you what a result means for you.
        </p>
      </Callout>

      <form onSubmit={save} className="space-y-5" noValidate aria-labelledby="blood-add">
        <h2 id="blood-add" className="text-title">
          Add a result
        </h2>
        <p className="text-small text-muted">
          Copy each one as it is written on the report or in the NHS App. Several results from
          one test? Add them one at a time. The date and where it came from stay filled in.
        </p>

        <Field label="Date the blood was taken" error={errors.takenOn} required>
          {(props) => (
            <Input
              {...props}
              type="date"
              value={form.takenOn}
              max={localToday()}
              onChange={set("takenOn")}
              className="max-w-60"
            />
          )}
        </Field>
        <Field label="Test" hint="For example: ferritin, HbA1c, TSH." error={errors.test} required>
          {(props) => <Input {...props} value={form.test} onChange={set("test")} />}
        </Field>
        <div className="flex flex-wrap gap-4">
          <Field label="Result" error={errors.result} required className="w-40">
            {(props) => <Input {...props} value={form.result} onChange={set("result")} />}
          </Field>
          <Field label="Unit" hint="As printed." className="w-40">
            {(props) => <Input {...props} value={form.unit} onChange={set("unit")} />}
          </Field>
        </div>
        <Field
          label="Range printed on the report"
          hint="Only if there is one. Copy it as it is, for example 30 – 400."
        >
          {(props) => (
            <Input {...props} value={form.rangeOnReport} onChange={set("rangeOnReport")} />
          )}
        </Field>
        <Field
          label="Where it came from"
          hint="For example: GP surgery, hospital clinic, home test kit."
          error={errors.cameFrom}
          required
        >
          {(props) => <Input {...props} value={form.cameFrom} onChange={set("cameFrom")} />}
        </Field>

        <Button type="submit" size="lg">
          Save this result
        </Button>
        <p role="status" className="text-small text-ink-soft">
          {said}
        </p>
      </form>

      {groups.length > 0 ? (
        <section aria-labelledby="blood-results" className="space-y-6">
          <h2 id="blood-results" className="text-title">
            Your results, by test
          </h2>
          {groups.map((group) => (
            <div key={group.test} className="space-y-2">
              <h3 className="font-semibold text-ink">{group.test}</h3>
              <ul className="divide-y divide-line rounded-card border border-line bg-white">
                {group.results.map((result) => (
                  <li key={result.id} className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-ink">
                        <span className="font-medium tabular-nums">{result.result}</span>
                        {result.unit ? ` ${result.unit}` : ""}
                      </p>
                      <p className="text-small text-ink-soft">
                        Taken {formatDay(result.takenOn)} · From {result.cameFrom}
                      </p>
                      {result.rangeOnReport ? (
                        <p className="text-small text-muted">
                          Range printed on the report: {result.rangeOnReport}
                        </p>
                      ) : null}
                    </div>
                    <RemoveButton
                      label={`${result.test} from ${formatDay(result.takenOn)}`}
                      onRemove={() => remove(result.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      ) : null}

      <DataControls tracker="blood" store={bloodStore} records={results} noun="results" />
    </div>
  );
}
