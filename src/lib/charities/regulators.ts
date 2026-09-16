import type { Regulator } from "@/generated/prisma";

/**
 * The three UK charity regulators. A listing says plainly which register it was checked
 * against, and links to that register, so anyone can check our work in a minute.
 */
export const REGULATORS: Record<
  Regulator,
  { code: Regulator; name: string; shortName: string; nations: string; registerUrl: string }
> = {
  CCEW: {
    code: "CCEW",
    name: "Charity Commission for England and Wales",
    shortName: "Charity Commission",
    nations: "England and Wales",
    registerUrl: "https://register-of-charities.charitycommission.gov.uk",
  },
  OSCR: {
    code: "OSCR",
    name: "Office of the Scottish Charity Regulator",
    shortName: "OSCR",
    nations: "Scotland",
    registerUrl: "https://www.oscr.org.uk/about-charities/search-the-register/",
  },
  CCNI: {
    code: "CCNI",
    name: "Charity Commission for Northern Ireland",
    shortName: "Charity Commission for Northern Ireland",
    nations: "Northern Ireland",
    registerUrl: "https://www.charitycommissionni.org.uk/charity-search/",
  },
};

export const REGULATOR_CODES = Object.keys(REGULATORS) as Regulator[];

export function regulatorName(code: Regulator): string {
  return REGULATORS[code].name;
}
