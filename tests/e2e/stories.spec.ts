import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The stories hub, end to end, against the seeded development data.
 *
 * Run with the seed in place: `npm run db:seed` first. Everything these tests touch is
 * invented — see prisma/seed/stories.ts.
 *
 * The mobile project in playwright.config.ts is a 412px-wide phone; the acceptance criterion
 * is 375px, so the viewport is set explicitly in the browsing test rather than assumed.
 */

test.describe("browsing without an account", () => {
  test("browse, filter and search on a 375px screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });

    await page.goto("/stories");
    await expect(page.getByRole("heading", { level: 1, name: "Stories" })).toBeVisible();

    // Nothing asks anyone to sign in to read.
    await expect(page.getByRole("heading", { name: /sign in to continue/i })).toHaveCount(0);

    const allStories = page.getByRole("link", { name: /on finishing a tour/i });
    await expect(allStories.first()).toBeVisible();

    // Filter by condition.
    await page.getByRole("link", { name: "Type 2 diabetes", exact: true }).first().click();
    await expect(page).toHaveURL(/condition=type-2-diabetes/);
    await expect(page.getByRole("link", { name: /the diagnosis he ignored/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /on finishing a tour/i })).toHaveCount(0);

    // Search by name.
    await page.goto("/stories");
    await page.getByLabel(/search by name or condition/i).fill("Vallimar");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=Vallimar/);
    await expect(page.getByRole("link", { name: /could not write/i })).toBeVisible();

    // The page does not scroll sideways at this width.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });

  test("a retracted story is not reachable", async ({ page }) => {
    const response = await page.goto("/stories/kit-marrowby-type-2-diabetes");
    expect(response?.status()).toBe(404);

    await page.goto("/stories");
    await expect(page.getByRole("link", { name: /changing how he cooks/i })).toHaveCount(0);
  });

  test("a draft is not reachable either", async ({ page }) => {
    const response = await page.goto("/stories/saoirse-dunleath-breast-cancer");
    expect(response?.status()).toBe(404);
  });
});

test.describe("accessibility", () => {
  const pages = [
    "/stories",
    "/stories/ines-vallimar-depression",
    "/conditions",
    "/conditions/depression",
    "/public-figures/marla-quintrell",
    "/corrections",
  ];

  for (const path of pages) {
    test(`${path} has no serious accessibility violations`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(results.violations.map((violation) => violation.id)).toEqual([]);
    });
  }
});

test.describe("a public figure's page", () => {
  test("shows the no-endorsement disclaimer", async ({ page }) => {
    await page.goto("/public-figures/marla-quintrell");

    await expect(page.getByTestId("no-endorsement")).toHaveText(
      "Marla Quintrell is not affiliated with and has not endorsed UnTouchable.",
    );
  });
});

test.describe("a sensitive-topic story", () => {
  test("carries a content note at the top and support at the bottom", async ({ page }) => {
    await page.goto("/stories/ines-vallimar-depression");

    await expect(page.getByTestId("content-note")).toBeVisible();

    const support = page.getByTestId("support-signposting");
    await expect(support).toBeVisible();
    await expect(support.getByText("116 123")).toBeVisible();

    // The content note comes before the story, and support after it.
    const noteBox = await page.getByTestId("content-note").boundingBox();
    const supportBox = await support.boundingBox();
    expect(noteBox!.y).toBeLessThan(supportBox!.y);

    // No donation prompt anywhere near the support contacts.
    await expect(page.getByRole("link", { name: /donate/i })).toHaveCount(0);
  });

  test("an ordinary story has neither", async ({ page }) => {
    await page.goto("/stories/marla-quintrell-breast-cancer");

    await expect(page.getByTestId("content-note")).toHaveCount(0);
    await expect(page.getByTestId("support-signposting")).toHaveCount(0);
  });
});

/**
 * Charities on a sensitive-topic surface: present, and presented as support.
 *
 * This is one guarantee with two halves, and it is written as one test on purpose. Dropping
 * the block removes the signposting somebody came to the page for; keeping the donate
 * hand-off puts an ask beside a content note about being very unwell. A refactor is most
 * likely to break exactly one of those, so neither half is asserted on its own.
 *
 * DECISIONS.md D-015. The charity team owns the `variant="support"` rendering itself; what
 * the stories hub promises is that these surfaces ask for it.
 */
test.describe("charities on a sensitive-topic surface", () => {
  const surfaces = [
    { path: "/conditions/depression", what: "a sensitive condition page" },
    { path: "/stories/ines-vallimar-depression", what: "a sensitive story" },
  ];

  for (const { path, what } of surfaces) {
    test(`${what} shows charities as support, not as an ask`, async ({ page }) => {
      await page.goto(path);

      // Half one: the charities are there. Seeded charities are tagged to depression and
      // linked to this story — see prisma/seed/charities.ts.
      const charityLinks = page.locator('a[href^="/charities/"]');
      await expect(charityLinks.first()).toBeVisible();

      // Half two: no donate affordance anywhere on the page. The hand-off route is
      // /charities/<slug>/donate, so this catches it however it is labelled.
      await expect(page.locator('a[href*="/donate"]')).toHaveCount(0);
      await expect(page.getByRole("link", { name: /donate|give now/i })).toHaveCount(0);

      // And the support contacts are still where they belong.
      await expect(page.getByTestId("support-signposting")).toBeVisible();
    });
  }

  test("an ordinary condition page still carries the donate hand-off", async ({ page }) => {
    await page.goto("/conditions/breast-cancer");

    await expect(page.locator('a[href*="/donate"]').first()).toBeVisible();
    await expect(page.getByTestId("support-signposting")).toHaveCount(0);
  });
});

test.describe("the correction form", () => {
  test("anyone can send a correction request without an account", async ({ page }) => {
    await page.goto("/corrections");

    await expect(
      page.getByRole("heading", { level: 1, name: /request a correction or removal/i }),
    ).toBeVisible();

    await page.getByLabel(/which story is this about/i).selectOption({ index: 1 });
    await page.getByLabel(/a correction/i).check();
    await page.getByLabel(/your name/i).fill("Invented End-to-end Reader");
    await page.getByLabel(/your email address/i).fill("e2e@example.test");
    await page.getByLabel(/how are you connected/i).fill("a reader");
    await page
      .getByLabel(/what is wrong/i)
      .fill("An invented end-to-end test request. Please ignore it.");

    await page.getByRole("button", { name: /send this request/i }).click();

    await expect(page.getByText(/we have your request/i)).toBeVisible();
  });
});

test.describe("the editorial admin", () => {
  test("answers a signed-out request with 401, not a redirect and not a 500", async ({ page }) => {
    const response = await page.goto("/admin/editorial");
    expect(response?.status()).toBe(401);
  });
});

/**
 * Two-step publishing, through the admin, as two different editors.
 *
 * Serial, because these tests move one seeded story through the workflow and the state each
 * one leaves behind is what the next one starts from. Re-run `npm run db:seed` afterwards.
 */
test.describe.serial("two-step publishing in the admin", () => {
  // These move one seeded story through the workflow, so they run in one project only.
  // Running them in both would mean the second project starting from the state the first
  // one left behind.
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "runs once, on the mobile project");
  });

  const PASSWORD = "untouchable-dev-password";

  async function signIn(page: import("@playwright/test").Page, email: string) {
    await page.context().clearCookies();
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  }

  async function openStory(page: import("@playwright/test").Page, title: RegExp) {
    await page.goto("/admin/editorial");
    await page.getByRole("link", { name: title }).click();
    await page.waitForURL(/\/admin\/editorial\/stories\//);
  }

  test("a story with no source cannot be sent for review", async ({ page }) => {
    await signIn(page, "editor.one@untouchable.example");
    await openStory(page, /going back on air/i);

    await expect(page.getByText(/Add at least one source/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send for review/i })).toHaveCount(0);
  });

  test("the editor who drafted a story is not offered the publish button", async ({ page }) => {
    await signIn(page, "editor.one@untouchable.example");
    await openStory(page, /on her brother/i);

    await expect(page.getByText(/you cannot verify it/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /publish/i })).toHaveCount(0);
  });

  test("a second editor checks the sources and publishes it", async ({ page }) => {
    await signIn(page, "editor.two@untouchable.example");
    await openStory(page, /on her brother/i);

    await page.getByRole("button", { name: /sources checked — publish/i }).click();

    // The panel re-renders into its published state, so that is what we wait for rather
    // than a flash of confirmation text.
    await expect(page.getByText(/Live since/i)).toBeVisible();

    await page.goto("/stories/orla-penhaligon-brothers-depression");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Orla Penhaligon");
    await expect(page.getByTestId("support-signposting")).toBeVisible();
  });

  test("retracting it takes it off the public site straight away", async ({ page }) => {
    await signIn(page, "editor.two@untouchable.example");
    await openStory(page, /on her brother/i);

    await page.getByLabel(/why is this being taken down/i).fill("An invented end-to-end test.");
    await page.getByRole("button", { name: /retract this story/i }).click();
    await expect(page.getByRole("button", { name: /move back to draft/i })).toBeVisible();

    const response = await page.goto("/stories/orla-penhaligon-brothers-depression");
    expect(response?.status()).toBe(404);

    await page.goto("/stories");
    await expect(page.getByRole("link", { name: /on her brother/i })).toHaveCount(0);
  });
});
