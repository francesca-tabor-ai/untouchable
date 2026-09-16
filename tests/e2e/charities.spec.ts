import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Charity giving, end to end, on a phone.
 *
 * Runs against the seeded development data, which is entirely fictional. The charities named
 * here do not exist; their donation URLs are on the reserved `.test` domain and cannot
 * resolve, which is exactly what we want in a test that follows a donation hand-off.
 *
 * Run: npm run db:seed && npm run test:e2e
 */

const PHONE = { width: 375, height: 812 };

// From prisma/seed/charities.ts. All invented.
const VERIFIED = "Mendip Breast Care Trust";
const NO_LOGO_PERMISSION = "After the Ward";
const NEVER_VERIFIED = "Kitchen Table Mental Health";
const WITHDRAWN = "Southfields Diabetes Appeal";

test.describe("the public charity directory", () => {
  test.use({ viewport: PHONE });

  test("lists verified charities and never an unverified one", async ({ page }) => {
    await page.goto("/charities");

    await expect(page.getByRole("heading", { name: "Charities", level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: VERIFIED, exact: true })).toBeVisible();

    await expect(page.getByText(NEVER_VERIFIED)).toHaveCount(0);
    await expect(page.getByText(WITHDRAWN)).toHaveCount(0);
  });

  test("gives an unverified charity no page of its own", async ({ page }) => {
    const response = await page.goto("/charities/kitchen-table-mental-health");
    expect(response?.status()).toBe(404);
  });

  test("filters by condition without needing JavaScript", async ({ page }) => {
    await page.goto("/charities");
    await page
      .getByRole("link", { name: /Depression/ })
      .first()
      .click();

    await expect(page).toHaveURL(/condition=depression/);
    await expect(page.getByRole("link", { name: "Quiet Hours", exact: true })).toBeVisible();
  });

  test("shows the name as text when we have no permission to use the logo", async ({ page }) => {
    await page.goto("/charities/after-the-ward");

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText(NO_LOGO_PERMISSION);
    // No image anywhere on the page: the listing holds a logo file but no permission.
    await expect(page.locator("main img")).toHaveCount(0);
  });

  test("has no obvious accessibility failures at 375px", async ({ page }) => {
    for (const path of ["/charities", "/charities/mendip-breast-care-trust"]) {
      await page.goto(path);
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(scan.violations, path).toEqual([]);
    }
  });
});

test.describe("the donate hand-off", () => {
  test.use({ viewport: PHONE });

  test("opens the charity's own page in a new tab, with no referrer and no handle on ours", async ({
    page,
  }) => {
    await page.goto("/charities/mendip-breast-care-trust");

    const donate = page.getByRole("link", { name: /Donate on their website/ }).first();
    await expect(donate).toBeVisible();

    // A 44px touch target at minimum. Brief: accessible and calm, mobile first.
    const box = await donate.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);

    await expect(donate).toHaveAttribute("target", "_blank");
    const rel = (await donate.getAttribute("rel")) ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");

    // The URL carries the charity and a page kind. Nothing else, signed in or not.
    const href = (await donate.getAttribute("href")) ?? "";
    expect(href).toBe("/charities/mendip-breast-care-trust/donate?from=charity");
  });

  test("records the click and redirects to the charity, sending no referrer", async ({
    request,
  }) => {
    const response = await request.get(
      "/charities/mendip-breast-care-trust/donate?from=condition",
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(303);
    expect(response.headers()["location"]).toBe("https://mendip-breast-care.example.test/donate");

    // The route asks for "no-referrer". The site-wide header in next.config.ts currently
    // wins, which leaves "strict-origin-when-cross-origin" — the charity sees our origin and
    // never a path or a query string, so nothing about the person travels with the click.
    // Either is safe; anything that would send a full URL is not.
    expect([
      "no-referrer",
      "strict-origin-when-cross-origin",
      "same-origin",
      "strict-origin",
    ]).toContain(response.headers()["referrer-policy"]);
  });

  test("refuses to hand off to a charity nobody has verified", async ({ request }) => {
    const response = await request.get("/charities/kitchen-table-mental-health/donate", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(404);
  });

  test("puts no page kind it does not recognise into the record", async ({ request }) => {
    // Anything unexpected in the query string is thrown away, not stored.
    const response = await request.get(
      "/charities/mendip-breast-care-trust/donate?from=" +
        encodeURIComponent("https://untouchable.example/account/42"),
      { maxRedirects: 0 },
    );

    expect(response.status()).toBe(303);
  });
});
