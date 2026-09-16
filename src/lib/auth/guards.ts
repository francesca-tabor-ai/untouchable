import { forbidden, redirect, unauthorized } from "next/navigation";

import type { Role } from "@/generated/prisma";
import { db } from "@/lib/db";

import { auth } from "./index";

export interface CurrentUser {
  id: string;
  email: string;
  role: Role;
  ageConfirmed: boolean;
}

/**
 * The signed-in person, or null.
 *
 * Every one of these guards runs on the server. A hidden button is not a permission check —
 * brief section 9, and AGENTS.md rule 10.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

/** Require a signed-in person, or send them to sign in. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/sign-in?next=${encodeURIComponent(returnTo)}` : "/sign-in");
  }
  return user;
}

/**
 * Require someone who has confirmed they are 18 or over. Tracking is closed to anyone who
 * has not — we do not hold health data about children, at all.
 */
export async function requireAdult(returnTo?: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!user.ageConfirmed) redirect("/onboarding");
  return user;
}

const RANK: Record<Role, number> = { patient: 0, editor: 1, admin: 2 };

/**
 * Require a role, in the API sense: a request without a session is 401, a request from
 * someone who simply is not allowed is 403. We never redirect an editor-only page to the
 * public site, because that quietly hides bugs.
 */
export async function requireRole(minimum: Role): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  if (RANK[user.role] < RANK[minimum]) forbidden();
  return user;
}

export const requireEditor = () => requireRole("editor");
export const requireAdmin = () => requireRole("admin");

/**
 * Record an action against the audit log. Every admin and research endpoint calls this —
 * brief section 9.
 *
 * `params` is deliberately typed to exclude objects: audit entries must never become a
 * back door for free text or health detail.
 */
export async function recordAudit(
  actorId: string | null,
  action: string,
  params: Record<string, string | number | boolean | null> = {},
) {
  await db.auditLog.create({ data: { actorId, action, paramsJson: params } });
}
