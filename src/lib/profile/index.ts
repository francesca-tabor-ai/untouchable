import { z } from "zod";

import { db } from "@/lib/db";
import { displayNameSchema } from "@/lib/profile/display-name";

/**
 * The profile is deliberately thin. We ask for a name to call someone by, and three
 * optional things that make the research useful. Everything here is the minimum, and the
 * shape of it is a privacy decision:
 *
 *   - Year of birth, never a date of birth. A year is enough to put someone in an age band.
 *   - A coarse region, never a postcode. "North West" cannot be walked to.
 *
 * The database also refuses a year of birth that would make the person under 18
 * (`year_of_birth_plausible`), so the rule holds even if a form is bypassed.
 */

/** Regions as ONS names them, plus the other UK nations. Coarse on purpose. */
export const REGIONS = [
  "North East",
  "North West",
  "Yorkshire and the Humber",
  "East Midlands",
  "West Midlands",
  "East of England",
  "London",
  "South East",
  "South West",
  "Scotland",
  "Wales",
  "Northern Ireland",
] as const;

/**
 * Sex is asked because some conditions and treatments differ by it. "Prefer not to say" is
 * a real answer and is stored as nothing at all, not as a category.
 */
export const SEX_OPTIONS = ["Female", "Male", "Intersex"] as const;

export { displayNameSchema };

export const MINIMUM_AGE = 18;
export const EARLIEST_YEAR_OF_BIRTH = 1900;

export function latestYearOfBirth(now: Date = new Date()): number {
  return now.getUTCFullYear() - MINIMUM_AGE;
}

/**
 * Optional fields arrive from a form as "", which means "not answered" rather than
 * "answered with nothing". Empty becomes null so we store no value at all.
 */
const blankToNull = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === "" || value === undefined ? null : value), schema);

export const profileSchema = z.object({
  displayName: displayNameSchema,
  yearOfBirth: blankToNull(
    z
      .coerce
      .number()
      .int("Please enter a year, such as 1974.")
      .min(EARLIEST_YEAR_OF_BIRTH, "Please enter a year after 1900.")
      .max(latestYearOfBirth(), `UnTouchable is for adults, so this cannot be later than ${latestYearOfBirth()}.`)
      .nullable(),
  ),
  sex: blankToNull(z.enum(SEX_OPTIONS).nullable()),
  region: blankToNull(z.enum(REGIONS).nullable()),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export function getProfile(userId: string) {
  return db.profile.findUnique({ where: { userId } });
}

/** Create the profile, or update the parts the person has just told us. */
export async function saveProfile(userId: string, input: ProfileInput) {
  const data = {
    displayName: input.displayName,
    yearOfBirth: input.yearOfBirth,
    sex: input.sex,
    region: input.region,
  };
  return db.profile.upsert({ where: { userId }, create: { userId, ...data }, update: data });
}
