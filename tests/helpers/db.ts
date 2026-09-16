import { PrismaClient } from "@/generated/prisma";

/**
 * Test database client. Points at untouchable_test via .env.test, which tests/setup.ts
 * loads before anything else.
 */
export const testDb = new PrismaClient();

/**
 * Empty every table between tests. TRUNCATE ... CASCADE is far faster than deleting in
 * dependency order, and it cannot be defeated by a foreign key we forgot about.
 */
export async function resetDatabase() {
  const tables = await testDb.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  if (list) await testDb.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

let counter = 0;

/** A user with a unique email, so repeated runs never collide. */
export async function makeUser(
  overrides: Partial<{ email: string; role: "patient" | "editor" | "admin" }> = {},
) {
  counter += 1;
  return testDb.user.create({
    data: {
      email: overrides.email ?? `test-${Date.now()}-${counter}@example.test`,
      role: overrides.role ?? "patient",
      ageConfirmedAt: new Date(),
    },
  });
}
