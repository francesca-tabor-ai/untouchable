import Link from "next/link";

import { followCharityAction, unfollowCharityAction } from "@/app/(public)/charities/actions";
import { Button } from "@/components/ui/button";
import { DONATION_COPY } from "@/lib/charities/prompt-policy";

/**
 * Follow, or stop following, a cause.
 *
 * Following a single-condition charity says something about a person's health, so the copy
 * says plainly who can see it: only them. The charity is never told. Brief 6.4.
 */
export function FollowCharity({
  charity,
  signedIn,
  following,
}: {
  charity: { id: string; slug: string; name: string };
  signedIn: boolean;
  following: boolean;
}) {
  if (!signedIn) {
    return (
      <div>
        <p className="text-small text-ink-soft">
          If you have an account, you can keep a private list of the causes you care about.
        </p>
        <p className="text-small mt-3">
          <Link
            href={`/sign-in?next=${encodeURIComponent(`/charities/${charity.slug}`)}`}
            className="text-forest-600 underline underline-offset-4"
          >
            Sign in to follow this cause
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={following ? unfollowCharityAction : followCharityAction}>
      <input type="hidden" name="charityId" value={charity.id} />
      <input type="hidden" name="slug" value={charity.slug} />
      <Button type="submit" variant="secondary" size="sm" block>
        {following ? DONATION_COPY.unfollowLabel : DONATION_COPY.followLabel}
        <span className="sr-only">: {charity.name}</span>
      </Button>
      <p className="text-legal text-muted mt-3">{DONATION_COPY.followPrivacy}</p>
    </form>
  );
}
