// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  givingLanguageProblem,
  interpretationProblem,
} from "@/lib/tracking/no-interpretation";

/**
 * Rules about the whole timeline surface rather than about one function.
 *
 * A feature like this breaks its own rules one label at a time, and no behavioural test
 * notices, because nobody writes a test for the heading they are about to write. So the copy
 * is read by a detector and the guards are read out of the source.
 */

const ROOT = join(__dirname, "..", "..");

/**
 * Every file under a directory, skipping the AppleDouble sidecars macOS writes on exFAT.
 * They shadow every real filename with a `._` copy that is not source — see DECISIONS.md
 * PL-17, which is also why the vitest config excludes them.
 */
function filesUnder(directory: string): string[] {
  return readdirSync(directory)
    .filter((entry) => !entry.startsWith("._"))
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? filesUnder(path) : [path];
    });
}

const read = (path: string) => readFileSync(path, "utf8");
const relative = (path: string) => path.replace(`${ROOT}/`, "");

/**
 * Source with the comments taken out. The rule is about what a person reads on the screen,
 * so explaining the rule in a comment must not trip the detector that enforces it.
 */
const copyOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");

const ROUTE = join(ROOT, "src/app/(account)/timeline");
const COMPONENTS = join(ROOT, "src/components/timeline");
const LIB = join(ROOT, "src/lib/timeline");

const ALL_FILES = [...filesUnder(ROUTE), ...filesUnder(COMPONENTS), ...filesUnder(LIB)];

const PAGES = filesUnder(ROUTE).filter((path) => path.endsWith("page.tsx"));
const ACTIONS = filesUnder(ROUTE).filter((path) => path.endsWith("actions.ts"));
const HANDLERS = filesUnder(ROUTE).filter((path) => path.endsWith("route.ts"));

describe("the timeline never interprets anything", () => {
  // The candidate matrix is a deliberate exception to rule 9, recorded in DECISIONS.md
  // PL-49, and it is narrow: the grid states fit, in words the person chose, on its own
  // page. It buys no licence anywhere else, which is why this list has no exclusions on it.
  it.each(ALL_FILES.map(relative))("%s says nothing about what the data means", (path) => {
    expect(interpretationProblem(copyOnly(read(join(ROOT, path))))).toBeNull();
  });

  it.each(ALL_FILES.map(relative))("%s asks nobody for money", (path) => {
    expect(givingLanguageProblem(copyOnly(read(join(ROOT, path))))).toBeNull();
  });
});

describe("every route guards itself", () => {
  it("has pages and actions to check", () => {
    expect(PAGES.length).toBeGreaterThan(0);
    expect(ACTIONS.length).toBeGreaterThan(0);
  });

  it.each(PAGES.map(relative))("%s calls a guard of its own", (path) => {
    // A layout is not a reliable place to enforce anything — AGENTS.md section 8.
    expect(read(join(ROOT, path))).toMatch(/requireAdult\(/);
  });

  it.each(PAGES.map(relative))("%s checks tracking consent", (path) => {
    expect(read(join(ROOT, path))).toMatch(/requireTrackingConsent\(/);
  });

  it.each(ACTIONS.map(relative))("%s guards inside the action, not at the caller", (path) => {
    const source = read(join(ROOT, path));
    expect(source).toMatch(/requireAdult\(/);
    expect(source).toMatch(/requireTrackingConsent\(/);
  });

  it.each(HANDLERS.map(relative))("%s guards the handler as well", (path) => {
    // A download is a read of special category data and is exempt from nothing.
    const source = read(join(ROOT, path));
    expect(source).toMatch(/requireAdult\(/);
    expect(source).toMatch(/requireTrackingConsent\(/);
  });

  it.each(HANDLERS.map(relative))("%s is never cached", (path) => {
    // The response is one person's entire health record. A copy left in a cache on a shared
    // machine is the thing this platform exists not to do.
    expect(read(join(ROOT, path))).toMatch(/"Cache-Control": "no-store, private"/);
  });
});

describe("a \"use server\" file exports only async functions", () => {
  // Exporting a constant or a type from one fails at build time with a message naming a
  // page rather than the file, which sends you looking in the wrong place entirely.
  it.each(ACTIONS.map(relative))("%s exports nothing but actions", (path) => {
    const source = read(join(ROOT, path));
    if (!source.includes('"use server"')) return;

    const exports = [...source.matchAll(/^export\s+(.*)$/gm)].map((match) => match[1]);
    for (const line of exports) expect(line).toMatch(/^async function/);
  });
});

describe("the candidate matrix never reaches a clinician", () => {
  it("is not built anywhere in the handover module", () => {
    const source = read(join(LIB, "handover.ts"));

    expect(source).not.toMatch(/buildMatrix/);
    expect(source).not.toMatch(/MATRIX_FRAMING/);
    expect(source).not.toMatch(/MATRIX_FIT_LABELS/);
  });

  it("is not rendered on the handover page", () => {
    const source = read(join(ROUTE, "handover/page.tsx"));

    expect(source).not.toMatch(/MatrixTable/);
    expect(source).not.toMatch(/matrix/i);
  });
});

describe("free text is marked in the schema so a research export cannot take it", () => {
  const schema = read(join(ROOT, "prisma/schema.prisma"));

  const section = schema.slice(schema.indexOf("// Symptom timeline and clinical handover"));

  it.each([
    ["Observation", "character"],
    ["Observation", "triggers"],
    ["TimelineEvent", "description"],
    ["TimelineEvent", "outcome"],
    ["StandingFact", "value"],
    ["Candidate", "name"],
    ["Candidate", "excludedBy"],
    ["CandidateAssessment", "note"],
  ])("%s.%s carries the FREE TEXT marker", (model, field) => {
    const body = section.slice(section.indexOf(`model ${model} {`));
    const upTo = body.slice(0, body.indexOf(`${field} `));
    const lastMarker = upTo.lastIndexOf("FREE TEXT — never exported");
    const lastBlankRun = upTo.lastIndexOf("\n\n");

    expect(lastMarker).toBeGreaterThan(-1);
    expect(lastMarker).toBeGreaterThan(lastBlankRun);
  });

  it("keeps the timeline out of the aggregate query layer entirely", () => {
    // AGENTS.md rules 6 and 7. Every aggregate query goes through aggregate.ts, and free
    // text never leaves in a research export. The simplest way to guarantee the second is
    // for the research layer never to have heard of these tables.
    const aggregate = read(join(ROOT, "src/lib/research/aggregate.ts"));

    for (const model of ["observation", "timelineEvent", "standingFact", "candidate"]) {
      expect(aggregate.toLowerCase()).not.toContain(`db.${model.toLowerCase()}`);
    }
  });
});

describe("no third-party anything on a page with health content", () => {
  it.each(ALL_FILES.map(relative))("%s loads no external script or resource", (path) => {
    const source = read(join(ROOT, path));

    expect(source).not.toMatch(/<script\b/i);
    expect(source).not.toMatch(/https?:\/\/(?!localhost)/);
  });
});
