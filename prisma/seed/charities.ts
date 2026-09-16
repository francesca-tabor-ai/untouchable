import { PrismaClient } from "../../src/generated/prisma";

import type { SeedContext } from "./context";

/**
 * Fictional charities.
 *
 * EVERY CHARITY HERE IS INVENTED, with an obviously invalid registration number. Seeding a
 * real charity's registration number would assert a verification that no editor performed —
 * see DECISIONS.md D-005.
 *
 * Owned by the charity feature team.
 */
export async function seedCharities(_db: PrismaClient, _ctx: SeedContext) {
  // Filled in by the charity giving milestone.
}
