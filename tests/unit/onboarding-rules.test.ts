// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Rules that are about the whole surface rather than one function, checked by reading the
 * source. A guard that is missing from one page out of six is exactly the kind of thing a
 * behavioural test never notices, because nobody writes a test for the page they forgot.
 */
const ROOT = join(__dirname, "..", "..");

function filesUnder(directory: string): string[] {
  const entries = readdirSync(directory);
  return entries.flatMap((entry) => {
    // AppleDouble sidecars macOS writes on exFAT. They are named after the real file, so a
    // "._page.tsx" reads as a page with no guard in it. See DECISIONS.md PL-17.
    if (entry.startsWith("._")) return [];
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

const read = (path: string) => readFileSync(path, "utf8");

const ONBOARDING_ROUTES = join(ROOT, "src/app/(account)/onboarding");
const SETTINGS_ROUTES = join(ROOT, "src/app/(account)/settings");
const ONBOARDING_COMPONENTS = join(ROOT, "src/components/onboarding");
const CONSENT_COMPONENTS = join(ROOT, "src/components/consent");

describe("the age gate", () => {
  it("guards every onboarding step with requireAdult", () => {
    const stepPages = filesUnder(ONBOARDING_ROUTES).filter(
      (path) => path.endsWith("page.tsx") && !path.endsWith(join("onboarding", "page.tsx")),
    );

    // One page per step in the flow, minus the hub. The welcome step is not one of them any
    // more: the name it asked for is part of signing up.
    expect(stepPages.length).toBe(5);
    for (const path of stepPages) {
      expect(read(path), `${path} must call requireAdult`).toMatch(/requireAdult\(/);
    }
  });

  it("guards every onboarding action too, because a page guard is not a request guard", () => {
    const actions = read(join(ONBOARDING_ROUTES, "actions.ts"));
    const exported = actions.match(/export async function (\w+)/g) ?? [];

    expect(exported.length).toBeGreaterThan(0);
    // Every action body opens with a guard. confirmAdultAction is the one exception, and it
    // still requires a signed-in person — it is the action that grants the confirmation.
    const bodies = actions.split(/export async function /).slice(1);
    for (const body of bodies) {
      expect(body).toMatch(/await require(Adult|User)\(/);
    }
  });

  it("leaves exactly one screen reachable without the confirmation, and it is where requireAdult sends people", () => {
    const hub = read(join(ONBOARDING_ROUTES, "page.tsx"));

    // requireAdult redirects to /onboarding, so this page must work for someone who has not
    // confirmed — otherwise the redirect is a loop.
    expect(hub).toMatch(/requireUser\(/);
    expect(hub).toMatch(/user\.ageConfirmed/);
    expect(hub).toMatch(/AgeConfirmation/);
  });

  it("guards the settings screens that touch health data", () => {
    const pages = filesUnder(SETTINGS_ROUTES).filter((path) => path.endsWith("page.tsx"));
    for (const path of pages) {
      expect(read(path), `${path} must call a guard`).toMatch(/require(Adult|User)\(/);
    }
  });
});

describe("nothing about health is written without consent", () => {
  it("checks tracking consent before saving conditions or symptoms", () => {
    const actions = read(join(ONBOARDING_ROUTES, "actions.ts"));

    for (const action of ["saveConditionsAction", "saveSymptomsAction"]) {
      const body = actions.split(`export async function ${action}`)[1]?.split("export async function")[0] ?? "";
      expect(body, `${action} must call requireTrackingConsent`).toMatch(/requireTrackingConsent\(/);
    }
  });

  it("checks it again on the pages themselves", () => {
    for (const step of ["conditions", "symptoms", "treatments", "baseline"]) {
      const page = read(join(ONBOARDING_ROUTES, step, "page.tsx"));
      expect(page, `${step} page must call requireTrackingConsent`).toMatch(
        /requireTrackingConsent\(/,
      );
    }
  });
});

describe("no donation prompts in onboarding", () => {
  // Brief 6.4 and AGENTS.md rule 5. Onboarding is a vulnerable moment by definition: people
  // are typing their diagnosis into a form. Nothing here asks them for money.
  const forbidden = /donate|donation|give now|chip in|support us|fundraise/i;

  it("has none in the onboarding routes", () => {
    for (const path of filesUnder(ONBOARDING_ROUTES)) {
      expect(read(path), `${path} mentions donating`).not.toMatch(forbidden);
    }
  });

  it("has none in the onboarding or consent components", () => {
    for (const path of [...filesUnder(ONBOARDING_COMPONENTS), ...filesUnder(CONSENT_COMPONENTS)]) {
      expect(read(path), `${path} mentions donating`).not.toMatch(forbidden);
    }
  });

  it("has none in the account shell that wraps them", () => {
    expect(read(join(ROOT, "src/app/(account)/layout.tsx"))).not.toMatch(forbidden);
  });
});

describe("no third-party tracking on a signed-in page", () => {
  it("loads no external scripts anywhere in the account area", () => {
    // AGENTS.md rule 11. Health data does not go past an analytics tag.
    const suspicious = /googletagmanager|google-analytics|gtag\(|segment\.com|analytics\.|hotjar|mixpanel|facebook\.net|<script\s+src=/i;
    for (const path of [...filesUnder(join(ROOT, "src/app/(account)")), ...filesUnder(ONBOARDING_COMPONENTS)]) {
      expect(read(path), `${path} loads something third-party`).not.toMatch(suspicious);
    }
  });
});
