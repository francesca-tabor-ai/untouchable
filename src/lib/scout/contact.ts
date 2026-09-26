/**
 * How to reach a researcher, and the one rule about it.
 *
 * **An email address is shown only if it is printed in the paper's own record.** PubMed puts
 * the corresponding author's address into the affiliation text ("Electronic address:
 * someone@university.ac.uk"); Europe PMC carries the same affiliation strings. That address
 * was published so that readers could write to that person about that paper, which is
 * exactly what the Scout helps somebody do.
 *
 * Nothing here builds an address. Not from a name and a university's domain, not from a
 * pattern seen on another paper, not from a lookup service. A guessed address reaches the
 * wrong person or no one, and either way somebody's health question has gone somewhere it
 * was not meant to go. When there is no printed address, the researcher's public profile
 * (ORCID, or their institution) is the route, and the screen says so.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

/** Addresses that appear verbatim in a piece of text. Trailing punctuation is not part of one. */
export function emailsIn(text: string | null | undefined): string[] {
  if (!text) return [];
  const found = [...text.matchAll(EMAIL)].map((match) => match[0].replace(/[.,;:]+$/, "").toLowerCase());
  return [...new Set(found)];
}

/**
 * An affiliation with the email and its "Electronic address:" label taken out, so the
 * institution reads cleanly on the card.
 */
export function affiliationWithoutEmail(text: string): string {
  return text
    .replace(/\s*Electronic address:\s*/gi, " ")
    .replace(EMAIL, "")
    .replace(/\s*[;,.]?\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * The first institution-like part of an affiliation, for a one-line display. Affiliations are
 * written as "Department, University, City, Country"; the department and university are what
 * somebody recognises.
 */
export function institutionFrom(affiliation: string | null): string | null {
  if (!affiliation) return null;
  const clean = affiliationWithoutEmail(affiliation);
  return clean ? clean.slice(0, 200) : null;
}

export function orcidUrl(orcid: string | null): string | null {
  if (!orcid) return null;
  const bare = orcid.replace(/^https?:\/\/orcid\.org\//i, "").trim();
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(bare) ? `https://orcid.org/${bare}` : null;
}

export function bareOrcid(orcid: string | null | undefined): string | null {
  if (!orcid) return null;
  const bare = orcid.replace(/^https?:\/\/orcid\.org\//i, "").trim();
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(bare) ? bare : null;
}

export type ContactRoute =
  | { kind: "email"; email: string; where: string }
  | { kind: "profile"; url: string; where: string }
  | { kind: "none"; where: string };

/**
 * The contact route for one author, in the only order allowed: a printed address, then a
 * public profile, then nothing — and "nothing" says what to try instead rather than inventing
 * something.
 */
export function contactRoute(author: { public_email: string | null; profile_url: string | null; orcid: string | null }): ContactRoute {
  if (author.public_email) {
    return { kind: "email", email: author.public_email, where: "Listed in the paper as the contact for this study." };
  }
  const profile = author.profile_url ?? orcidUrl(author.orcid);
  if (profile) {
    return { kind: "profile", url: profile, where: "No email is printed in the paper. Their public profile may list how to get in touch." };
  }
  return {
    kind: "none",
    where: "No email is printed in the paper and we found no public profile. The journal's page for the paper usually names a corresponding author.",
  };
}
