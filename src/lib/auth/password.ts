import { hash, verify } from "@node-rs/argon2";

/**
 * Argon2id. Chosen over bcrypt because it resists GPU and ASIC attack far better, which
 * matters more than usual here: the thing behind these passwords is somebody's medical
 * history.
 *
 * Parameters follow OWASP's 2024 guidance for Argon2id (19 MiB, 2 iterations, parallelism 1).
 */
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password, OPTIONS);
  } catch {
    // A malformed or legacy hash is a failed sign-in, never a crash that leaks which.
    return false;
  }
}

/**
 * Deliberately minimal: length is what actually protects a password, and rules that force
 * symbols mostly produce "Password1!". NIST SP 800-63B agrees.
 */
export function passwordProblem(password: string): string | null {
  if (password.length < 12) return "Please use at least 12 characters.";
  if (password.length > 200) return "That is longer than we can store. Please use under 200 characters.";
  return null;
}
