import { expect, test } from "@playwright/test";

/**
 * The journey, on the screen most people will use.
 *
 * 375px is the narrowest phone we support and the one the design system is written for, so
 * the whole flow is driven at that width. Everything here is a real sign-up against the
 * development database — no fixtures, no shortcuts past the guards.
 */
test.use({ viewport: { width: 375, height: 812 } });

const PASSWORD = "seventeen llamas walked";

function freshEmail() {
  return `e2e-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.test`;
}

async function signUp(page: import("@playwright/test").Page, email: string) {
  await page.goto("/sign-up");
  await page.getByLabel("What shall we call you?").fill("Sam");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create my account" }).click();

  // Three fields and you are on the home page, signed in. There is no setup flow to get
  // through first, and the header is where somebody sees that it worked.
  await page.waitForURL("/");
  await expect(page.getByRole("link", { name: "Signed in as Sam" })).toBeVisible();
}

test("a new person can get through onboarding on a small phone", async ({ page }) => {
  await signUp(page, freshEmail());

  // Onboarding is not where sign-up leaves you any more. It is the optional part, and you
  // reach it when something needs an answer — or from your own account.
  await page.goto("/onboarding");
  await expect(page.getByRole("heading", { name: "Setting up your account" })).toBeVisible();
  // Derived, not hardcoded: the number of steps changes as milestones land.
  await expect(page.getByText(/^0 of \d+ done\.$/)).toBeVisible();

  // Nothing anywhere in onboarding asks for money.
  await expect(page.getByText(/donate/i)).toHaveCount(0);

  await page.getByRole("link", { name: "Start" }).click();

  // Consent: five separate boxes, the optional ones all off.
  await expect(page.getByRole("heading", { name: "Your choices about your data" })).toBeVisible();
  const boxes = page.getByRole("checkbox");
  await expect(boxes).toHaveCount(5);
  for (let index = 1; index < 5; index += 1) {
    await expect(boxes.nth(index)).not.toBeChecked();
  }
  await expect(page.getByText(/not yet been reviewed by a lawyer/i)).toBeVisible();

  await boxes.first().check();
  await page.getByRole("button", { name: "Save my choices" }).click();

  // Conditions.
  await expect(page.getByRole("heading", { name: "What you are living with" })).toBeVisible();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save and carry on" }).click();

  // Symptoms.
  await expect(
    page.getByRole("heading", { name: "What you want to keep an eye on" }),
  ).toBeVisible();
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save and carry on" }).click();

  // Treatments. "I take nothing" is a real answer and finishes the step.
  await page.waitForURL("**/onboarding/treatments");
  await expect(page.getByRole("heading", { name: "Treatments you are on now" })).toBeVisible();
  await page.getByRole("button", { name: /not on any treatment/i }).click();

  // Baseline. The first set of questions everything later is measured against.
  await page.waitForURL("**/onboarding/baseline**");

  // Answer one option per question, found by the radios' shared name rather than by the
  // question wording: the questions are data and can change without this test changing.
  //
  // Not `getByRole("radiogroup")` — these are fieldsets, which map to role "group", so that
  // selector silently matches nothing and every answer stays blank.
  const questionNames: string[] = await page.evaluate(() =>
    Array.from(
      new Set(
        Array.from(document.querySelectorAll("main input[type=radio]")).map(
          (input) => (input as HTMLInputElement).name,
        ),
      ),
    ),
  );
  expect(questionNames.length).toBeGreaterThan(0);
  for (const name of questionNames) {
    await page.locator(`main input[type=radio][name="${name}"]`).first().check();
  }

  // "Save my answers", not "Save and come back later". The second saves a draft, and a
  // draft does not finish the step — which is exactly what this test exists to notice.
  await page.getByRole("button", { name: "Save my answers" }).click();

  // Wait for the answer to actually land before looking at the hub. Navigating straight
  // away races the server action, and the hub then honestly reports the step unfinished —
  // which looks exactly like a broken baseline and is not one.
  await page.waitForURL(/\/onboarding\/baseline\?recorded=/);

  // Every step reports itself done, whatever the number of steps has grown to.
  await page.goto("/onboarding");
  await expect(page.getByText(/^(\d+) of \1 done\.$/)).toBeVisible();
});

test("closing the tab loses nothing", async ({ page, context }) => {
  const email = freshEmail();
  await signUp(page, email);

  await page.goto("/onboarding/consent");
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save my choices" }).click();
  await expect(page.getByRole("heading", { name: "What you are living with" })).toBeVisible();

  // A new page in the same session is the same person coming back later.
  const returning = await context.newPage();
  await returning.setViewportSize({ width: 375, height: 812 });
  await returning.goto("/onboarding");
  await expect(returning.getByText(/^1 of \d+ done\.$/)).toBeVisible();
  await returning.getByRole("link", { name: "Carry on where I left off" }).click();
  await expect(returning.getByRole("heading", { name: "What you are living with" })).toBeVisible();
});

test("tracking is closed until consent is given, and closes again when it is withdrawn", async ({
  page,
}) => {
  await signUp(page, freshEmail());

  // Straight to a tracking step without having consented.
  await page.goto("/onboarding/conditions");
  await expect(page).toHaveURL(/\/onboarding\/consent$/);

  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save my choices" }).click();
  await expect(page.getByRole("heading", { name: "What you are living with" })).toBeVisible();

  // Withdraw it, and the same page is closed again on the very next request.
  await page.goto("/settings/consent/stop-tracking");
  await expect(page.getByRole("heading", { name: "Turn off tracking" })).toBeVisible();
  await page.getByRole("button", { name: "Turn off tracking" }).click();
  await expect(page).toHaveURL(/\/settings\/consent$/);

  await page.goto("/onboarding/conditions");
  await expect(page).toHaveURL(/\/onboarding\/consent$/);
});

test("signing in says nothing about whether an address has an account", async ({ page }) => {
  const email = freshEmail();
  await signUp(page, email);
  await page.goto("/sign-out");
  // The header offers a sign-out too, now that it says who is signed in. This is the one
  // on the page.
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/");

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill("definitely not the password");
  await page.getByRole("button", { name: "Sign in" }).click();
  const knownAddress = await page.getByRole("alert").textContent();

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(freshEmail());
  await page.getByLabel("Password").fill("definitely not the password");
  await page.getByRole("button", { name: "Sign in" }).click();
  const unknownAddress = await page.getByRole("alert").textContent();

  expect(knownAddress).toBe(unknownAddress);
});

test("a return path is honoured after signing in", async ({ page }) => {
  const email = freshEmail();
  await signUp(page, email);
  await page.goto("/sign-out");
  // The header offers a sign-out too, now that it says who is signed in. This is the one
  // on the page.
  await page.getByRole("main").getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("**/");

  await page.goto("/settings/consent");
  await expect(page).toHaveURL(/\/sign-in\?next=/);

  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/settings\/consent$/);
});

test("the sign-up and consent screens pass an automated accessibility scan", async ({ page }) => {
  // Automated checks catch perhaps a third of real accessibility problems, so this is a
  // floor rather than a pass mark. It does catch the ones that are easy to introduce by
  // accident: an unlabelled control, a heading level skipped, contrast below 4.5:1.
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const scan = (target: typeof page) =>
    new AxeBuilder({ page: target })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

  await page.goto("/sign-up");
  expect((await scan(page)).violations).toEqual([]);

  await signUp(page, freshEmail());

  for (const path of ["/onboarding", "/onboarding/consent", "/settings/profile"]) {
    await page.goto(path);
    expect((await scan(page)).violations, `${path} has accessibility violations`).toEqual([]);
  }
});
