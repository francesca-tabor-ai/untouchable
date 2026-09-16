/**
 * Support signposting. These numbers appear on the safety screen, in the footer, and
 * anywhere a person might be in difficulty.
 *
 * Do not reword these without checking the Samaritans media guidelines. Do not put a
 * donation prompt on any surface that shows them.
 */
export const SUPPORT_CONTACTS = [
  {
    key: "nhs111",
    name: "NHS 111",
    detail: "For urgent medical help that is not an emergency. Free, day and night.",
    contact: "111",
    href: "tel:111",
  },
  {
    key: "emergency",
    name: "999",
    detail: "If someone's life is at risk, or you cannot keep yourself safe right now.",
    contact: "999",
    href: "tel:999",
  },
  {
    key: "samaritans",
    name: "Samaritans",
    detail: "Whatever you are going through, you can talk it through. Free, day and night.",
    contact: "116 123",
    href: "tel:116123",
  },
] as const;

/** Reporting a suspected side effect of a medicine — brief section 7.8. */
export const YELLOW_CARD_URL = "https://yellowcard.mhra.gov.uk";
