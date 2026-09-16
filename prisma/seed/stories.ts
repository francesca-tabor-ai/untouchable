import { PrismaClient } from "../../src/generated/prisma";

import type { SeedContext } from "./context";

/**
 * Fictional public figures and their stories.
 *
 * EVERY PERSON HERE IS INVENTED. Nothing in this file may describe a real person, living or
 * dead, however well known their health disclosures are. Real stories are added by editors
 * through the admin, against verified sources. Brief section 5.3.
 *
 * Owned by the stories feature team.
 */
export async function seedStories(_db: PrismaClient, _ctx: SeedContext) {
  // Filled in by the stories milestone.
}
