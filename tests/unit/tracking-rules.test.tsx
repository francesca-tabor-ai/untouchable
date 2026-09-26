// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TreatmentSummary } from "@/components/tracking/treatment-summary";
import { YellowCardNote } from "@/components/tracking/yellow-card-note";
import { CONTEXT_TAGS } from "@/lib/tracking/context-tags";
import { givingLanguageProblem, interpretationProblem } from "@/lib/tracking/no-interpretation";
import { INTERVENTION_TYPES } from "@/lib/tracking/interventions";
import { SEVERITY_OPTIONS } from "@/lib/tracking/side-effects";
import { STOP_REASONS } from "@/lib/tracking/treatments";

/**
 * Rules about the whole tracking surface rather than about one function.
 *
 * A tracking UI breaks "show data, never interpret it" one label at a time, and no
 * behavioural test notices, because nobody writes a test for the heading they were about to
 * write. So the copy is read by a detector and the guards are read out of the source.
 */

const ROOT = join(__dirname, "..", "..");

function filesUnder(directory: string): string[] {
  // `._name` files are macOS metadata written beside every file on a non-APFS drive.
  return readdirSync(directory)
    .filter((entry) => !entry.startsWith("._"))
    .flatMap((entry) => {
      const path = join(directory, entry);
      return statSync(path).isDirectory() ? filesUnder(path) : [path];
    });
}

const read = (path: string) => readFileSync(path, "utf8");

/**
 * Source with the comments taken out.
 *
 * The rule is about what a person reads on the screen. Explaining the rule in a comment —
 * "never say a treatment is working" — must not trip the detector that enforces it.
 */
function copyOnly(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
}

const TRACKING_ROUTES = [
  join(ROOT, "src/app/(account)/log"),
  join(ROOT, "src/app/(account)/treatments"),
  join(ROOT, "src/app/(account)/onboarding/treatments"),
  join(ROOT, "src/app/(account)/dashboard"),
  join(ROOT, "src/app/(account)/tracker"),
];

const TRACKING_COMPONENTS = join(ROOT, "src/components/tracking");
const TRACKING_LIB = join(ROOT, "src/lib/tracking");

/**
 * Everything a person can end up reading, plus the domain behind it.
 *
 * `no-interpretation.ts` is left out on purpose: it is the detector, and it necessarily
 * contains every phrase it exists to catch. It is checked by its own tests above.
 */
const ALL_TRACKING_FILES = [
  ...TRACKING_ROUTES.flatMap(filesUnder),
  ...filesUnder(TRACKING_COMPONENTS),
  ...filesUnder(TRACKING_LIB),
].filter((path) => !path.endsWith("no-interpretation.ts"));

const PAGES = TRACKING_ROUTES.flatMap(filesUnder).filter((path) => path.endsWith("page.tsx"));
const ACTIONS = TRACKING_ROUTES.flatMap(filesUnder).filter((path) => path.endsWith("actions.ts"));

describe("nothing in the tracking UI interprets the data", () => {
  // AGENTS.md rule 9, brief 7.7. The single easiest rule to break by accident here.

  it("has a detector that actually catches the phrasings we reach for", () => {
    expect(interpretationProblem("Your pain is improving")).toBeTruthy();
    expect(interpretationProblem("Fatigue is trending down")).toBeTruthy();
    expect(interpretationProblem("This treatment seems to be working")).toBeTruthy();
    expect(interpretationProblem("A good score this week")).toBeTruthy();
    expect(interpretationProblem("We recommend carrying on")).toBeTruthy();
    expect(interpretationProblem("Better than last month")).toBeTruthy();
    expect(interpretationProblem("Well done, keep it up")).toBeTruthy();

    // And leaves the things we do say alone.
    expect(interpretationProblem("Fatigue, 6 out of 10, on 16 September 2026")).toBeNull();
    expect(interpretationProblem("You stopped this on 1 June 2026. Side effects.")).toBeNull();
    expect(interpretationProblem("0 — not at all. 10 — as bad as it has been.")).toBeNull();
  });

  it("finds none of it anywhere in the tracking screens", () => {
    for (const path of ALL_TRACKING_FILES) {
      const problem = interpretationProblem(copyOnly(read(path)));
      expect(problem, `${path} interprets the data: ${problem}`).toBeNull();
    }
  });

  it("finds none of it in the labels a person actually chooses between", () => {
    const labels = [
      ...CONTEXT_TAGS.map((tag) => tag.label),
      ...STOP_REASONS.map((reason) => reason.label),
      ...SEVERITY_OPTIONS.map((option) => option.label),
      ...INTERVENTION_TYPES.flatMap((type) => [type.label, type.hint]),
    ];

    for (const label of labels) {
      expect(interpretationProblem(label), `"${label}"`).toBeNull();
    }
  });

  it("shows a stopped treatment as a fact, not as a failure", () => {
    const markup = renderToStaticMarkup(
      <TreatmentSummary
        course={{
          id: "course-1",
          dose: "500mg",
          frequency: "Twice a day",
          route: "By mouth",
          startDate: new Date("2026-03-02T00:00:00Z"),
          endDate: new Date("2026-06-01T00:00:00Z"),
          stopReason: "not_working",
          adherenceRating: 7,
          intervention: { name: "Metformin", type: "rx", dmdCode: null },
        }}
      />,
    );

    expect(interpretationProblem(markup)).toBeNull();
    expect(markup).toContain("Stopped");
    expect(markup).toContain("1 June 2026");
    // The person's own answer, shown back. Not our conclusion about the treatment.
    expect(markup).toContain("It was not doing anything for me");
    expect(markup).not.toMatch(/failed|unsuccessful|did not work for you/i);
  });

  it("uses no colour to say whether a number is good or bad", () => {
    const slider = read(join(TRACKING_COMPONENTS, "score-slider.tsx"));
    // One track colour and one thumb colour, at every value on the scale.
    expect(slider).not.toMatch(/color-danger|color-positive|color-caution|text-danger/);
    expect(slider).toMatch(/bg-cream-300/);
    expect(slider).toMatch(/bg-forest-800/);
  });
});

describe("the Yellow Card signpost cannot go missing", () => {
  // Brief 7.8. The stamp is written by the same call that creates the report
  // (tests/unit/treatment-side-effects.test.tsx), and the screen that receives the report
  // renders the note unconditionally — not only once a report exists, so there is no state
  // in which one has been saved and the link is not there.
  it("renders on the treatment page whether or not anything has been reported", () => {
    const page = read(join(ROOT, "src/app/(account)/treatments/[id]/page.tsx"));
    const section = page.slice(page.indexOf("Side effects"));

    expect(section).toContain("<YellowCardNote />");
    // Not wrapped in a "if there are any reports" condition.
    expect(section).not.toMatch(
      /sideEffectReports\.length > 0 \? \(\s*<div[^>]*>\s*<YellowCardNote/,
    );
  });

  it("stamps the record in the same write that creates the report", () => {
    const sideEffects = read(join(TRACKING_LIB, "side-effects.ts"));
    const create = sideEffects.slice(sideEffects.indexOf("sideEffectReport.create"));
    expect(create).toMatch(/yellowCardShownAt: new Date\(\)/);
  });
});

describe("no donation prompts on any tracking surface", () => {
  // Brief 6.4 and AGENTS.md rule 5. The charity team's `donationPromptAllowed` is the only
  // thing that decides where a prompt may appear, and nothing here goes round it.
  it("has none in the screens, the components or the domain", () => {
    for (const path of ALL_TRACKING_FILES) {
      const problem = givingLanguageProblem(read(path));
      expect(problem, `${path} asks for money: ${problem}`).toBeNull();
    }
  });

  it("has none in the Yellow Card note, which is a safety surface", () => {
    expect(givingLanguageProblem(renderToStaticMarkup(<YellowCardNote />))).toBeNull();
  });

  it("does not reach for the charity prompt machinery at all", () => {
    for (const path of ALL_TRACKING_FILES) {
      expect(read(path), `${path} imports the donation prompt gate`).not.toMatch(
        /from "@\/lib\/charities/,
      );
    }
  });
});

describe("every tracking screen is guarded", () => {
  // AGENTS.md section 8 and rule 10. A page guard is not a request guard, so both are checked.
  it("calls requireAdult and requireTrackingConsent on every page", () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(4);
    for (const path of PAGES) {
      const source = read(path);
      expect(source, `${path} must call requireAdult`).toMatch(/await requireAdult\(/);
      expect(source, `${path} must call requireTrackingConsent`).toMatch(
        /await requireTrackingConsent\(/,
      );
    }
  });

  it("calls both again in every action, because an action is its own request", () => {
    expect(ACTIONS.length).toBeGreaterThanOrEqual(3);
    for (const path of ACTIONS) {
      const source = read(path);
      const bodies = source.split(/export async function /).slice(1);
      expect(bodies.length).toBeGreaterThan(0);

      for (const body of bodies) {
        const name = body.slice(0, body.indexOf("("));
        expect(body, `${name} in ${path} must call requireAdult`).toMatch(/await requireAdult\(/);
        expect(body, `${name} in ${path} must call requireTrackingConsent`).toMatch(
          /await requireTrackingConsent\(/,
        );
      }
    }
  });

  it("looks every treatment up by owner, so an id from a form cannot reach anybody else's", () => {
    const treatments = read(join(TRACKING_LIB, "treatments.ts"));
    const sideEffects = read(join(TRACKING_LIB, "side-effects.ts"));

    // Every read and write of a course is scoped to (id, userId).
    const unscoped = treatments.match(
      /treatmentCourse\.(findFirst|findUnique)\(\{\s*where: \{ id(?!, userId)/g,
    );
    expect(unscoped).toBeNull();
    expect(sideEffects).toMatch(/where: \{ id: treatmentCourseId, userId \}/);
  });
});

describe("no third-party anything on a signed-in health page", () => {
  // AGENTS.md rule 11. Health data does not go past an analytics tag.
  it("loads nothing external from the tracking screens", () => {
    const suspicious =
      /googletagmanager|google-analytics|gtag\(|segment\.com|hotjar|mixpanel|facebook\.net|<script\s+src=/i;
    for (const path of ALL_TRACKING_FILES) {
      expect(read(path), `${path} loads something third-party`).not.toMatch(suspicious);
    }
  });

  it("links out only to the MHRA, and then with no referrer", () => {
    const externalLinks = ALL_TRACKING_FILES.flatMap((path) =>
      [...read(path).matchAll(/https?:\/\/[^\s"'`)]+/g)].map((match) => match[0]),
    );

    for (const link of externalLinks) {
      expect(link, `unexpected external link: ${link}`).toMatch(/yellowcard\.mhra\.gov\.uk/);
    }
    expect(read(join(TRACKING_COMPONENTS, "yellow-card-note.tsx"))).toMatch(
      /rel="noopener noreferrer"/,
    );
  });
});

describe("free text is marked as free text everywhere it is stored", () => {
  // AGENTS.md rule 7. Notes, stop reasons and side effect descriptions never leave the system.
  it("says so beside each of the three fields", () => {
    expect(read(join(TRACKING_LIB, "daily-log.ts"))).toMatch(/FREE TEXT — never exported/);
    expect(read(join(TRACKING_LIB, "treatments.ts"))).toMatch(/FREE TEXT — never exported/);
    expect(read(join(TRACKING_LIB, "side-effects.ts"))).toMatch(/FREE TEXT — never exported/);
  });

  it("tells the person, on the screen, that only they will see it", () => {
    const sources = filesUnder(TRACKING_COMPONENTS).map(read).join("\n");
    const daily = read(join(ROOT, "src/app/(account)/log/page.tsx"));

    expect(sources).toMatch(/Only you will ever see this/);
    expect(sources + daily).toMatch(/never included in (any )?research/i);
  });
});
