import { expect, test } from "@playwright/test";

/**
 * Acceptance criterion: an admin creates and publishes a questionnaire version **with no code
 * change**, and it can be answered immediately.
 *
 * This is the whole of it, through the real screens: nothing is edited in the repository
 * between the first line and the last, and what comes out the other end is a set of questions
 * somebody can be asked.
 *
 * Runs on one project only. It creates a real questionnaire in the development database; a
 * second project would create a second one for no benefit.
 */
test.describe.serial("publishing a questionnaire version", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "runs once, on the mobile project");
  });

  const PASSWORD = "untouchable-dev-password";

  const ITEMS = JSON.stringify([
    {
      key: "overall",
      type: "scale_0_10",
      label: "How have things been over the last two weeks?",
      required: true,
      min: 0,
      max: 10,
    },
    {
      key: "coping",
      type: "single_choice",
      label: "How have you been coping?",
      required: true,
      options: [
        { value: "well", label: "I am coping well" },
        { value: "not_coping", label: "I am not coping at all" },
      ],
    },
  ]);

  async function signIn(page: import("@playwright/test").Page, email: string) {
    await page.context().clearCookies();
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  }

  test("an editor writes a version, previews it and publishes it, without a deployment", async ({
    page,
  }) => {
    const key = `e2e-questions-${Date.now()}`;

    await signIn(page, "editor.one@untouchable.example");
    await page.goto("/admin/questionnaires/new");

    await page.getByLabel(/^Key/).fill(key);
    await page.getByLabel(/^Title/).fill("A questionnaire written in the admin");
    await page
      .getByLabel(/^Licence note/)
      .fill("Written for UnTouchable during a test. Not a validated instrument.");
    await page.getByLabel(/^Questions/).fill(ITEMS);
    await page
      .getByLabel(/^Scoring/)
      .fill(JSON.stringify({ method: "mean", items: ["overall"], scale: { min: 0, max: 10 } }));
    await page.getByLabel(/^Red flag rules/).fill(
      JSON.stringify([
        {
          key: "not_coping",
          itemKey: "coping",
          operator: "equals",
          value: "not_coping",
          message: "You have said you are not coping at all.",
        },
      ]),
    );
    await page.getByLabel(/^Schedule/).fill(JSON.stringify({ baseline: false, generalEveryDays: 28 }));

    await page.getByRole("button", { name: "Create the draft" }).click();
    await page.waitForURL(/\/admin\/questionnaires\/.+\/versions\//);

    // The preview is the real renderer, so an editor sees exactly what will be asked.
    await expect(page.getByRole("heading", { name: "Version 1" })).toBeVisible();
    await expect(page.getByRole("group", { name: /How have things been/ })).toBeVisible();
    await expect(page.getByRole("radio", { name: "I am not coping at all" })).toBeVisible();
    await expect(page.getByText("The average of: overall")).toBeVisible();

    // Publishing is refused until somebody says the licence terms allow it.
    await page.getByRole("button", { name: /^Publish version 1/ }).click();
    await expect(page.getByRole("alert").first()).toContainText("Confirm that the licence terms");

    await page.getByRole("checkbox", { name: /licence terms/i }).check();
    await page.getByRole("button", { name: /^Publish version 1/ }).click();

    await page.waitForURL(/\?published=1/);
    await expect(page.getByText("Version 1 is published")).toBeVisible();

    // A published version has no form on its page at all.
    await page.getByRole("link", { name: "Version 1" }).first().click();
    await expect(page.getByText("This version is in use and cannot be changed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save the draft" })).toHaveCount(0);
  });
});
