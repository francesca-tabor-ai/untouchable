import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against their own database, on their own port.
 *
 * They did not always. They ran against the development database, and because several specs
 * legitimately create things — a questionnaire version, a published story — each run left
 * the developer's data a little further from the seed. Eventually a spec failed for a reason
 * that had nothing to do with the code: six published questionnaire versions had accumulated,
 * and the one the baseline step looks for was no longer the newest.
 *
 * `npm run test:e2e` now migrates and re-seeds `untouchable_e2e` first, so every run starts
 * from the same fictional data and nothing a test does can reach anyone's dev database.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "./tests/e2e",

  // Serial, deliberately. Many specs sign somebody up and walk them through onboarding, and
  // the two projects running the same flow at the same time against one database produced
  // thirty-second timeouts that had nothing to do with the code. End-to-end runs are not
  // where we spend our speed budget; determinism is worth more than four minutes.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [
    // Mobile first: this is how most people will meet the platform.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `NEXT_DIST_DIR=.next-e2e npx dotenv -e .env.e2e -- npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Never reuse: a server already running here would be holding a different database.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
