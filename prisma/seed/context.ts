import type { Condition, User } from "../../src/generated/prisma";

/** Shared handles passed to each feature's seed so nothing has to re-query the basics. */
export interface SeedContext {
  conditions: Record<string, Condition>;
  editorOne: User;
  editorTwo: User;
  admin: User;
  passwordHash: string;
}
