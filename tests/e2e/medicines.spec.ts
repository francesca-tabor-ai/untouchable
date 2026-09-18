import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * The medicines hub, end to end, against the seeded development data.
 *
 * Run with the seed in place: `npm run db:seed` first.
 *
 * NOTE FOR THE PLATFORM LEAD: these tests need `seedMedicines` wired into
 * `prisma/seed/index.ts`, which is a single-writer file. Until that one line lands, the
 * medicine is not in the development database and everything here 404s. The exact change is
 * in the medicines hand-over note.
 *
 * Nitrazepam is real, unlike every person in this seed. A medicine is not a person: naming
 * it makes no claim about anybody, and a page that says what a drug is has to say what a
 * real drug really is. Its description comes from the electronic Medicines Compendium and
 * the NHS — never from anyone who sells treatment (AGENTS.md rule 14).
 */

const SENSITIVE_MEDICINE = "/medicines/nitrazepam";

test.describe("browsing medicines without an account", () => {
  test("the index and a medicine page work on a 375px screen", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });

    await page.goto("/medicines");
    await expect(
      page.getByRole("heading", { level: 1, name: "Medicines and treatments" }),
    ).toBeVisible();

    // Nothing asks anyone to sign in to read.
    await expect(page.getByRole("heading", { name: /sign in to continue/i })).toHaveCount(0);

    await page.getByRole("link", { name: /nitrazepam/i }).first().click();
    await expect(page).toHaveURL(new RegExp(`${SENSITIVE_MEDICINE}$`));
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/nitrazepam/i);

    // The page does not scroll sideways at this width.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  });

  test("a medicine nobody has written up has no page", async ({ page }) => {
    // Every intervention in the core seed was given a slug by the migration, but none of
    // them has a plain-English description, so none of them is public.
    const response = await page.goto("/medicines/paracetamol");
    expect(response?.status()).toBe(404);
  });
});

test.describe("a sensitive-topic medicine page", () => {
  test("carries a content note at the top and support at the bottom", async ({ page }) => {
    await page.goto(SENSITIVE_MEDICINE);

    await expect(page.getByTestId("medicine-content-note")).toBeVisible();

    const support = page.getByTestId("substance-support");
    await expect(support).toBeVisible();
    await expect(support.getByText("0300 123 6600")).toBeVisible();
    await expect(support.getByRole("link", { name: /talktofrank\.com/ })).toBeVisible();

    // The crisis contacts are there too — dependence and crisis are different questions.
    await expect(page.getByTestId("support-signposting")).toBeVisible();

    // The content note comes before the support.
    const noteBox = await page.getByTestId("medicine-content-note").boundingBox();
    const supportBox = await support.boundingBox();
    expect(noteBox!.y).toBeLessThan(supportBox!.y);
  });

  test("says it is not medical advice", async ({ page }) => {
    await page.goto(SENSITIVE_MEDICINE);
    await expect(page.getByTestId("not-medical-advice").first()).toContainText(
      /not medical advice/i,
    );
  });

  test("asks nobody for money", async ({ page }) => {
    await page.goto(SENSITIVE_MEDICINE);

    await expect(page.getByRole("link", { name: /donate/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /donate/i })).toHaveCount(0);

    const text = (await page.locator("body").innerText()).toLowerCase();
    expect(text).not.toContain("donate");
    expect(text).not.toContain("gift aid");
    expect(text).not.toContain("£");
  });

  test("renders no dose and no regimen", async ({ page }) => {
    await page.goto(SENSITIVE_MEDICINE);
    const text = await page.locator("body").innerText();

    for (const pattern of [
      /\d+\s*mg\b/i,
      /\d+\s*ml\b/i,
      /\b(?:one|two|three|a)\s+tablets?\b/i,
      /\bdos(?:e|es|age)\b/i,
      /\b(?:a|per|each)\s+day\b/i,
      /\bdaily\b/i,
    ]) {
      expect(text).not.toMatch(pattern);
    }
  });
});

test.describe("accessibility", () => {
  const pages = ["/medicines", SENSITIVE_MEDICINE];
  const widths = [
    { name: "375px", width: 375, height: 800 },
    { name: "1280px", width: 1280, height: 900 },
  ];

  for (const path of pages) {
    for (const size of widths) {
      test(`${path} has no violations at ${size.name}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.goto(path);

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();

        expect(results.violations.map((violation) => violation.id)).toEqual([]);
      });
    }
  }

  test("the medicines block on a story is reachable from the keyboard", async ({ page }) => {
    await page.goto("/stories/ines-vallimar-depression");

    const block = page.getByTestId("story-medicines");
    if ((await block.count()) === 0) test.skip(true, "No medicine is linked to this story yet.");

    const link = block.getByRole("link").first();
    await link.focus();
    await expect(link).toBeFocused();
  });
});
