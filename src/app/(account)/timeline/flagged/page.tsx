import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FlagScreen } from "@/components/timeline/flag-screen";
import { requireAdult } from "@/lib/auth/guards";
import { requireTrackingConsent } from "@/lib/onboarding/require-consent";
import { flagResponse } from "@/lib/timeline/flag-response";
import { flagRuleByKey } from "@/lib/timeline/urgent-flags";

export const metadata: Metadata = { title: "Please get this looked at" };

/**
 * The whole response when a rule fires.
 *
 * A page of its own rather than a banner on the timeline, because a banner is something to
 * scroll past and this is not. There is nothing else on it.
 *
 * The rule arrives as a key in the URL. That is deliberately harmless: the key names a rule,
 * not a person and not a health record, so nothing about anybody's health is in a link that
 * might end up in a browser history somebody else can see.
 */
export default async function FlaggedPage({
  searchParams,
}: {
  searchParams: Promise<{ rule?: string }>;
}) {
  const user = await requireAdult("/timeline");
  await requireTrackingConsent(user.id);

  const { rule: key } = await searchParams;
  const rule = key ? flagRuleByKey(key) : null;
  if (!rule) notFound();

  return (
    <FlagScreen
      response={flagResponse({ rule, tier: rule.tier, matched: "", historical: false })}
    />
  );
}
