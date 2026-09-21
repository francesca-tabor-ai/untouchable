import { expect, test } from "@playwright/test";

/**
 * Answering the baseline, on the screen most people will use.
 *
 * 375px is the narrowest phone we support. Everything here is a real sign-up against the
 * development database, answering the seeded placeholder questionnaire — no fixtures and no
 * shortcuts past the guards.
 *
 * The treatments step belongs to another milestone, so this walks to the baseline by its own
 * address rather than through a screen this milestone does not own.
 */
test.use({ viewport: { width: 375, height: 812 } });

const PASSWORD = "seventeen llamas walked";

function freshEmail() {
  return `e2e-q-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.test`;
}

async function signUpAndConsent(page: import("@playwright/test").Page) {
  await page.goto("/sign-up");
  await page.getByLabel("What shall we call you?").fill("Sam");
  await page.getByLabel("Email address").fill(freshEmail());
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create my account" }).click();
  await page.waitForURL("/");

  await page.goto("/onboarding/consent");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save my choices" }).click();
  // The consent step redirects onwards once it has saved. Waiting for "somewhere that is not
  // the consent step" rather than for any onboarding address, which it already is.
  await page.waitForURL((url) => !url.pathname.endsWith("/onboarding/consent"));
}

test("somebody can answer the baseline on a small phone, and see a number and a date", async ({ page }) => {
  await signUpAndConsent(page);

  await page.goto("/onboarding/baseline");
  await expect(page.getByRole("heading", { name: "Your first check-in" })).toBeVisible();

  // Nothing on this screen asks anybody for money.
  await expect(page.getByText(/donate|donation/i)).toHaveCount(0);

  // Finishing with a required question unanswered says so, and does not lose the rest.
  const firstGroup = page.getByRole("group").first();
  await firstGroup.getByRole("radio", { name: "7", exact: true }).check();
  await page.getByRole("button", { name: "Save my answers" }).click();
  await expect(page.getByRole("alert").first()).toContainText("still to answer");
  await expect(firstGroup.getByRole("radio", { name: "7", exact: true })).toBeChecked();

  // Answer the rest.
  const groups = page.getByRole("group");
  for (let index = 1; index < (await groups.count()); index += 1) {
    const group = groups.nth(index);
    const options = group.getByRole("radio");
    if ((await options.count()) > 0) await options.nth(1).check();
  }

  await page.getByRole("button", { name: "Save my answers" }).click();

  await expect(page.getByRole("heading", { name: "Your answers are recorded" })).toBeVisible();
  await expect(page.getByText("Score", { exact: true })).toBeVisible();
  // A number and a date, and nothing that says what either means.
  await expect(page.getByText(/improv|getting better|getting worse|well done/i)).toHaveCount(0);
});

test("a half-finished questionnaire is still there after closing the page", async ({ page }) => {
  await signUpAndConsent(page);

  await page.goto("/onboarding/baseline");
  await page.getByRole("group").first().getByRole("radio", { name: "3", exact: true }).check();
  await page.getByRole("button", { name: "Save and come back later" }).click();
  await expect(page.getByRole("status")).toContainText("come back to it");

  // Leave, come back — exactly what being called in from a waiting room looks like.
  await page.goto("/onboarding");
  await page.goto("/onboarding/baseline");

  await expect(page.getByText("We kept what you had filled in")).toBeVisible();
  await expect(
    page.getByRole("group").first().getByRole("radio", { name: "3", exact: true }),
  ).toBeChecked();
});
