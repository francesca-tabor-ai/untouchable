import { redirect } from "next/navigation";

import { canTrack } from "@/lib/profile/consent";

/**
 * Nothing about someone's health is written down without `core_tracking` consent, and the
 * check reads the consent table every time rather than trusting anything cached.
 *
 * Call this in every server action and every page that reads or writes tracking data, next
 * to `requireAdult`. The two together are the whole gate: an adult who has said yes.
 */
export async function requireTrackingConsent(userId: string): Promise<void> {
  if (!(await canTrack(userId))) redirect("/onboarding/consent");
}
