import { Button } from "@/components/ui/button";
import { DONATION_COPY } from "@/lib/charities/prompt-policy";
import type { ReferralOrigin } from "@/lib/charities/referrals";

/**
 * The Donate hand-off.
 *
 * It is a plain link to our own hand-off route, which records an anonymous referral and then
 * redirects to the charity's own donation page. Deliberately not a button with JavaScript:
 * giving must work if a script fails, and a server-side redirect means we never need a
 * tracking script on the page to count a click.
 *
 * `rel="noopener noreferrer"` on every one of these: the charity's page gets no handle on
 * our window and no referrer. No user data is passed, because there is none to pass — the
 * URL carries the charity's slug and a page *kind*, nothing else.
 */
export function DonateLink({
  charity,
  origin,
  size = "md",
  block = false,
  showHint = true,
}: {
  charity: { slug: string; name: string };
  origin: ReferralOrigin;
  size?: "sm" | "md" | "lg";
  block?: boolean;
  showHint?: boolean;
}) {
  return (
    <div className={block ? "w-full" : undefined}>
      <Button asChild size={size} block={block}>
        <a
          href={`/charities/${charity.slug}/donate?from=${origin}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {DONATION_COPY.donateLabel}
          <span className="sr-only"> for {charity.name} (opens in a new tab)</span>
        </a>
      </Button>
      {showHint ? <p className="text-legal text-muted mt-3">{DONATION_COPY.donateHint}</p> : null}
    </div>
  );
}
