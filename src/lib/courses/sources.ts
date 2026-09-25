/**
 * Where a lesson is allowed to draw from.
 *
 * AGENTS.md rule 14, extended from medicines to the whole course: independent bodies only.
 * The NHS and NICE, the BNF and the eMC, government research institutes, the charities that
 * publish guidance rather than sell treatment, and peer-reviewed work reached through its
 * DOI or PubMed record. Never a clinic, a hearing-aid retailer, a supplement company or a
 * device maker, however good the page is.
 *
 * An allowlist of hosts rather than a blocklist, because the failure we are guarding against
 * is a new commercial site nobody thought to block.
 */

import type { CourseSource } from "./types";

export const INDEPENDENT_HOSTS: readonly string[] = [
  "nhs.uk",
  "nice.org.uk",
  "bnf.nice.org.uk",
  "medicines.org.uk",
  "nidcd.nih.gov",
  "nih.gov",
  "ncbi.nlm.nih.gov",
  "pubmed.ncbi.nlm.nih.gov",
  "doi.org",
  "cochranelibrary.com",
  "rnid.org.uk",
  "tinnitus.org.uk",
];

function hostAllowed(host: string): boolean {
  const bare = host.replace(/^www\./, "");
  return INDEPENDENT_HOSTS.some((allowed) => bare === allowed || bare.endsWith(`.${allowed}`));
}

/** A sentence for a test failure, or null when the source is independent. */
export function sourceProblem(source: CourseSource): string | null {
  let url: URL;
  try {
    url = new URL(source.url);
  } catch {
    return `"${source.url}" is not a link`;
  }
  if (url.protocol !== "https:") return `"${source.url}" is not https`;
  if (!hostAllowed(url.hostname)) {
    return `"${url.hostname}" is not on the independent-source list (AGENTS.md rule 14)`;
  }
  if (!source.supports.trim()) return `"${source.url}" does not say what it supports`;
  return null;
}
