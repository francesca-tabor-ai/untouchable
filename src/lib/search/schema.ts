import { z } from "zod";

import { MAX_QUERY_LENGTH } from "./index";

/**
 * What arrives in the query string when somebody presses the search button.
 *
 * Anything unreadable falls back to "no search" rather than throwing: a hand-typed or
 * truncated address should show the home page, not an error page.
 *
 * There is no `kind` here any more. The home-page box searches conditions and nothing else
 * (D-058), and the kind is fixed by the page rather than read off the URL — a parameter we
 * parsed and then ignored would be a trap for whoever reads this next.
 */
export const searchParamsSchema = z.object({
  q: z.string().trim().max(MAX_QUERY_LENGTH).optional(),
});

export type SearchParamsInput = z.infer<typeof searchParamsSchema>;

/** Parse the raw `searchParams` object a page is handed. Never throws. */
export function parseSearchParams(
  raw: Record<string, string | string[] | undefined>,
): SearchParamsInput {
  const parsed = searchParamsSchema.safeParse({
    q: typeof raw.q === "string" ? raw.q.slice(0, MAX_QUERY_LENGTH) : undefined,
  });

  return parsed.success ? parsed.data : { q: undefined };
}
