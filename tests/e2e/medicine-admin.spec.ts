import { expect, test } from "@playwright/test";

/**
 * Acceptance criteria 1 and 2, through the real screens.
 *
 * An editor drafts a story, puts a medicine on it with a source and a line of context, and
 * a medicine with **no** source is flagged before anyone can publish it.
 *
 * Runs on one project only. It creates a real story in the development database, and a
 * second project would create a second one for no benefit.
 */
test.describe.serial("medicines on the story draft screen", () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "runs once, on the mobile project");
  });

  const PASSWORD = "untouchable-dev-password";
  const stamp = Date.now();

  /** Pick an option by the words in it — the labels carry a type and a flag as well. */
  async function pick(select: import("@playwright/test").Locator, text: string) {
    const value = await select.locator("option", { hasText: text }).first().getAttribute("value");
    await select.selectOption(value ?? "");
  }

  async function signIn(page: import("@playwright/test").Page, email: string) {
    await page.context().clearCookies();
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"));
  }

  test("an editor links a medicine, with a source and a context line", async ({ page }) => {
    await signIn(page, "editor.one@untouchable.example");

    // A draft to hang the medicine on. Everyone in it is invented.
    await page.goto("/admin/editorial/stories/new");
    await page.getByRole("radio", { name: /community/i }).check();
    await page.getByLabel(/^Title/).fill(`An invented story for a medicine test ${stamp}`);
    await page.getByLabel(/Web address/).fill(`an-invented-medicine-story-${stamp}`);
    await page.getByRole("checkbox", { name: /Depression/ }).first().check();
    await page
      .getByLabel(/^Summary/)
      .fill(
        "An invented community story, written in our own words for a test. It is about nobody at all, and it is long enough to pass the summary length rule that every story has to meet.",
      );
    await page.getByRole("button", { name: "Start this draft" }).click();
    await page.waitForURL(/\/admin\/editorial\/stories\/[^/]+$/);

    // A source, so the medicine has something to be attributed to.
    await page.getByLabel(/Link to the source/).fill("https://example.test/an-invented-interview");
    await page.getByLabel(/Title of the source/).fill("An invented interview");
    await page.getByLabel(/^Publisher/).fill("Example Publisher");
    await page.getByRole("button", { name: "Add this source" }).click();
    await expect(page.getByText("Source added.")).toBeVisible();

    // The medicine itself.
    const medicines = page.getByRole("region", { name: "Medicines and treatments" });
    await pick(page.getByLabel(/Which medicine or treatment/), "Nitrazepam");
    await pick(page.getByLabel(/Which source says they took it/), "Example Publisher");
    await page.getByLabel(/How did they come to it/).fill("prescribed, and never reviewed");
    await page.getByRole("button", { name: /Put this medicine on the story/ }).click();

    await expect(page.getByText("Medicine saved on this story.")).toBeVisible();
    await expect(medicines.getByTestId("medicine-link-row")).toContainText(
      "prescribed, and never reviewed",
    );
    await expect(medicines.getByTestId("medicine-link-row")).toContainText("Example Publisher");
    await expect(page.getByTestId("medicine-missing-source")).toHaveCount(0);
  });

  test("a dose in the context line is refused", async ({ page }) => {
    await signIn(page, "editor.one@untouchable.example");
    await page.goto("/admin/editorial");
    await page.getByRole("link", { name: new RegExp(`medicine test ${stamp}`) }).click();

    await pick(page.getByLabel(/Which medicine or treatment/), "Nitrazepam");
    await page.getByLabel(/How did they come to it/).fill("prescribed 10mg at night");

    // The button is disabled the moment the text is dose-shaped, and the reason is beside it.
    await expect(page.getByText(/We never publish how much of something a person took/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Put this medicine on the story/ })).toBeDisabled();
  });

  test("a medicine with no source is flagged to the verifying editor", async ({ page }) => {
    await signIn(page, "editor.one@untouchable.example");
    await page.goto("/admin/editorial");
    await page.getByRole("link", { name: new RegExp(`medicine test ${stamp}`) }).click();

    // Take the attribution away again.
    await pick(page.getByLabel(/Which medicine or treatment/), "Nitrazepam");
    await page.getByLabel(/Which source says they took it/).selectOption("");
    await page.getByRole("button", { name: /Put this medicine on the story/ }).click();
    await expect(page.getByText("Medicine saved on this story.")).toBeVisible();

    // Flagged beside the row and again in the publishing panel, where the second editor looks.
    // Once beside the row, and once in the publishing panel where the second editor looks.
    const flags = page.getByTestId("medicine-missing-source");
    await expect(flags).toHaveCount(2);
    await expect(flags.first()).toContainText(/heavier claim than naming their condition/);

    // It is a flag, not a lock: the story can still be sent on, and the second editor
    // decides with the flag in front of them.
    await page.getByRole("button", { name: "Send for review" }).click();
    // The panel re-renders into its in-review state rather than keeping a message.
    await expect(page.getByText("In review").first()).toBeVisible();

    await signIn(page, "editor.two@untouchable.example");
    await page.goto("/admin/editorial");
    await page.getByRole("link", { name: new RegExp(`medicine test ${stamp}`) }).click();
    await expect(page.getByTestId("medicine-missing-source").first()).toBeVisible();
  });
});
