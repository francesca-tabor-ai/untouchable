"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { newId } from "@/lib/trackers/records";
import { sleepStore, waterStore } from "@/lib/trackers/storage";
import {
  createAppleHealthReader,
  parseCsv,
  planSleepImport,
  planWaterImport,
  type ImportResult,
  type ImportedSleep,
  type ImportedWater,
} from "@/lib/trackers/wearable-import";

import { useRecords } from "./tracker-parts";

/**
 * Bring sleep and water in from a file exported from a phone or watch.
 *
 * The file is read here, in the browser, and never sent anywhere. Nothing is added until the
 * person has seen what was found and said yes. Nights and days they already have are left
 * as they are — see `planSleepImport`.
 */

type Stage =
  | { kind: "idle" }
  | { kind: "reading" }
  | { kind: "problem"; message: string }
  | {
      kind: "preview";
      sleep: ImportedSleep[];
      water: ImportedWater[];
      sleepHeld: number;
      waterHeld: number;
      skipped: number;
    }
  | { kind: "done"; nights: number; days: number };

/** Feed a file to a reader one line at a time, so a very large export never sits in memory. */
async function eachLine(file: File, onLine: (line: string) => void): Promise<void> {
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  let carried = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const lines = (carried + value).split(/\r?\n/);
    carried = lines.pop() ?? "";
    for (const line of lines) onLine(line);
  }
  if (carried) onLine(carried);
}

async function readFile(file: File): Promise<ImportResult | { problem: string }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xml")) {
    const apple = createAppleHealthReader("Apple Health");
    await eachLine(file, apple.line);
    return apple.result();
  }
  if (name.endsWith(".csv")) {
    return parseCsv(await file.text(), "a spreadsheet");
  }
  if (name.endsWith(".zip")) {
    return {
      problem:
        "This is the zipped export. Unzip it first, then choose the file called export.xml inside it.",
    };
  }
  return { problem: "We can read an Apple Health export.xml, or a spreadsheet saved as .csv." };
}

const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

export function WearableImport() {
  const sleep = useRecords(sleepStore);
  const water = useRecords(waterStore);
  const [stage, setStage] = React.useState<Stage>({ kind: "idle" });
  const inputId = React.useId();

  const choose = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setStage({ kind: "reading" });
    try {
      const read = await readFile(file);
      if ("problem" in read) {
        setStage({ kind: "problem", message: read.problem });
        return;
      }
      if (read.sleep.length === 0 && read.water.length === 0) {
        setStage({ kind: "problem", message: "We did not find any sleep or water in this file." });
        return;
      }
      const sleepPlan = planSleepImport(sleep, read.sleep);
      const waterPlan = planWaterImport(water, read.water);
      setStage({
        kind: "preview",
        sleep: sleepPlan.add,
        water: waterPlan.add,
        sleepHeld: sleepPlan.alreadyHeld,
        waterHeld: waterPlan.alreadyHeld,
        skipped: read.skipped,
      });
    } catch {
      setStage({ kind: "problem", message: "We could not read this file. Nothing was added." });
    }
  };

  const confirm = () => {
    if (stage.kind !== "preview") return;
    sleepStore.save([...sleep, ...stage.sleep.map((entry) => ({ ...entry, id: newId() }))]);
    waterStore.save([...water, ...stage.water.map((entry) => ({ ...entry, id: newId() }))]);
    setStage({ kind: "done", nights: stage.sleep.length, days: stage.water.length });
  };

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={inputId}
          className="inline-flex h-13 cursor-pointer items-center rounded-pill bg-clay-500 px-6 text-body font-medium text-forest-900 hover:bg-clay-600 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-600"
        >
          Choose a file
          <input
            id={inputId}
            type="file"
            accept=".xml,.csv,.zip,text/xml,text/csv"
            onChange={choose}
            className="sr-only"
          />
        </label>
        <p className="mt-2 text-small text-muted">
          The file is read on this device. It is not uploaded, and we never see it.
        </p>
      </div>

      <div role="status" aria-live="polite">
        {stage.kind === "reading" ? (
          <p className="text-ink-soft">Reading the file. A large one can take a minute.</p>
        ) : null}

        {stage.kind === "problem" ? (
          <Callout tone="neutral" title="Nothing was added">
            <p>{stage.message}</p>
          </Callout>
        ) : null}

        {stage.kind === "done" ? (
          <Callout tone="care" title="Added">
            <p>
              {plural(stage.nights, "night of sleep", "nights of sleep")} and{" "}
              {plural(stage.days, "day of water", "days of water")}. See them in{" "}
              <Link href="/trackers/sleep">Sleep</Link> and <Link href="/trackers/water">Water</Link>
              .
            </p>
          </Callout>
        ) : null}
      </div>

      {stage.kind === "preview" ? (
        <section aria-labelledby="import-preview" className="rounded-card border border-line bg-white p-5">
          <h3 id="import-preview" className="text-title">
            What we found
          </h3>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-ink-soft">
            <li>{plural(stage.sleep.length, "new night of sleep", "new nights of sleep")}</li>
            <li>{plural(stage.water.length, "new day of water", "new days of water")}</li>
            {stage.sleepHeld + stage.waterHeld > 0 ? (
              <li>
                {plural(stage.sleepHeld + stage.waterHeld, "night or day", "nights or days")} you
                already have, left as they are
              </li>
            ) : null}
            {stage.skipped > 0 ? (
              <li>{plural(stage.skipped, "row", "rows")} we could not read, left out</li>
            ) : null}
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={confirm}
              disabled={stage.sleep.length + stage.water.length === 0}
            >
              Add them
            </Button>
            <Button type="button" variant="secondary" onClick={() => setStage({ kind: "idle" })}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
