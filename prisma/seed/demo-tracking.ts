import { PrismaClient } from "../../src/generated/prisma";

import type { SeedContext } from "./context";

/**
 * Demo patients with enough history to make the dashboard and the research view real.
 *
 * All invented. Generate enough people that small-group suppression can be demonstrated
 * both ways: at least one condition with a cohort over the threshold, and at least one
 * under it, so the suppression behaviour is visible rather than theoretical.
 *
 * Owned by the tracking feature team.
 */
export async function seedDemoTracking(_db: PrismaClient, _ctx: SeedContext) {
  // Filled in by the tracking milestones.
}
