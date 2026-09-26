import { WOMENS_HEALTH } from "@/lib/personalised-medicine/womens-health";

/**
 * The pages under Personalised medicine.
 *
 * "Personalised" here means how who you are — your sex, your hormones, your stage of life —
 * changes which conditions you are likely to meet, how they show up, and how medicines are
 * studied. It does not mean anything on this site is personalised to you: nothing here reads
 * your records or tells you what to do (AGENTS.md rule 9).
 *
 * Only pages that exist are listed. A "coming soon" card is a link somebody taps and regrets.
 */
export interface PersonalisedTopic {
  href: string;
  title: string;
  summary: string;
}

export const PERSONALISED_TOPICS: readonly PersonalisedTopic[] = [
  {
    href: `/personalised-medicine/${WOMENS_HEALTH.slug}`,
    title: WOMENS_HEALTH.title,
    summary: WOMENS_HEALTH.summary,
  },
];

export const PERSONALISED_NOT_ADVICE =
  "These pages explain what is known about groups of people, in plain words, from the NHS and the UK Government. They are not medical advice and they are not about you personally. Nothing here is a reason to start, stop or change a treatment — your GP, pharmacist or clinical team can talk that through with you.";
