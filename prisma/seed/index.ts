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
  if (process.env.NODE_ENV === "production") {
    throw new Error("The seed contains fictional demo accounts and must never run in production.");
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
