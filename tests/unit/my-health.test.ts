// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { givingLanguageProblem, interpretationProblem } from "@/lib/tracking/no-interpretation";
import { orderTrackers, PLANNED, TRACKERS, type TrackerUsage } from "@/lib/my-health/trackers";

/**
 * My health: the dashboard, the health tracker and education.
 *
 * The dashboard and tracker are also in `tracking-rules.test.tsx`'s scan. Education is here
 * on its own because it links to the NHS, which the tracking screens' outbound-link rule
 * does not allow, and that rule should not be loosened for them to make room for it.
 */

const ROOT = join(__dirname, "..", "..");
const read = (path: string) => readFileSync(path, "utf8");

function filesUnder(directory: string): string[] {
  // `._name` files are macOS metadata written beside every file on a non-APFS drive.
  return readdirSync(directory)
    .filter((entry) => !entry.startsWith("._"))
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? filesUnder(path) : [path];
    });
}

function copyOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

const ROUTES = ["dashboard", "tracker", "learn"].map((route) =>
  join(ROOT, "src/app/(account)", route),
);
const FILES = [...ROUTES.flatMap(filesUnder), ...filesUnder(join(ROOT, "src/lib/my-health"))];

describe("My health", () => {
  it("has a page behind each of its three menu items", () => {
    for (const route of ROUTES) expect(existsSync(join(route, "page.tsx"))).toBe(true);
  });

  it("guards every page with requireAdult and requireTrackingConsent", () => {
    for (const route of ROUTES) {
      const source = read(join(route, "page.tsx"));
      expect(source, route).toMatch(/await requireAdult\(/);
      expect(source, route).toMatch(/await requireTrackingConsent\(/);
    }
  });

  it("never interprets the data, and never asks for money", () => {
    for (const path of FILES) {
      const copy = copyOnly(read(path));
      expect(interpretationProblem(copy), path).toBeNull();
      expect(givingLanguageProblem(copy), path).toBeNull();
    }
  });

  it("links out only to the NHS, and without a referrer", () => {
    for (const path of FILES) {
      const source = read(path);
      for (const [link] of source.matchAll(/https?:\/\/[^\s"'`)]+/g)) {
        expect(link, `${path}: ${link}`).toMatch(/^https:\/\/www\.nhs\.uk\//);
      }
      if (/href="https:/.test(source)) expect(source).toMatch(/rel="noreferrer"/);
    }
  });
});

describe("the health tracker", () => {
  const none = Object.fromEntries(TRACKERS.map((t) => [t.key, false])) as TrackerUsage;

  it("puts the trackers somebody uses first, and keeps the rest on offer", () => {
    const { inUse, notStarted } = orderTrackers({ ...none, medication: true, symptoms: true });
    expect(inUse.map((t) => t.key)).toEqual(["symptoms", "medication"]);
    expect(notStarted.map((t) => t.key)).not.toContain("medication");
    expect(inUse.length + notStarted.length).toBe(TRACKERS.length);
  });

  it("does not claim the Food Advisor is in use, because its data never reaches us", () => {
    const { inUse } = orderTrackers({ ...none, food: null });
    expect(inUse.map((t) => t.key)).not.toContain("food");
  });

  it("points every tracker at a page that exists", () => {
    for (const tracker of TRACKERS) {
      for (const href of [tracker.href, tracker.startHref]) {
        expect(existsSync(join(ROOT, "src/app/(account)", href.slice(1), "page.tsx")), href).toBe(
          true,
        );
      }
    }
  });

  it("says plainly that the questions tracker does not tell you what you have", () => {
    const questions = TRACKERS.find((t) => t.key === "questions");
    expect(questions?.what).toMatch(/does not tell you what you have/);
  });

  it("offers nothing to press for a tracker that is not built", () => {
    // Planned trackers carry a name and a description, and no link.
    for (const tracker of PLANNED) expect(Object.keys(tracker).sort()).toEqual(["name", "what"]);
  });
});
