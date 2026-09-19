import { PrismaClient } from "../../src/generated/prisma";

import { seedCharities } from "./charities";
import { seedCore } from "./core";
import { seedDemoTracking } from "./demo-tracking";
import { seedMedicines } from "./medicines";
import { seedStaff } from "./staff";
import { seedStories } from "./stories";

const db = new PrismaClient();

/**
 * Development seed.
 *
 * Everything here is invented: the people, the stories, the charities, the patients. No real
 * public figure, no real charity registration and no real patient data ever goes in a seed,
 * a fixture or a test. Brief section 9.
 */
async function main() {
  // Fails closed. This file creates editor and admin accounts whose password is written in
  // plain text in `prisma/seed/staff.ts`, in a public repository — so the guard cannot be
  // "unless someone remembered to set NODE_ENV". It has to be an explicit opt-in, and
  // NODE_ENV=production overrides even that.
  if (process.env.NODE_ENV === "production") {
    throw new Error("The seed creates demo accounts with a publicly known password. It must never run in production.");
  }
  if (process.env.ALLOW_DEV_SEED !== "true") {
    throw new Error(
      [
        "Refusing to seed: ALLOW_DEV_SEED is not set to \"true\".",
        "",
        "This seed creates accounts whose password is published in the repository. Running it",
        "against anything reachable from the internet would hand an administrator account to",
        "anyone who has read the code.",
        "",
        "For a local development database: ALLOW_DEV_SEED=true npm run db:seed",
      ].join("\n"),
    );
  }

  console.info("Seeding UnTouchable development data — all of it fictional.\n");

  const { conditions } = await seedCore(db);
  console.info("  conditions, symptoms, interventions, questionnaire");

  await seedMedicines(db);
  console.info("  medicines");

  const staff = await seedStaff(db);
  console.info("  editor and admin accounts");

  const ctx = { conditions, ...staff };

  await seedStories(db, ctx);
  console.info("  stories");

  await seedCharities(db, ctx);
  console.info("  charities");

  await seedDemoTracking(db, ctx);
  console.info("  demo patients and tracking history");

  console.info(
    [
      "",
      "Done. Sign in with any of:",
      "  editor.one@untouchable.example",
      "  editor.two@untouchable.example",
      "  admin@untouchable.example",
      "  password: untouchable-dev-password",
      "",
      "None of these people are real. None of the charities are real. Do not screenshot this",
      "data as though it were.",
      "",
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
