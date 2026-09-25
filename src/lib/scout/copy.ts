/**
 * The Research Scout's standing sentences, in one place so the language test sweeps them and
 * so the same thing is said the same way everywhere it is said.
 */

export const WHAT_THIS_IS =
  "Find recent research on a question, see who wrote it, and find studies that are recruiting. It is for learning, and for better conversations with doctors and researchers. It cannot tell you what is wrong, or what treatment to have.";

export const EXAMPLE_QUESTION = "What is the link between tinnitus and the teeth, jaw and nerves?";

export const SUMMARY_LABEL = "Plain-English summary, written by Claude from the abstract";

export const SUMMARY_CAVEAT =
  "Written by an AI from the abstract only, not the full paper. It can get things wrong. The authors' own abstract is below it.";

export const SUMMARY_UNAVAILABLE: Record<string, string> = {
  "not-configured": "Plain-English summaries are not switched on here. The authors' abstract is below.",
  "no-abstract": "This record has no abstract, so there is nothing to summarise. The link goes to the paper.",
  withheld:
    "We could not write a summary of this paper that kept to our rules, so we are not showing one. The authors' abstract is below.",
  unavailable: "The summary could not be written just now. The authors' abstract is below.",
  limited: "You have asked for a lot of summaries this hour. The authors' abstract is below, and summaries will work again soon.",
};

export const ON_DEVICE =
  "Your reading list, notes and watched searches are kept in this browser only. We never see them. Clearing your browser clears them, and they will not appear on another device.";

export const WHAT_IS_SENT =
  "Your question is sent to PubMed and Europe PMC as a search. When you ask for a summary, the paper's title and abstract are sent to Claude, an AI made by Anthropic. Nothing about your account goes with either.";

export const EMAIL_NOTICE =
  "We never send this email. You copy it, change what you like, and send it yourself. If you ask for help with the wording, what you type here is sent to Claude to write the draft, and is not kept.";

export const TRIALS_NOTICE =
  "These are listings from the ClinicalTrials.gov registry, in the registry's own words. Only the research team can say whether you can take part. Talk to your doctor before joining a study.";

export const WATCH_NOTICE =
  "We check a watched search when you open this page, if it has not been checked for a week. We cannot check while you are away, because your searches are kept on this device, not with us.";

export const COURSE_NOTICE =
  "The course builder is not ready yet. Papers you choose are kept here, ready for it, and you can save them as a file now.";

export const CONFLICT_NOTE =
  "Where studies point in different directions, both are shown with the papers behind each. We do not say which is right. The type of study on each card is a guide to how much weight it can bear.";

export const ELIGIBILITY_UNAVAILABLE: Record<string, string> = {
  "not-configured": "Plain-English rewording is not switched on here. The registry's own text is above.",
  withheld: "We could not reword this safely, so we are not showing a version. The registry's own text is above.",
  unavailable: "This could not be reworded just now. The registry's own text is above.",
  limited: "You have asked for a lot of rewording this hour. The registry's own text is above.",
};
