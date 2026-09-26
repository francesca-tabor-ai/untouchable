import { getCurrentUser } from "@/lib/auth/guards";
import { candidateRequestSchema, researchForCandidates } from "@/lib/scout/candidates";

/**
 * POST /api/scout/candidates — `{ symptoms[], candidate_conditions[], question? }` in, papers
 * out, for whichever tool is narrowing somebody's symptoms (see `src/lib/scout/candidates.ts`).
 *
 * Signed-in adults only, checked here: a route handler is not protected by the page that
 * happens to call it. This answers 401 and 403 rather than redirecting, because the caller is
 * code, not a person who can be shown a sign-in page.
 *
 * Nothing in the request is stored or logged.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in to use this." }, { status: 401 });
  if (!user.ageConfirmed) return Response.json({ error: "This is for adults only." }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = candidateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Send symptoms[] and at least one of candidate_conditions[]." }, { status: 400 });
  }

  const research = await researchForCandidates(parsed.data);
  return Response.json(research, { headers: { "Cache-Control": "private, no-store" } });
}
