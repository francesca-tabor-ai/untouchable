import { cookies } from "next/headers";

import type { Item } from "./definition";
import { validateAnswers, type Answers, type RawAnswers } from "./answers";

/**
 * Save and resume, for somebody halfway through a questionnaire.
 *
 * Brief principle 9, and the reality of the thing: a long questionnaire is often answered on
 * a phone in a waiting room, and the person gets called in. Losing the lot is not acceptable.
 *
 * **Where a half-finished answer lives.** In a cookie on the person's own device — signed by
 * nothing, read by nothing but the server, scoped by `path` to the one page the draft belongs
 * to so it is not attached to every other request they make, `httpOnly` so no script can read
 * it, and deleted the moment the answers are actually recorded.
 *
 * It is not in the database because there is no table for it, and the schema belongs to the
 * platform lead. A `QuestionnaireDraft` table would be better — it would survive changing
 * device, which a cookie does not — and that is raised with the platform lead rather than
 * worked around by putting half-finished answers into `Response` where every later milestone
 * would read them as real ones.
 *
 * A draft is never scored, never red-flag checked and never becomes a response on its own.
 */

export interface DraftScope {
  /** Unique per thing being answered, e.g. `baseline-<versionId>` or `checkin-<id>`. */
  key: string;
  /** The page the draft belongs to. The cookie is not sent anywhere else. */
  path: string;
}

/** A month. Long enough to be genuinely useful, short enough not to linger. */
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

/**
 * Cookies are capped at around 4KB by every browser. A draft larger than this is dropped
 * rather than truncated: losing the resume is a small disappointment, silently keeping half
 * of somebody's answers would be a lie.
 */
const MAX_BYTES = 3500;

function cookieName(scope: DraftScope): string {
  return `ut_draft_${scope.key.replace(/[^A-Za-z0-9_-]/g, "_")}`;
}

/** What was saved last time, checked against the current questions before it is trusted. */
export async function readDraft(scope: DraftScope, items: Item[]): Promise<Answers> {
  const store = await cookies();
  const raw = store.get(cookieName(scope))?.value;
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};

  // A draft is checked against the version's items like anything else. If the questions have
  // moved on underneath it, what no longer fits is dropped rather than shown back.
  const checked = validateAnswers(items, parsed as RawAnswers, { partial: true });
  if (checked.ok) return checked.answers;

  const kept: Answers = {};
  for (const item of items) {
    const value = (parsed as RawAnswers)[item.key];
    if (value === undefined) continue;
    const single = validateAnswers([item], { [item.key]: value }, { partial: true });
    if (single.ok && single.answers[item.key] !== undefined) kept[item.key] = single.answers[item.key];
  }
  return kept;
}

/** Keep what has been filled in so far. Returns false if it was too big to keep. */
export async function saveDraft(
  scope: DraftScope,
  items: Item[],
  answers: RawAnswers,
): Promise<boolean> {
  const checked = validateAnswers(items, answers, { partial: true });
  const keep = checked.ok ? checked.answers : {};
  const body = JSON.stringify(keep);

  if (Buffer.byteLength(body, "utf8") > MAX_BYTES) {
    await clearDraft(scope);
    return false;
  }

  const store = await cookies();
  store.set(cookieName(scope), body, {
    path: scope.path,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
  });
  return true;
}

/** Forget the draft. Called as soon as the answers are recorded for real. */
export async function clearDraft(scope: DraftScope): Promise<void> {
  const store = await cookies();
  store.set(cookieName(scope), "", { path: scope.path, maxAge: 0 });
}
