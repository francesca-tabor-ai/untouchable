import { expect, test, type Page } from "@playwright/test";

/**
 * The daily log and treatment logging, in a real browser, on a real phone-sized screen.
 *
 * The unit suite measures how many controls a minimal daily log needs. This suite is where
 * the two things that can only be proved in a browser happen: the sliders really do move
 * under the arrow keys, and the Yellow Card link really does appear on the screen that
 * receives a side effect report.
 *
 * 375px throughout — the narrowest phone we support, and the one somebody exhausted is
 * holding in one hand.
 */
test.use({ viewport: { width: 375, height: 812 } });

const PASSWORD = "seventeen llamas walked";

function freshEmail() {
  return `e2e-tracking-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.test`;
}

/** Sign up and get as far as the treatments step: consent, a condition, some symptoms. */
async function signUpAndTrack(page: Page) {
  await page.goto("/sign-up");
  await page.getByLabel("Email address").fill(freshEmail());
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByLabel("I am 18 or over.").check();
  await page.getByRole("button", { name: "Create my account" }).click();
  await page.waitForURL("**/onboarding");

  await page.getByRole("link", { name: "Start" }).click();
  await page.waitForURL("**/onboarding/welcome");

  await page.getByLabel("What shall we call you?").fill("Sam");
  await page.getByRole("button", { name: "Save and carry on" }).click();
  await page.waitForURL("**/onboarding/consent");

  // Core tracking only. Nothing about anybody's health is stored without it.
  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save my choices" }).click();
  await page.waitForURL("**/onboarding/conditions");

  await page.getByRole("checkbox").first().check();
  await page.getByRole("button", { name: "Save and carry on" }).click();
  await page.waitForURL("**/onboarding/symptoms");

  // Symptoms: three, so the daily log has something to ask about.
  const symptoms = page.getByRole("checkbox");
  for (let index = 0; index < 3; index += 1) await symptoms.nth(index).check();
  await page.getByRole("button", { name: "Save and carry on" }).click();

  await page.waitForURL("**/onboarding/treatments");
}

test("somebody who is on nothing can finish the treatments step in one tap", async ({ page }) => {
  await signUpAndTrack(page);

  await expect(page.getByRole("heading", { name: "Treatments you are on now" })).toBeVisible();

  // The answer "I take nothing" is a button, not an absence. Nothing anywhere asks for money.
  await expect(page.getByText(/donate/i)).toHaveCount(0);
  const none = page.getByRole("button", { name: "I am not on any treatment at the moment" });
  await expect(none).toBeVisible();
  await none.click();

  // The step is now done, and onboarding has moved on rather than sending them back.
  await expect(page).not.toHaveURL(/\/onboarding\/treatments/);

  await page.goto("/onboarding");
  const treatmentsStep = page.getByRole("listitem").filter({ hasText: "Treatments you are on now" });
  await expect(treatmentsStep.getByText("Done")).toBeVisible();
});

test("a treatment that is not in the list can be added, stopped and given a side effect", async ({
  page,
}) => {
  await signUpAndTrack(page);

  // With nothing recorded yet the add form is already open, so there is nothing to expand.
  // Nothing like this is in the seeded sample list. It is recorded all the same.
  await page.getByLabel("What is it called?").fill("Wintermoor Herbal Tonic");
  await page.getByLabel("What kind of treatment is it?").selectOption("supplement");
  await page.getByLabel("When did it start?").fill("2026-06-01");
  await page.getByRole("button", { name: "Add this treatment" }).click();

  await page.waitForURL("**/onboarding/treatments**");
  await expect(page.getByText("Wintermoor Herbal Tonic")).toBeVisible();

  await page.getByRole("button", { name: "That is all of them" }).click();

  // Now the treatments area itself.
  await page.goto("/treatments");
  await expect(page.getByRole("heading", { name: "Your treatments" })).toBeVisible();
  await page.getByRole("link", { name: "Open Wintermoor Herbal Tonic" }).click();

  await expect(page.getByRole("heading", { name: "Wintermoor Herbal Tonic" })).toBeVisible();
  await expect(page.getByText(/No dm\+d code is recorded/)).toBeVisible();

  // A side effect, and the MHRA signpost that must follow it.
  await page.getByLabel("What happened?").fill("Kept me awake for three nights running.");
  await page.getByLabel("3 — moderate").check();
  await page.getByRole("button", { name: "Save this side effect" }).click();

  const yellowCard = page.getByRole("link", { name: /MHRA Yellow Card site/ });
  await expect(yellowCard).toBeVisible();
  await expect(yellowCard).toHaveAttribute("href", "https://yellowcard.mhra.gov.uk");
  await expect(yellowCard).toHaveAttribute("rel", /noopener/);

  // Stopping it, with a reason.
  await page.getByLabel("When did you stop?").fill("2026-08-01");
  await page.getByLabel("What led to stopping?").selectOption("side_effects");
  await page.getByRole("button", { name: "Record that I have stopped" }).click();

  await expect(page.getByText("Recorded as stopped.")).toBeVisible();
  await expect(page.getByText("Side effects").first()).toBeVisible();
  // The record says what they told us. It does not say the treatment failed.
  await expect(page.getByText(/failed|did not work for you/i)).toHaveCount(0);
});

test("the daily log is one screen, saves in one press, and edits in place", async ({ page }) => {
  await signUpAndTrack(page);
  await page.getByRole("button", { name: "I am not on any treatment at the moment" }).click();

  await page.goto("/log");
  await expect(page.getByRole("heading", { name: /Today.s log/ })).toBeVisible();

  const sliders = page.getByRole("slider");
  await expect(sliders).toHaveCount(3);

  // One press, nothing typed.
  await page.getByRole("button", { name: "Save today's log" }).click();
  await expect(page.getByText(/log is saved/)).toBeVisible();
  await expect(page.getByText(/You have already logged today/)).toBeVisible();

  // The same day again is an edit, in place, with no duplicate and no error.
  await page.getByRole("button", { name: "Save my changes" }).click();
  await expect(page.getByText(/log is saved/)).toBeVisible();

  // And what was saved is on the screen underneath.
  await expect(page.getByRole("heading", { name: "What you have recorded lately" })).toBeVisible();
  await expect(page.getByText("out of 10").first()).toBeVisible();
});

test("every slider works with a keyboard alone", async ({ page }) => {
  await signUpAndTrack(page);
  await page.getByRole("button", { name: "I am not on any treatment at the moment" }).click();
  await page.goto("/log");

  const slider = page.getByRole("slider").first();
  const startingValue = Number(await slider.inputValue());

  // Reached by tabbing, not by pointing at it.
  await page.keyboard.press("Tab");
  for (let index = 0; index < 12; index += 1) {
    if (await slider.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(slider).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  expect(Number(await slider.inputValue())).toBe(Math.min(10, startingValue + 2));

  await page.keyboard.press("ArrowLeft");
  expect(Number(await slider.inputValue())).toBe(Math.min(10, startingValue + 1));

  await page.keyboard.press("Home");
  expect(Number(await slider.inputValue())).toBe(0);
  await page.keyboard.press("End");
  expect(Number(await slider.inputValue())).toBe(10);

  // The number beside it keeps up, so somebody not using a mouse can still read the value.
  await expect(page.locator("output").first()).toHaveText("10");

  // And the whole form can be submitted from the keyboard.
  const save = page.getByRole("button", { name: /Save (today's log|my changes)/ });
  await save.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/log is saved/)).toBeVisible();
});

test("the tracking screens pass an automated accessibility scan", async ({ page }) => {
  // Automated checks catch perhaps a third of real accessibility problems, so this is a
  // floor rather than a pass mark. It does catch the ones easy to introduce by accident: an
  // unlabelled slider, a heading level skipped, contrast below 4.5:1.
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const scan = () =>
    new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

  await signUpAndTrack(page);
  expect((await scan()).violations, "/onboarding/treatments").toEqual([]);

  await page.getByLabel("What is it called?").fill("Wintermoor Herbal Tonic");
  await page.getByLabel("What kind of treatment is it?").selectOption("supplement");
  await page.getByLabel("When did it start?").fill("2026-06-01");
  await page.getByRole("button", { name: "Add this treatment" }).click();
  await page.waitForURL("**/onboarding/treatments**");
  await page.getByRole("button", { name: "That is all of them" }).click();

  for (const path of ["/log", "/treatments", "/treatments/new"]) {
    await page.goto(path);
    expect((await scan()).violations, `${path} has accessibility violations`).toEqual([]);
  }

  await page.goto("/treatments");
  await page.getByRole("link", { name: "Open Wintermoor Herbal Tonic" }).click();
  expect((await scan()).violations, "a treatment page has accessibility violations").toEqual([]);
});
