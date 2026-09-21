import { z } from "zod";

/**
 * What we call someone, and the only personal detail we ask for by name.
 *
 * It lives in its own module because two places need it and neither should have to import
 * the other: sign-up (`@/lib/profile/account`) asks for it at the same moment as the email
 * and the password, and the profile form (`@/lib/profile`) lets someone change it later.
 *
 * It is not a legal name and we never ask for one. A first name, a nickname or a single
 * letter are all real answers.
 */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Please tell us what to call you.")
  .max(60, "Please use 60 characters or fewer.");
