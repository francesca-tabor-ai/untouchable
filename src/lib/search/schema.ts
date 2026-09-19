import { z } from "zod";

import { MAX_QUERY_LENGTH, SEARCH_KINDS } from "./index";

/**
 * What arrives in the query string when somebody presses the search button.
 *
 * Anything unreadable falls back to "no search" rather than throwing: a hand-typed or
 * truncated address should show the home page, not an error page.
 */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(MAX_QUERY_LENGTH).optional(),
  kind: z.enum(SEARCH_KINDS).catch("all").default("all"),
});

export type SearchParamsInput = z.infer<typeof searchParamsSchema>;

/** Parse the raw `searchParams` object a page is handed. Never throws. */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchParamsInput {
  const parsed = searchParamsSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q.slice(0, MAX_QUERY_LENGTH) : undefined,
    kind: typeof raw.kind === "string" ? raw.kind : undefined,
  });

  return parsed.success ? parsed.data : { q: undefined, kind: "all" };
}
