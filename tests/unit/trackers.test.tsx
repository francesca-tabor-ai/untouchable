import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BloodTestsTracker } from "@/components/trackers/blood-tests-tracker";
import { BowelTracker } from "@/components/trackers/bowel-tracker";
import { SleepTracker } from "@/components/trackers/sleep-tracker";
import { WaterTracker } from "@/components/trackers/water-tracker";
import { WearableImport } from "@/components/trackers/wearable-import";
import { BLOOD_SIGNPOST } from "@/lib/trackers/bowel";
import { bloodResultSchema } from "@/lib/trackers/records";
import {
  bloodStore,
  bowelStore,
  createTrackerStore,
  sleepStore,
  waterStore,
} from "@/lib/trackers/storage";
import {
  bloodResultsByTest,
  bowelByDay,
  formatMinutes,
  waterByDay,
} from "@/lib/trackers/summaries";
import { WEARABLE_SOURCES } from "@/lib/trackers/wearables";
import {
  givingLanguageProblem,
  interpretationProblem,
} from "@/lib/tracking/no-interpretation";

/**
 * The everyday trackers: water, sleep, blood results, bowel habits, and the wearable import.
 *
 * Three kinds of promise. The screens show data and never read anything into it (rule 9) or
 * ask for money (rule 5). Records stay on the device and nothing is sent anywhere (HT-01).
 * And every page guards itself server-side, because the data being in the browser does not
 * make the page public (rule 10).
 */

const ROOT = join(__dirname, "..", "..");

function filesUnder(directory: string): string[] {
  return readdirSync(directory)
    .filter((entry) => !entry.startsWith("._"))
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? filesUnder(path) : [path];
    });
}

const copyOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const ROUTE = join(ROOT, "src/app/(account)/trackers");
const ALL_FILES = [
  ...filesUnder(ROUTE),
  ...filesUnder(join(ROOT, "src/components/trackers")),
  ...filesUnder(join(ROOT, "src/lib/trackers")),
];
const relative = (path: string) => path.replace(`${ROOT}/`, "");

/**
 * Node 25 ships its own `localStorage`, which throws unless Node was started with a file for
 * it, and it shadows jsdom's. A plain in-memory one stands in, for this file only.
 */
class MemoryStorage implements Storage {
  private items = new Map<string, string>();
  get length() {
    return this.items.size;
  }
  clear() {
    this.items.clear();
  }
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  key(index: number) {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
}
Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true });

function clearStores() {
  for (const store of [waterStore, sleepStore, bloodStore, bowelStore]) store.clear();
  window.localStorage.clear();
}

beforeEach(clearStores);
afterEach(clearStores);

describe("the trackers never interpret anything", () => {
  it.each(ALL_FILES.map(relative))("%s says nothing about what the data means", (path) => {
    const problem = interpretationProblem(copyOnly(readFileSync(join(ROOT, path), "utf8")));
    expect(problem, problem ?? "").toBeNull();
  });

  it.each(ALL_FILES.map(relative))("%s asks nobody for money", (path) => {
    expect(givingLanguageProblem(copyOnly(readFileSync(join(ROOT, path), "utf8")))).toBeNull();
  });

  it("renders every tracker with records in it and still says nothing about them", () => {
    waterStore.save([{ id: "w1", day: "2026-09-20", amountMl: 250, origin: "typed" }]);
    sleepStore.save([
      { id: "s1", night: "2026-09-20", minutesAsleep: 200, howWell: 2, origin: "typed" },
    ]);
    bloodStore.save([
      {
        id: "b1",
        takenOn: "2026-09-01",
        test: "Ferritin",
        result: "9",
        unit: "ug/L",
        rangeOnReport: "30 - 400",
        cameFrom: "GP surgery",
      },
    ]);
    bowelStore.save([
      { id: "p1", day: "2026-09-20", stoolType: 7, blood: false, pain: true, urgent: true },
    ]);

    for (const Tracker of [WaterTracker, SleepTracker, BloodTestsTracker, BowelTracker]) {
      const { container, unmount } = render(<Tracker />);
      const text = container.textContent ?? "";
      expect(interpretationProblem(text), text).toBeNull();
      expect(givingLanguageProblem(text)).toBeNull();
      unmount();
    }
  });

  it("shows a blood result outside the printed range exactly like any other", () => {
    bloodStore.save([
      {
        id: "b1",
        takenOn: "2026-09-01",
        test: "Ferritin",
        result: "9",
        rangeOnReport: "30 - 400",
        cameFrom: "GP surgery",
      },
    ]);
    render(<BloodTestsTracker />);
    const results = screen.getByText("Your results, by test").closest("section");
    expect(results?.textContent).not.toMatch(/\b(high|low|out of range|abnormal|flag)/i);
    expect(results?.querySelector("[class*='danger'], [class*='clay']")).toBeNull();
    expect(screen.getByText("Range printed on the report: 30 - 400")).toBeInTheDocument();
  });

  it("never names a type of poo as the one to aim for", () => {
    const { container } = render(<BowelTracker />);
    expect(container.textContent).not.toMatch(/\b(ideal|healthy|normal|target|aim for)\b/i);
  });

  it("offers no daily target for water or sleep", () => {
    for (const Tracker of [WaterTracker, SleepTracker]) {
      const { container, unmount } = render(<Tracker />);
      expect(container.textContent).not.toMatch(/\b(goal|target|recommended|should drink|enough)\b/i);
      unmount();
    }
  });
});

describe("records stay on this device", () => {
  it.each(ALL_FILES.map(relative))("%s sends nothing anywhere", (path) => {
    const source = copyOnly(readFileSync(join(ROOT, path), "utf8"));
    expect(source).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|["']use server["']|@\/lib\/db/);
  });

  it("says so on every tracker", () => {
    for (const Tracker of [WaterTracker, SleepTracker, BloodTestsTracker, BowelTracker]) {
      const { unmount } = render(<Tracker />);
      expect(screen.getByText(/Kept on this device only/)).toBeInTheDocument();
      unmount();
    }
  });

  it("writes to local storage and deletes everything in one confirmed step", async () => {
    const user = userEvent.setup();
    render(<WaterTracker />);

    await user.click(screen.getByRole("button", { name: /^A glass/ }));
    expect(JSON.parse(window.localStorage.getItem(waterStore.key) ?? "[]")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Delete all water records" }));
    await user.click(screen.getByRole("button", { name: "Yes, delete them" }));
    expect(window.localStorage.getItem(waterStore.key)).toBeNull();
    expect(screen.getByText(/Nothing is left on this device/)).toBeInTheDocument();
  });

  it("shows nothing rather than half a list when storage holds something unreadable", () => {
    const store = createTrackerStore("untouchable.trackers.test", bloodResultSchema);
    window.localStorage.setItem(store.key, JSON.stringify([{ id: "x", test: 4 }]));
    expect(store.snapshot()).toEqual([]);
  });
});

describe("every trackers page guards itself", () => {
  const PAGES = filesUnder(ROUTE).filter((path) => path.endsWith("page.tsx"));

  it("has the hub, four trackers and the wearables page", () => {
    expect(PAGES).toHaveLength(6);
  });

  it.each(PAGES.map(relative))("%s calls requireAdult", (path) => {
    expect(readFileSync(join(ROOT, path), "utf8")).toMatch(/await requireAdult\(/);
  });
});

describe("water", () => {
  it("adds a drink in one tap and totals the day", async () => {
    const user = userEvent.setup();
    render(<WaterTracker />);
    await user.click(screen.getByRole("button", { name: /^A glass/ }));
    await user.click(screen.getByRole("button", { name: /^A bottle/ }));
    expect(screen.getByRole("cell", { name: "750 ml" })).toBeInTheDocument();
    expect(screen.getByText(/in 2 drinks/)).toBeInTheDocument();
  });

  it("adds up each day on its own, newest first", () => {
    expect(
      waterByDay([
        { id: "a", day: "2026-09-01", amountMl: 250, origin: "typed" },
        { id: "b", day: "2026-09-02", amountMl: 500, origin: "typed" },
        { id: "c", day: "2026-09-01", amountMl: 150, origin: "imported" },
      ]),
    ).toEqual([
      { day: "2026-09-02", totalMl: 500, drinks: 1 },
      { day: "2026-09-01", totalMl: 400, drinks: 2 },
    ]);
  });
});

describe("sleep", () => {
  it("says a time in words", () => {
    expect(formatMinutes(450)).toBe("7 hours 30 minutes");
    expect(formatMinutes(60)).toBe("1 hour");
    expect(formatMinutes(1)).toBe("1 minute");
  });

  it("keeps one record per night, and a typed one replaces an imported one", async () => {
    sleepStore.save([
      {
        id: "old",
        night: "2026-09-20",
        minutesAsleep: 300,
        origin: "imported",
        importedFrom: "Apple Health",
      },
    ]);
    const user = userEvent.setup();
    render(<SleepTracker />);

    fireEvent.change(screen.getByLabelText(/The night of/), { target: { value: "2026-09-20" } });
    await user.type(screen.getByLabelText(/^Hours/), "6");
    await user.click(screen.getByRole("button", { name: "Save this night" }));

    const stored = sleepStore.snapshot();
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ night: "2026-09-20", minutesAsleep: 360, origin: "typed" });
  });

  it("asks for a time rather than saving an empty night", async () => {
    const user = userEvent.setup();
    render(<SleepTracker />);
    await user.click(screen.getByRole("button", { name: "Save this night" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/how long you slept/);
    expect(sleepStore.snapshot()).toHaveLength(0);
  });
});

describe("blood test results", () => {
  it("keeps a result as it was written, with the date and where it came from", async () => {
    const user = userEvent.setup();
    render(<BloodTestsTracker />);
    await user.type(screen.getByLabelText(/^Test/), "CRP");
    await user.type(screen.getByLabelText(/^Result/), "<0.5");
    await user.type(screen.getByLabelText(/^Where it came from/), "Hospital clinic");
    await user.click(screen.getByRole("button", { name: "Save this result" }));

    const [saved] = bloodStore.snapshot();
    expect(saved).toMatchObject({ test: "CRP", result: "<0.5", cameFrom: "Hospital clinic" });
    // The date and the source stay filled in for the next result from the same report.
    expect(screen.getByLabelText(/^Where it came from/)).toHaveValue("Hospital clinic");
    expect(screen.getByLabelText(/^Test/)).toHaveValue("");
  });

  it("will not save a result without saying where it came from", async () => {
    const user = userEvent.setup();
    render(<BloodTestsTracker />);
    await user.type(screen.getByLabelText(/^Test/), "CRP");
    await user.type(screen.getByLabelText(/^Result/), "3");
    await user.click(screen.getByRole("button", { name: "Save this result" }));
    expect(screen.getByText("Say where the result came from.")).toBeInTheDocument();
    expect(bloodStore.snapshot()).toHaveLength(0);
  });

  it("groups by test alphabetically, whatever the values are", () => {
    const groups = bloodResultsByTest([
      { id: "1", takenOn: "2026-01-01", test: "ferritin ", result: "9", cameFrom: "GP" },
      { id: "2", takenOn: "2026-06-01", test: "Ferritin", result: "40", cameFrom: "GP" },
      { id: "3", takenOn: "2026-03-01", test: "B12", result: "300", cameFrom: "GP" },
    ]);
    expect(groups.map((group) => group.test)).toEqual(["B12", "Ferritin"]);
    expect(groups[1].results.map((result) => result.id)).toEqual(["2", "1"]);
  });
});

describe("bowel habits", () => {
  it("shows the NHS signposting as soon as blood is ticked, before saving", async () => {
    const user = userEvent.setup();
    render(<BowelTracker />);
    expect(screen.queryByText(BLOOD_SIGNPOST.title)).toBeNull();
    await user.click(screen.getByLabelText(/There was blood/));
    expect(screen.getByText(BLOOD_SIGNPOST.title)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /NHS: blood in poo/ })).toHaveAttribute(
      "href",
      "https://www.nhs.uk/conditions/blood-in-poo/",
    );
  });

  it("asks which type rather than guessing one", async () => {
    const user = userEvent.setup();
    render(<BowelTracker />);
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("alert")).toHaveTextContent(/closest/);
    expect(bowelStore.snapshot()).toHaveLength(0);
  });

  it("counts how often on each day", () => {
    const days = bowelByDay([
      { id: "a", day: "2026-09-01", time: "18:00", stoolType: 4, blood: false, pain: false, urgent: false },
      { id: "b", day: "2026-09-01", time: "07:00", stoolType: 5, blood: false, pain: false, urgent: false },
      { id: "c", day: "2026-09-02", stoolType: 3, blood: false, pain: false, urgent: false },
    ]);
    expect(days.map((day) => [day.day, day.entries.length])).toEqual([
      ["2026-09-02", 1],
      ["2026-09-01", 2],
    ]);
    expect(days[1].entries.map((entry) => entry.id)).toEqual(["b", "a"]);
  });
});

describe("wearables", () => {
  it("does not offer a direct connection that does not exist", () => {
    const source = readFileSync(join(ROUTE, "wearables/page.tsx"), "utf8");
    expect(source).not.toMatch(/>\s*Connect\s*</);
    expect(WEARABLE_SOURCES.filter((item) => item.status === "not-yet").length).toBeGreaterThan(0);
  });

  it("says the file is not uploaded", () => {
    render(<WearableImport />);
    expect(screen.getByText(/It is not uploaded/)).toBeInTheDocument();
  });
});
