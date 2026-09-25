/**
 * The parts of the trials search the browser needs too: where to look, and the link out to
 * the NIHR's own search. Kept apart from `trials.ts` so the page does not bundle the registry
 * client.
 */

export type TrialPlace = "london" | "uk" | "anywhere";

export const PLACE_LABEL: Record<TrialPlace, string> = {
  london: "London",
  uk: "Anywhere in the UK",
  anywhere: "Anywhere",
};

/** The NIHR's own search, with the topic filled in. They have no public API to call instead. */
export function bePartOfResearchUrl(topic: string, place: TrialPlace): string {
  const params = new URLSearchParams({ query: topic });
  if (place === "london") params.set("location", "London");
  return `https://bepartofresearch.nihr.ac.uk/results/search-results?${params.toString()}`;
}
