import { listPublicCharities } from "@/lib/charities/queries";
import { listPublicMedicines } from "@/lib/medicines/queries";
import { listConditions, listPublishedStories } from "@/lib/stories/queries";

/**
 * One search box across the whole public side of the site.
 *
 * Someone who has just been told they have tinnitus does not know whether what they want is
 * filed under a condition, a medicine, a charity or somebody's story, and should not have to.
 * They type a word; this finds it wherever it lives.
 *
 * **Everything here reads through the existing public query modules and nothing else.** There
 * is no Prisma query in this file, on purpose. `listPublishedStories` is what excludes drafts
 * and retracted stories, `listPublicCharities` is what excludes charities no editor has
 * verified, and `listPublicMedicines` is what excludes somebody's private medicine cabinet
 * from the public index. Re-implementing any of those filters here — even correctly, even
 * once — would create a second place where the rule lives, and the second place is the one
 * that gets it wrong later. `tests/unit/search-visibility.test.ts` fails if this file grows a
 * query of its own.
 *
 * There is no relevance ranking. Results keep the order their own module gave them —
 * alphabetical for conditions, medicines and charities, newest first for stories. Ranking is
 * an editorial judgement, and on a health platform an ordering reads as an endorsement.
 */

export const SEARCH_KINDS = ["all", "conditions", "medicines", "charities", "stories"] as const;

export type SearchKind = (typeof SEARCH_KINDS)[number];

export function isSearchKind(value: unknown): value is SearchKind {
  return typeof value === "string" && (SEARCH_KINDS as readonly string[]).includes(value);
}

/** The most characters we will search on. A longer string is a paste, not a search. */
export const MAX_QUERY_LENGTH = 100;

export interface SearchResult {
  /** Unique within its group. */
  id: string;
  /** What to show. */
  title: string;
  /** One plain line under the title. Never a health claim. */
  description: string;
  href: string;
  /** Shown on the result where the subject matter needs a warning. */
  needsContentNote?: boolean;
}

export interface SearchGroup {
  kind: Exclude<SearchKind, "all">;
  /** The group heading, already plural-correct. */
  label: string;
  results: SearchResult[];
}

export interface SearchOutcome {
  /** The query as searched — trimmed and capped. Empty means nothing was asked. */
  query: string;
  kind: SearchKind;
  groups: SearchGroup[];
  total: number;
}

export interface SearchInput {
  q?: string | null;
  kind?: SearchKind;
}

/** Trim, cap, and treat a box of spaces as an empty box. */
export function normaliseQuery(raw: string | null | undefined): string {
  return (raw ?? "").trim().slice(0, MAX_QUERY_LENGTH);
}

function matches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const needle = query.toLowerCase();
  return fields.some((field) => (field ?? "").toLowerCase().includes(needle));
}

const GROUP_LABELS: Record<Exclude<SearchKind, "all">, string> = {
  conditions: "Conditions",
  medicines: "Medicines and treatments",
  charities: "Charities",
  stories: "Stories",
};

/**
 * Search conditions, medicines, charities and stories.
 *
 * An empty query returns nothing rather than everything: a front page that dumps the whole
 * database the moment somebody presses enter on an empty box is not a search result.
 */
export async function search({ q, kind = "all" }: SearchInput): Promise<SearchOutcome> {
  const query = normaliseQuery(q);
  if (!query) return { query: "", kind, groups: [], total: 0 };

  const wants = (group: Exclude<SearchKind, "all">) => kind === "all" || kind === group;

  const [conditions, medicines, charities, stories] = await Promise.all([
    wants("conditions") ? listConditions() : [],
    wants("medicines") ? listPublicMedicines() : [],
    wants("charities") ? listPublicCharities() : [],
    // The stories module does its own matching in the database, across the title, the
    // summary, the person's name and the condition names.
    wants("stories") ? listPublishedStories({ q: query, take: 24 }) : [],
  ]);

  const groups: SearchGroup[] = [];

  const conditionResults: SearchResult[] = conditions
    .filter((condition) => matches(query, condition.name, condition.summary))
    .map((condition) => ({
      id: condition.id,
      title: condition.name,
      description: condition.summary,
      href: `/conditions/${condition.slug}`,
      needsContentNote: condition.isSensitiveTopic,
    }));

  const medicineResults: SearchResult[] = medicines
    .filter((medicine) => matches(query, medicine.name, medicine.summary))
    .map((medicine) => ({
      id: medicine.id,
      title: medicine.name,
      description: medicine.summary,
      href: `/medicines/${medicine.slug}`,
      needsContentNote: medicine.isSensitiveTopic,
    }));

  const charityResults: SearchResult[] = charities
    .filter((charity) => matches(query, charity.name, charity.description))
    .map((charity) => ({
      id: charity.id,
      title: charity.name,
      description: charity.description,
      href: `/charities/${charity.slug}`,
    }));

  const storyResults: SearchResult[] = stories.map((story) => ({
    id: story.id,
    title: story.title,
    description: story.figure ? story.figure.name : "A community story",
    href: `/stories/${story.slug}`,
    needsContentNote: story.needsContentNote,
  }));

  const found: [Exclude<SearchKind, "all">, SearchResult[]][] = [
    ["conditions", conditionResults],
    ["medicines", medicineResults],
    ["charities", charityResults],
    ["stories", storyResults],
  ];

  for (const [groupKind, results] of found) {
    if (results.length > 0) {
      groups.push({ kind: groupKind, label: GROUP_LABELS[groupKind], results });
    }
  }

  return {
    query,
    kind,
    groups,
    total: groups.reduce((sum, group) => sum + group.results.length, 0),
  };
}
