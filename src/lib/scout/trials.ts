import { getJson } from "./http";
import type { TrialPlace } from "./trial-links";
import type { Trial } from "./types";

/**
 * Studies that are recruiting, from ClinicalTrials.gov (API v2).
 *
 * The brief puts "clinical trial matching" out of scope, and this is not that. It is a
 * listing: the registry's own records, filtered by topic and place, with the registry's own
 * eligibility text and the contacts the registry prints. Nothing here reads a person's health
 * record against a trial, and nothing says whether anybody qualifies. That is the research
 * team's decision and the listing says so (DECISIONS.md RS-04).
 *
 * The UK's NIHR "Be Part of Research" has no public API, so it gets a link to its own search
 * with the topic filled in rather than a scraped copy of its pages.
 */

const BASE = "https://clinicaltrials.gov/api/v2/studies";


interface CtContact {
  name?: string;
  role?: string;
  phone?: string;
  email?: string;
}

interface CtLocation {
  facility?: string;
  status?: string;
  city?: string;
  country?: string;
  contacts?: CtContact[];
}

interface CtStudy {
  protocolSection?: {
    identificationModule?: { nctId?: string; briefTitle?: string };
    statusModule?: { overallStatus?: string };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      healthyVolunteers?: boolean;
      sex?: string;
      minimumAge?: string;
      maximumAge?: string;
    };
    contactsLocationsModule?: { centralContacts?: CtContact[]; locations?: CtLocation[] };
  };
}

const STATUS_LABEL: Record<string, string> = {
  RECRUITING: "Recruiting",
  NOT_YET_RECRUITING: "Not yet recruiting",
  ENROLLING_BY_INVITATION: "By invitation only",
};

/** Registry text arrives lightly Markdown-escaped ("\\<", "\\>"). */
function unescape(text: string): string {
  return text.replace(/\\([<>*_[\]()#+\-.!])/g, "$1");
}

function bullets(block: string): string[] {
  return block
    .split(/\n+/)
    .map((line) => unescape(line).replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter((line) => line.length > 0);
}

/**
 * The registry's criteria, split into who can and cannot take part. Split only on the
 * registry's own headings; text that fits neither heading is kept, as it is, under "other".
 */
export function splitEligibility(criteria: string | undefined): Pick<Trial["eligibility"], "inclusion" | "exclusion" | "other"> {
  if (!criteria) return { inclusion: [], exclusion: [], other: [] };
  const text = criteria.replace(/\r/g, "");
  const inclusionAt = text.search(/inclusion criteria\s*:?/i);
  const exclusionAt = text.search(/exclusion criteria\s*:?/i);

  if (inclusionAt < 0 && exclusionAt < 0) return { inclusion: [], exclusion: [], other: bullets(text) };

  const section = (from: number, to: number) =>
    bullets(text.slice(from, to < 0 || to < from ? undefined : to).replace(/^(in|ex)clusion criteria\s*:?/i, ""));

  return {
    inclusion: inclusionAt >= 0 ? section(inclusionAt, exclusionAt) : [],
    exclusion: exclusionAt >= 0 ? section(exclusionAt, -1) : [],
    other: inclusionAt > 0 ? bullets(text.slice(0, inclusionAt)) : [],
  };
}

function ages(min?: string, max?: string): string | null {
  if (min && max) return `${min} to ${max}`.toLowerCase();
  if (min) return `${min} and over`.toLowerCase();
  if (max) return `Up to ${max}`.toLowerCase();
  return null;
}

const SEX_LABEL: Record<string, string> = { ALL: "Any sex", FEMALE: "Women only", MALE: "Men only" };

function inPlace(location: CtLocation, place: TrialPlace): boolean {
  if (place === "anywhere") return true;
  if (location.country !== "United Kingdom") return false;
  return place === "uk" || /london/i.test(`${location.city ?? ""} ${location.facility ?? ""}`);
}

export function fromCtStudy(study: CtStudy, place: TrialPlace): Trial | null {
  const protocol = study.protocolSection;
  const nctId = protocol?.identificationModule?.nctId;
  if (!protocol || !nctId) return null;

  const eligibility = protocol.eligibilityModule;
  const locations = (protocol.contactsLocationsModule?.locations ?? []).filter((location) => inPlace(location, place));
  if (place !== "anywhere" && locations.length === 0) return null;

  // Only contacts the registry prints, with only the fields it prints.
  const contacts = [
    ...(protocol.contactsLocationsModule?.centralContacts ?? []),
    ...locations.flatMap((location) => location.contacts ?? []),
  ]
    .filter((contact) => contact.name && (contact.email || contact.phone))
    .map((contact) => ({ name: contact.name ?? "", email: contact.email ?? null, phone: contact.phone ?? null }));

  return {
    id: `nct:${nctId}`,
    registry: "clinicaltrials.gov",
    registry_id: nctId,
    title: protocol.identificationModule?.briefTitle ?? nctId,
    status: STATUS_LABEL[protocol.statusModule?.overallStatus ?? ""] ?? protocol.statusModule?.overallStatus ?? "Unknown",
    locations: [...new Set(locations.map((location) => [location.facility, location.city].filter(Boolean).join(", ")))].slice(0, 8),
    eligibility: {
      ...splitEligibility(eligibility?.eligibilityCriteria),
      ages: ages(eligibility?.minimumAge, eligibility?.maximumAge),
      sex: eligibility?.sex ? (SEX_LABEL[eligibility.sex] ?? null) : null,
      healthy_volunteers: eligibility?.healthyVolunteers ?? null,
    },
    eligibility_plain: null,
    contact_public: contacts.filter(
      (contact, index, all) => all.findIndex((other) => other.name === contact.name && other.email === contact.email) === index,
    ),
    url: `https://clinicaltrials.gov/study/${nctId}`,
  };
}

/**
 * Recruiting studies. `condition` is searched as the condition studied, which is much tighter
 * than a free-text search: a free-text "tinnitus" finds every trial that lists tinnitus as a
 * side effect. `terms` narrow it further when given.
 */
export async function searchTrials(input: { condition: string; terms?: string; place: TrialPlace }): Promise<Trial[]> {
  const params = new URLSearchParams({
    "query.cond": input.condition,
    "filter.overallStatus": "RECRUITING,NOT_YET_RECRUITING,ENROLLING_BY_INVITATION",
    pageSize: "30",
  });
  if (input.terms) params.set("query.term", input.terms);
  if (input.place === "london") params.set("query.locn", "London, United Kingdom");
  if (input.place === "uk") params.set("query.locn", "United Kingdom");

  const response = await getJson<{ studies?: CtStudy[] }>("ClinicalTrials.gov", `${BASE}?${params.toString()}`, 60 * 60 * 1000);
  return (response.studies ?? [])
    .map((study) => fromCtStudy(study, input.place))
    .filter((trial): trial is Trial => trial !== null);
}

/** One trial's record, fetched from the registry by its id — never taken from the browser. */
export async function trialCriteria(nctId: string): Promise<string | null> {
  if (!/^NCT\d{8}$/.test(nctId)) return null;
  const study = await getJson<CtStudy>("ClinicalTrials.gov", `${BASE}/${nctId}`, 60 * 60 * 1000);
  return study.protocolSection?.eligibilityModule?.eligibilityCriteria ?? null;
}
