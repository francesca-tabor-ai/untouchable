/**
 * Support signposting for dependence, withdrawal and coming off a medicine.
 *
 * `src/lib/safety/constants.ts` holds the crisis contacts — NHS 111, 999, Samaritans — and
 * is platform-owned. Those are the right numbers for someone in danger now. They are not
 * the right numbers for someone who was prescribed a sleeping tablet at twenty-three and is
 * still taking it at fifty, which is the situation a medicine page can put a reader in.
 *
 * So this file sits alongside them rather than replacing them: a sensitive-topic medicine
 * surface shows both. See DECISIONS.md D-045.
 *
 * Every contact here was checked against an independent source before it was written down
 * (AGENTS.md rule 14 — never a private clinic, never a treatment provider):
 *
 * - FRANK's number, text line and web address are taken from talktofrank.com/contact-frank,
 *   and the same number is given on the NHS page below, which is the corroboration we
 *   wanted before printing a helpline number on a health platform.
 * - The NHS page is nhs.uk/live-well/addiction-support/drug-addiction-getting-help/.
 *
 * Both were checked on 18 September 2026. Re-check them at the twelve-month story review.
 */

export interface SupportContact {
  key: string;
  name: string;
  detail: string;
  /** What the person reads and acts on: a number, or a web address. */
  contact: string;
  href: string;
  /** True when following it leaves UnTouchable. */
  external?: boolean;
}

export const SUBSTANCE_SUPPORT_CONTACTS: readonly SupportContact[] = [
  {
    key: "frank",
    name: "FRANK",
    detail:
      "Confidential, non-judgemental advice about drugs, including a medicine someone was prescribed and cannot stop taking. Free, and open at any hour.",
    contact: "0300 123 6600",
    href: "tel:03001236600",
  },
  {
    key: "frank-find-support",
    name: "FRANK — find support near you",
    detail:
      "Their own search for local services. You can look without telling anyone who you are, and nothing about it comes back to us.",
    contact: "talktofrank.com",
    href: "https://www.talktofrank.com/get-help/find-support-near-you",
    external: true,
  },
  {
    key: "nhs-dependence",
    name: "NHS — getting help",
    detail:
      "The NHS says a GP is a good place to start, and that you can also go to a local treatment service yourself if you would rather not.",
    contact: "nhs.uk",
    href: "https://www.nhs.uk/live-well/addiction-support/drug-addiction-getting-help/",
    external: true,
  },
];

/**
 * The words above the contacts. Deliberately not encouraging and not discouraging: it says
 * what is there, and leaves the reader to decide. Checked in tests against the dose scanner
 * and against the charity team's giving-language patterns.
 */
export const SUBSTANCE_SUPPORT_COPY = {
  heading: "If you are trying to come off something",
  intro:
    "Stopping a medicine you have become dependent on is not something to do on your own, and it is not a failure of will. These are free, and none of them are trying to sell you anything.",
  clinical:
    "Speak to your GP or your clinical team before you change anything about a medicine you are taking. Nothing on this page is medical advice.",
} as const;
