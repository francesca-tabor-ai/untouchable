import { hash } from "@node-rs/argon2";

import { PrismaClient } from "../../src/generated/prisma";

/**
 * Internal accounts for development.
 *
 * Two editors, because publishing a story requires a second person to verify the sources —
 * with one editor the workflow cannot be demonstrated at all.
 *
 * These passwords are deliberately obvious and exist only in development. The seed refuses
 * to run outside development; see index.ts.
 */
export const DEV_PASSWORD = "untouchable-dev-password";

export async function seedStaff(db: PrismaClient) {
  const passwordHash = await hash(DEV_PASSWORD);

  const make = (email: string, role: "editor" | "admin" | "patient", displayName: string) =>
    db.user.upsert({
      where: { email },
      update: { role },
      create: {
        email,
        role,
        passwordHash,
        ageConfirmedAt: new Date(),
        emailVerified: new Date(),
        profile: { create: { displayName } },
      },
    });

  const [editorOne, editorTwo, admin] = await Promise.all([
    make("editor.one@untouchable.example", "editor", "Dev Editor One"),
    make("editor.two@untouchable.example", "editor", "Dev Editor Two"),
    make("admin@untouchable.example", "admin", "Dev Admin"),
  ]);

  return { editorOne, editorTwo, admin, passwordHash };
}
