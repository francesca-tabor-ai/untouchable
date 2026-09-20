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

/**
 * Checked 20 September 2026 against Macmillan's own page for the support line
 * (macmillan.org.uk/cancer-information-and-support/get-help/emotional-help/macmillan-support-line)
 * and against NHS trust pages that publish the same number — the two independent readings we
 * want before a helpline goes on a health page.
 *
 * Maggie's is here because it asks nothing of the person: the centres sit in the grounds of
 * NHS cancer hospitals, there is no referral and no appointment, and it is free. That is a
 * lower bar to clear than a phone call on a day when you cannot face one.
 *
 * Neither of them sells treatment, which is the rule this list exists under (AGENTS.md
 * rule 14). Nothing here recommends a treatment or suggests one works — this is who to talk
 * to, not what to do.
 */
const CANCER: SupportTopic = {
  key: "cancer",
  heading: "If you want to talk to someone about cancer",
  intro:
    "You do not have to be newly diagnosed, or in treatment, or the person who is ill. These are free, and they are for whatever you have on your mind, including the parts that are not medical — money, work, or how to tell people.",
  contacts: [
    {
      key: "macmillan",
      name: "Macmillan Support Line",
      detail:
        "Free, 8am to 8pm every day, for anyone affected by cancer. Nurses, and advisers on money and work as well.",
      contact: "0808 808 00 00",
      href: "tel:08088080000",
      external: false,
    },
    {
      key: "maggies",
      name: "Maggie's centres",
      detail:
        "Free drop-in support in the grounds of NHS cancer hospitals. No referral, no appointment, and family and friends can go too.",
      contact: "Find your nearest centre",
      href: "https://www.maggies.org/our-centres/",
      external: true,
    },
  ],
};

/**
 * Checked 20 September 2026. Drinkline's number was read from the NHS alcohol support page
 * and from Alcohol Change UK; the AA helpline from AA's own site and the NHS service
 * directory. Alcohol Change UK is a link rather than a number, so there is nothing to get
 * wrong.
 *
 * The intro carries a warning the other topics do not need. The NHS is explicit that it can
 * be very dangerous to stop drinking suddenly if you are dependent, and withdrawal can mean
 * seizures. This block sits under stories about people who stopped. Leaving that out and
 * letting the page read as encouragement to do the same tonight is the harm here, so it goes
 * first, before any of the numbers.
 */
const ALCOHOL: SupportTopic = {
  key: "alcohol",
  heading: "If you are worried about your drinking",
  intro:
    "If you are dependent on alcohol, stopping suddenly can be dangerous — the NHS says withdrawal can cause seizures, and it is not something to do on your own. See a GP or one of these first. Nobody here is going to tell you off, and none of them is selling anything.",
  contacts: [
    {
      key: "drinkline",
      name: "Drinkline",
      detail:
        "The national alcohol helpline. Free and confidential, weekdays 9am to 8pm and weekends 11am to 4pm. It is for people worried about someone else's drinking too.",
      contact: "0300 123 1110",
      href: "tel:03001231110",
      external: false,
    },
    {
      key: "alcoholics-anonymous",
      name: "Alcoholics Anonymous",
      detail: "A free helpline, answered by people who have been there, day and night.",
      contact: "0800 917 7650",
      href: "tel:08009177650",
      external: false,
    },
    {
      key: "alcohol-change-uk",
      name: "Alcohol Change UK",
      detail:
        "Information, and a way to check your own drinking without telling anyone about it first.",
      contact: "alcoholchange.org.uk",
      href: "https://alcoholchange.org.uk/help-and-support/get-help-now",
      external: true,
    },
  ],
};

/**
 * Checked 20 September 2026. Beat's helpline number was read from Beat's own helpline page
 * (beateatingdisorders.org.uk) and from the NHS eating disorders page, which prints the same
 * number — the two independent readings this list is written under.
 *
 * The intro does one job before any number: it says that you do not have to be thin, or
 * diagnosed, or at some threshold of bad enough. The NHS is explicit that bulimia can affect
 * anyone and that people with it are often an ordinary weight, and being turned away for not
 * looking ill enough is the reason somebody stops asking. One of the stories this block sits
 * under is about exactly that — a GP who asked whether she was anorexic, then whether she was
 * bulimic, and on two noes said there was nothing available.
 */
const EATING_DISORDER: SupportTopic = {
  key: "eating_disorder",
  heading: "If your relationship with food is hurting you",
  intro:
    "You do not have to be underweight, or diagnosed, or sure what to call it. Eating disorders are treatable, and treatment works better the earlier it starts — so it is worth asking now rather than when it gets worse. If you have asked before and were turned away, you are allowed to ask again.",
  contacts: [
    {
      key: "beat",
      name: "Beat — eating disorders helpline",
      detail:
        "Free and confidential, for anyone affected by an eating disorder, including families. There is a one-to-one webchat as well as the phone.",
      contact: "0808 801 0677",
      href: "tel:08088010677",
      external: false,
    },
    {
      key: "beat-other-nations",
      name: "Beat in Scotland, Wales and Northern Ireland",
      detail:
        "Beat runs a separate free number for each nation, and online support groups you can join without speaking.",
      contact: "beateatingdisorders.org.uk",
      href: "https://www.beateatingdisorders.org.uk/get-information-and-support/get-help-for-myself/i-need-support-now/helplines/",
      external: true,
    },
    {
      key: "nhs-eating-disorders",
      name: "NHS — getting help",
      detail:
        "What to expect from a GP appointment, and what treatment for an eating disorder actually involves.",
      contact: "nhs.uk",
      href: "https://www.nhs.uk/mental-health/feelings-symptoms-behaviours/behaviours/eating-disorders/overview/",
      external: true,
    },
  ],
};

/**
 * Checked 20 September 2026. The Sickle Cell Society's number was read from the Society's own
 * site and from NHS trust pages — University College London Hospitals and University Hospitals
 * Coventry and Warwickshire both publish it for their sickle cell and thalassaemia services —
 * and the Society is in the NHS service directory.
 *
 * It is a charity, and it does not sell treatment (rule 14).
 */
const SICKLE_CELL: SupportTopic = {
  key: "sickle_cell",
  heading: "If sickle cell is in your family",
  intro:
    "This is for people living with sickle cell, for parents and partners, and for carriers who have just found out. It is also for anyone who has been told a crisis was something else, which happens.",
  contacts: [
    {
      key: "sickle-cell-society",
      name: "Sickle Cell Society",
      detail:
        "Advice and support, weekdays, from the national charity. They also run local support groups and a mentoring scheme.",
      contact: "020 8961 7795",
      href: "tel:02089617795",
      external: false,
    },
    {
      key: "nhs-sickle-cell",
      name: "NHS — sickle cell disease",
      detail:
        "What sickle cell is, what a crisis is, how it is inherited, and what having the trait does and does not mean.",
      contact: "nhs.uk",
      href: "https://www.nhs.uk/conditions/sickle-cell-disease/",
      external: true,
    },
  ],
};

/**
 * Checked 20 September 2026. The Spinal Injuries Association support line was read from SIA's
 * own site and from the NHS Sussex Trauma Network service directory, which publishes the same
 * freephone number and the hours. Back Up's details are from Back Up's own site.
 *
 * Neither sells treatment. SIA runs an online shop of everyday products, which is not
 * treatment and is not what we are pointing anyone at; the support line is.
 *
 * Both are here for the same reason Maggie's is on the cancer block: the thing people say
 * helped most after a spinal cord injury is talking to somebody who has one.
 */
const SPINAL_CORD_INJURY: SupportTopic = {
  key: "spinal_cord_injury",
  heading: "If you or someone close to you has a spinal cord injury",
  intro:
    "Nerve damage affects far more than walking, and a lot of it is hard to raise with anyone. These are free, and they are staffed largely by people who have been through it themselves — including for partners and family, who often get asked how the injured person is and never how they are.",
  contacts: [
    {
      key: "sia-support-line",
      name: "Spinal Injuries Association support line",
      detail:
        "Free, weekdays 10am to 4pm, for people with a spinal cord injury, their families, and health professionals.",
      contact: "0800 980 0501",
      href: "tel:08009800501",
      external: false,
    },
    {
      key: "back-up",
      name: "Back Up",
      detail:
        "One-to-one mentoring from people living with spinal cord injury, courses, wheelchair skills, and separate mentoring for family members.",
      contact: "backuptrust.org.uk",
      href: "https://www.backuptrust.org.uk/",
      external: true,
    },
  ],
};

/**
 * Checked 20 September 2026. Changing Faces' support and information line was read from the
 * charity's own page and corroborated in independent public directories; the Katie Piper
 * Foundation's number and referral route are from the Foundation's own site, and it is a
 * registered charity (1133313) providing rehabilitation rather than selling it.
 *
 * A conflict worth naming: one of the stories this block sits under is Katie Piper's, and she
 * founded that Foundation. The page says so in our own voice rather than quietly leaving out
 * the one national charity that exists for burn survivors (see DECISIONS.md, and PL-32 for
 * the same handling of a commercial interest).
 *
 * Changing Faces is not a crisis service and says so; the crisis contacts remain on the page.
 */
const BURNS: SupportTopic = {
  key: "burns",
  heading: "If you are living with a burn, a scar or a visible difference",
  intro:
    "Recovery after a burn is mostly the long part, not the emergency — rehabilitation, scars that tighten, and how other people behave in the street. There is support for both halves of that, and it does not matter how long ago it happened.",
  contacts: [
    {
      key: "changing-faces",
      name: "Changing Faces — support and information line",
      detail:
        "For anyone with a scar, mark or condition on their face or body, and for how it is affecting you rather than how it looks. Open to anyone over 16.",
      contact: "0300 012 0275",
      href: "tel:03000120275",
      external: false,
    },
    {
      key: "katie-piper-foundation",
      name: "Katie Piper Foundation",
      detail:
        "Rehabilitation for people with burns and traumatic scarring — physiotherapy, scar care, psychological therapy and peer support. You can refer yourself, however long ago your injury was.",
      contact: "katiepiperfoundation.org.uk",
      href: "https://katiepiperfoundation.org.uk/",
      external: true,
    },
    {
      key: "nhs-acid-and-chemical-burns",
      name: "NHS — acid and chemical burns",
      detail:
        "What to do in the first minutes, and what happens afterwards. If it has just happened, call 999.",
      contact: "nhs.uk",
      href: "https://www.nhs.uk/conditions/acid-and-chemical-burns/",
      external: true,
    },
  ],
};

/**
 * Checked 20 September 2026, and the check changed what went on the page.
 *
 * Several NHS-adjacent and council directories still print a PANDAS telephone helpline —
 * 0808 1961 776, 11am to 10pm. PANDAS's own site does not: its support page lists WhatsApp,
 * a bookable callback, email and groups, and sends anyone in crisis to Samaritans or 999.
 * The second reading is the one that counts, so no number is printed here. A number that
 * rings out is worse than no number, particularly for somebody who had to work up to
 * dialling it.
 *
 * The NHS route is first because it is the one that leads to treatment: a GP, a midwife or
 * a health visitor can refer to a specialist perinatal mental health team.
 */
const PERINATAL_MENTAL_HEALTH: SupportTopic = {
  key: "perinatal_mental_health",
  heading: "If you are struggling in pregnancy or since the birth",
  intro:
    "Feeling like this does not mean you are a bad parent and it will not be taken as one. It is common, it is treatable, and saying it out loud early makes it shorter. You do not have to have worked out what is wrong first.",
  contacts: [
    {
      key: "nhs-perinatal",
      name: "NHS — depression in pregnancy and after the birth",
      detail:
        "What it looks like and what help there is. A GP, midwife or health visitor can refer you to a specialist perinatal mental health team, and telling them is not the same as being reported.",
      contact: "nhs.uk",
      href: "https://www.nhs.uk/pregnancy/mental-health-in-pregnancy-and-after-the-birth/depression/",
      external: true,
    },
    {
      key: "pandas",
      name: "PANDAS Foundation",
      detail:
        "Free support for parents and partners affected by perinatal mental illness — WhatsApp on weekdays, a callback you can book for a time that suits you, email, and groups you can sit in without speaking.",
      contact: "pandasfoundation.org.uk",
      href: "https://pandasfoundation.org.uk/how-we-can-support-you/",
      external: true,
    },
  ],
};

const TOPICS: Record<string, SupportTopic> = {
  [SEXUAL_VIOLENCE.key]: SEXUAL_VIOLENCE,
  [SUBSTANCE.key]: SUBSTANCE,
  [CANCER.key]: CANCER,
  [ALCOHOL.key]: ALCOHOL,
  [EATING_DISORDER.key]: EATING_DISORDER,
  [SICKLE_CELL.key]: SICKLE_CELL,
  [SPINAL_CORD_INJURY.key]: SPINAL_CORD_INJURY,
  [BURNS.key]: BURNS,
  [PERINATAL_MENTAL_HEALTH.key]: PERINATAL_MENTAL_HEALTH,
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
