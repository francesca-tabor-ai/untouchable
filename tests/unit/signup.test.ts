// @vitest-environment node
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { authConfig } from "@/lib/auth/config";
import { verifyPassword } from "@/lib/auth/password";
import {
  AGE_CONFIRMATION_STATEMENT,
  createAccount,
  safeReturnPath,
  SIGN_IN_PROBLEM,
  signUpSchema,
} from "@/lib/profile/account";

import { resetDatabase, testDb } from "../helpers/db";

const GOOD_PASSWORD = "seventeen llamas walked";

function parse(input: { email?: string; password?: string; displayName?: string }) {
  return signUpSchema.safeParse({
    email: input.email ?? "someone@example.test",
    password: input.password ?? GOOD_PASSWORD,
    displayName: input.displayName ?? "Sam",
  });
}

describe("signing up", () => {
  beforeEach(resetDatabase);
  afterAll(async () => {
    await testDb.$disconnect();
  });

  it("stores a hash, never the password", async () => {
    const parsed = parse({ email: "hash@example.test" });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const account = await createAccount(parsed.data);
    expect(account).not.toBeNull();

    const stored = await testDb.user.findUniqueOrThrow({ where: { id: account!.id } });
    expect(stored.passwordHash).not.toBe(GOOD_PASSWORD);
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(stored.passwordHash!, GOOD_PASSWORD)).toBe(true);
  });

  it("asks for three things and no more", () => {
    // Signing up is an email address, a password and a name. Anything else asked for here
    // is a person who did not finish, and this platform is no use to somebody who never
    // got in. Everything else is asked at the moment it is needed.
    expect(Object.keys(signUpSchema.shape).sort()).toEqual(["displayName", "email", "password"]);
  });

  it("saves the name straight onto the profile, so nothing has to ask again", async () => {
    const parsed = parse({ email: "named@example.test", displayName: "  Sam  " });
    if (!parsed.success) throw new Error("fixture");
    expect(parsed.data.displayName).toBe("Sam");

    const account = await createAccount(parsed.data);
    const profile = await testDb.profile.findUniqueOrThrow({ where: { userId: account!.id } });
    expect(profile.displayName).toBe("Sam");

    // Nothing else about the person is invented at sign-up. We hold no year of birth, no
    // sex and no region until somebody chooses to give them.
    expect(profile.yearOfBirth).toBeNull();
    expect(profile.sex).toBeNull();
    expect(profile.region).toBeNull();
  });

  it("refuses an account with no name to call someone by", () => {
    const parsed = parse({ displayName: "   " });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(parsed.error.issues[0].path).toEqual(["displayName"]);
  });

  it("records the 18-or-over confirmation on the account itself", async () => {
    const parsed = parse({ email: "adult@example.test" });
    if (!parsed.success) throw new Error("fixture");

    const account = await createAccount(parsed.data);
    const stored = await testDb.user.findUniqueOrThrow({ where: { id: account!.id } });

    // The whole tracking area is gated on this — we hold no data about under-18s at all.
    expect(stored.ageConfirmedAt).not.toBeNull();
    expect(stored.role).toBe("patient");
  });

  it("tells people plainly that creating an account confirms they are 18 or over", () => {
    // The tick box became a sentence next to the button. The rule it stood for is not
    // enforced by a tick box — `requireAdult` and the year-of-birth constraint do that —
    // but nobody may reach the button without being told.
    expect(AGE_CONFIRMATION_STATEMENT).toMatch(/18 or over/i);
    expect(AGE_CONFIRMATION_STATEMENT).toMatch(/under-18s/i);
  });

  it("takes its password rule from passwordProblem and adds none of its own", () => {
    expect(parse({ password: "short" }).success).toBe(false);

    // No composition rules. Twelve plain lowercase characters is a valid password here.
    expect(parse({ password: "aaaaaaaaaaaa" }).success).toBe(true);
  });

  it("treats an email address as the same address whatever the casing", async () => {
    const parsed = parse({ email: "  Mixed.Case@Example.Test " });
    if (!parsed.success) throw new Error("fixture");
    expect(parsed.data.email).toBe("mixed.case@example.test");

    await createAccount(parsed.data);
    const again = parse({ email: "MIXED.CASE@EXAMPLE.TEST" });
    if (!again.success) throw new Error("fixture");

    expect(await createAccount(again.data)).toBeNull();
  });

  it("never sends someone off this site after signing in", () => {
    expect(safeReturnPath("/settings/consent")).toBe("/settings/consent");
    expect(safeReturnPath("/onboarding?step=2")).toBe("/onboarding?step=2");

    // A protocol-relative URL is a different host. An open redirect on a health platform is
    // a phishing kit with our name on it.
    expect(safeReturnPath("//evil.example/login")).toBe("/onboarding");
    expect(safeReturnPath("https://evil.example")).toBe("/onboarding");
    expect(safeReturnPath("/\\evil.example")).toBe("/onboarding");
    expect(safeReturnPath("/ok\nLocation: https://evil.example")).toBe("/onboarding");
    expect(safeReturnPath(undefined)).toBe("/onboarding");
    expect(safeReturnPath(42)).toBe("/onboarding");
  });
});

describe("signing in gives nothing away", () => {
  beforeEach(resetDatabase);

  it("says the same thing whether or not the address has an account", () => {
    // Having an account here can imply a diagnosis. The message must not answer the
    // question "does this person use a health platform?" for anyone who asks it.
    expect(SIGN_IN_PROBLEM).toMatch(/did not match/i);
    for (const giveaway of [/no account/i, /not registered/i, /unknown/i, /does not exist/i, /incorrect password/i, /wrong password/i]) {
      expect(SIGN_IN_PROBLEM).not.toMatch(giveaway);
    }
  });

  it("fails identically for an unknown address and for a wrong password", async () => {
    const parsed = parse({ email: "known@example.test" });
    if (!parsed.success) throw new Error("fixture");
    await createAccount(parsed.data);

    const provider = authConfig.providers[0] as unknown as {
      authorize: (credentials: Record<string, unknown>) => Promise<unknown>;
    };

    const unknownAddress = await provider.authorize({
      email: "nobody@example.test",
      password: GOOD_PASSWORD,
    });
    const wrongPassword = await provider.authorize({
      email: "known@example.test",
      password: "not the right one at all",
    });

    expect(unknownAddress).toBeNull();
    expect(wrongPassword).toBeNull();
  });
});
