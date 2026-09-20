import { SUBSTANCE_SUPPORT_CONTACTS, type SupportContact } from "./substance-support";

/**
 * Specialist support, matched to what a page is actually about.
 *
 * The crisis contacts in `constants.ts` — NHS 111, 999, Samaritans — are the right numbers
 * for somebody in danger tonight, and they stay on every page. They are the wrong numbers
 * for almost everything else. A person reading about childhood sexual abuse needs Rape
 * Crisis, who say plainly that it does not matter how long ago it happened. A person reading
 * about addiction needs FRANK. Offering either of them only 999 reads as not having thought
 * about them at all.
 *
 * A condition names its topic in `Condition.supportTopic`, and the pages about it render
 * that block as well as the crisis contacts. Adding a topic is a row of data and an entry
 * here — not a change to any page.
 *
 * **Every number and address below was read from two independent sources before it was
 * written down** (AGENTS.md rule 14 — never a private clinic, never anyone selling
 * treatment). Re-check them at the twelve-month review.
 */
export interface SupportTopic {
  key: string;
  /** The heading a reader sees. Written for them, not about the category. */
  heading: string;
  intro: string;
  contacts: SupportContact[];
}

/**
 * Checked 20 September 2026 against the NHS page
 * (nhs.uk/live-well/sexual-health/help-after-rape-and-sexual-assault/) and against Rape
 * Crisis England & Wales's own site (rapecrisis.org.uk/get-help/). Both give the same
 * number, which is the corroboration we want before printing a helpline on a health page.
 *
 * The NHS page is explicit that you do not have to report anything to the police, and that
 * Sexual Assault Referral Centres are for everyone "regardless of gender, age, the type of
 * incident, or when it happened". Both facts are in the copy because both are the reason
 * somebody might not otherwise ring.
 */
const SEXUAL_VIOLENCE: SupportTopic = {
  key: "sexual_violence",
  heading: "If any of this happened to you",
  intro:
    "It does not matter how long ago it was, whether you have told anyone before, or whether you are sure what to call it. You do not have to report anything to the police to get help.",
  contacts: [
    {
      key: "rape-crisis",
      name: "Rape Crisis — 24/7 Rape & Sexual Abuse Support Line",
      detail:
        "Free, day and night, for anyone affected by rape or sexual abuse, whether it happened recently or a long time ago. There is an online chat too.",
      contact: "0808 500 2222",
      href: "tel:08085002222",
      external: false,
    },
    {
      key: "sarc",
      name: "Sexual Assault Referral Centres",
      detail:
        "Specialist NHS centres offering medical care and support. They are for everyone, whatever your gender or age, and whenever it happened.",
      contact: "Find your nearest centre",
      href: "https://www.nhs.uk/service-search/sexual-health-services/find-a-rape-and-sexual-assault-referral-centre/",
      external: true,
    },
    {
      key: "survivors-trust",
      name: "The Survivors Trust",
      detail: "A UK-wide network of specialist services for survivors of sexual violence and childhood abuse.",
      contact: "thesurvivorstrust.org",
      href: "https://www.thesurvivorstrust.org/",
      external: true,
    },
  ],
};

const SUBSTANCE: SupportTopic = {
  key: "substance",
  heading: "If you are trying to come off something",
  intro:
    "Stopping something you have become dependent on is not a thing to do on your own, and it is not a failure of will. These are free, and none of them is trying to sell you anything.",
  contacts: [...SUBSTANCE_SUPPORT_CONTACTS],
};

const TOPICS: Record<string, SupportTopic> = {
  [SEXUAL_VIOLENCE.key]: SEXUAL_VIOLENCE,
  [SUBSTANCE.key]: SUBSTANCE,
};

/** The support blocks for a set of conditions, de-duplicated and in a stable order. */
export function supportTopicsFor(
  conditions: readonly { supportTopic?: string | null }[],
): SupportTopic[] {
  const keys = new Set(
    conditions.map((condition) => condition.supportTopic).filter((key): key is string => Boolean(key)),
  );
  // Unknown keys are ignored rather than throwing: a condition row naming a topic we have
  // not written yet should lose the extra block, never take the page down.
  return [...keys].map((key) => TOPICS[key]).filter((topic): topic is SupportTopic => Boolean(topic));
}

export function supportTopic(key: string | null | undefined): SupportTopic | null {
  return key ? (TOPICS[key] ?? null) : null;
}
