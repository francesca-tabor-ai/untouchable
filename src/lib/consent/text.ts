import { ConsentPurpose } from "@/generated/prisma";

/**
 * The words people actually read before they decide.
 *
 * This file is the wording; `src/lib/consent/index.ts` is the mechanism. They are separate
 * on purpose: the wording changes (and when it changes, everyone is asked again under the
 * new version), the mechanism does not.
 *
 * Bump CONSENT_TEXT_VERSION whenever any wording below changes in a way that alters what a
 * person is agreeing to. Every ConsentRecord stores the version shown at the time, so we
 * can always answer "what exactly did they agree to, and when".
 */
export const CONSENT_TEXT_VERSION = "2026-09-16";

/**
 * Brief section 12: consent wording, disclaimers and the takedown policy all need legal
 * review before launch. This note is shown to the person, not hidden in a comment — if we
 * are asking for explicit consent to hold special category data, we should be honest that
 * the words have not yet been checked by a lawyer.
 */
export const CONSENT_LEGAL_REVIEW_NOTE =
  "We have written this in plain English rather than legal language. It has not yet been reviewed by a lawyer, and the wording may change before we launch. If it does, we will ask you again rather than assume your answer still stands.";

/** Shown once, above the choices. True of every purpose below. */
export const CONSENT_CHANGE_NOTE =
  "You can change any of these at any time in Settings. A change takes effect straight away — not overnight, not at the end of the month.";

export interface ConsentCopy {
  purpose: ConsentPurpose;
  /** Heading for this choice. */
  title: string;
  /** The wording beside the control. This is the sentence someone is agreeing to. */
  label: string;
  /** Tracking does not work at all without this one. */
  required: boolean;
  whatWeCollect: string;
  whoSeesIt: string;
  whatItIsFor: string;
  /** What happens if this stays off, or is turned off later. */
  ifYouSayNo: string;
}

export const CONSENT_COPY: ConsentCopy[] = [
  {
    purpose: ConsentPurpose.core_tracking,
    title: "Keeping your health record for you",
    label: "Yes — store the health information I enter, and show it back to me.",
    required: true,
    whatWeCollect:
      "The conditions and symptoms you choose, the treatments you record, the answers you give to check-in questionnaires, and the daily entries you make. Year of birth, not your date of birth. A rough region, never your address or postcode.",
    whoSeesIt:
      "You. Nobody else sees your record with your name on it — not our staff in the ordinary course of work, not charities, not researchers, not advertisers. A small number of our engineers can reach the database to keep it running, and every administrative access is logged.",
    whatItIsFor:
      "Showing you what you have recorded over time, so you can see your own pattern and take it to your GP if you want to.",
    ifYouSayNo:
      "Tracking does not work without this, so there is nothing for us to show you. You can still read stories, browse conditions and follow charities.",
  },
  {
    purpose: ConsentPurpose.research_anonymised,
    title: "Anonymised research",
    label: "Include my anonymised data in research about what helps people with my condition.",
    required: false,
    whatWeCollect:
      "Nothing extra. This is about what we may do with what you have already recorded.",
    whoSeesIt:
      "Researchers see grouped figures only — for example, average symptom scores for people on a particular treatment. They never see your name, your email address or anything you have written in your own words. Notes are never included, ever. Groups of fewer than ten people are withheld entirely, so nobody can be picked out of a small number.",
    whatItIsFor:
      "Building real-world evidence about which treatments actually help, which is the thing this platform exists to do.",
    ifYouSayNo:
      "You are left out of every aggregate figure and every export. Everything else works exactly the same, and we will not ask you again unless the wording changes.",
  },
  {
    purpose: ConsentPurpose.commercial_research,
    title: "Studies funded by companies",
    label: "Include my anonymised data in studies funded by companies, such as pharmaceutical firms.",
    required: false,
    whatWeCollect: "Nothing extra.",
    whoSeesIt:
      "The same grouped, anonymised figures as above, but shared with studies that a company has paid for. Still no name, no email address, no free text, and still nothing about groups smaller than ten.",
    whatItIsFor:
      "Company-funded research is how a lot of treatment evidence gets made, and it is also how this platform pays for itself. Some people are glad to be part of that and some are not, so it is a separate question from the one above.",
    ifYouSayNo:
      "You are left out of company-funded studies. Saying no here does not affect anything else, including ordinary anonymised research if you said yes to that.",
  },
  {
    purpose: ConsentPurpose.contact_for_studies,
    title: "Being contacted about studies",
    label: "You can email me about specific studies or trials I might want to join.",
    required: false,
    whatWeCollect: "Nothing extra. We would use the email address you signed up with.",
    whoSeesIt:
      "Us. We contact you ourselves. We never hand your email address to a researcher, a company or anyone else.",
    whatItIsFor:
      "Telling you about a study you may be eligible for. It is always an invitation. Taking part is a separate decision you make with the people running the study, and it has nothing to do with your care.",
    ifYouSayNo: "We will never contact you about studies.",
  },
  {
    purpose: ConsentPurpose.marketing_email,
    title: "News and charity campaigns",
    label: "Email me news from UnTouchable and campaigns from the charities on this site.",
    required: false,
    whatWeCollect: "Nothing extra.",
    whoSeesIt: "Us. We send the email ourselves and never pass your address to a charity.",
    whatItIsFor: "Occasional news about the platform, and charity campaigns you might care about.",
    ifYouSayNo:
      "No campaign email. We will still email you about your own account when we have to — a password reset, or a change to these choices.",
  },
];

export const CONSENT_COPY_BY_PURPOSE: Record<ConsentPurpose, ConsentCopy> = Object.fromEntries(
  CONSENT_COPY.map((copy) => [copy.purpose, copy]),
) as Record<ConsentPurpose, ConsentCopy>;

/** Every purpose, in the order they are shown. Required first. */
export const CONSENT_PURPOSES: ConsentPurpose[] = CONSENT_COPY.map((copy) => copy.purpose);

/** The optional ones. Every one of these starts off, and stays off until it is switched on. */
export const OPTIONAL_CONSENT_PURPOSES: ConsentPurpose[] = CONSENT_COPY.filter(
  (copy) => !copy.required,
).map((copy) => copy.purpose);

/**
 * What we say when someone turns off core tracking. Said plainly, because it is the one
 * withdrawal with consequences a person needs to understand before they make it.
 */
export const STOP_TRACKING_CONSEQUENCES = [
  "The tracking part of the site stops working straight away. No daily log, no check-ins, no charts.",
  "We stop using your health data for anything at all, including any research you had agreed to.",
  "What you have already recorded stays in the database, so it is still there if you turn tracking back on. It is not shown to you while tracking is off, and it is not used for anything.",
  "If you want it gone rather than paused, delete your account instead. That removes every record we hold about you and cannot be undone.",
  "Anonymised figures already published or exported cannot be pulled back, because they are no longer linked to you and we could not find them if we tried.",
] as const;
