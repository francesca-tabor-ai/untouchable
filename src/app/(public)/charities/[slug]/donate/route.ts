import { NextResponse } from "next/server";

import { getPublicCharityDonationTarget } from "@/lib/charities/queries";
import { recordDonationReferral, toReferralOrigin } from "@/lib/charities/referrals";

/**
 * The Donate hand-off.
 *
 * Records an anonymous referral, then redirects to the charity's own donation page.
 *
 * What this handler deliberately does not do:
 *
 * - It does not read the session. It does not know, and does not ask, who is here.
 * - It does not read the IP address, the user agent, any cookie, or the referrer.
 * - It does not put anything in the outgoing URL. The destination is exactly the
 *   `donationUrl` stored on the listing — it is not built from the request.
 *
 * So a referral logged for a signed-in person and one logged for a visitor are the same row,
 * and there is no way to tell them apart afterwards. docs/privacy.md, AGENTS.md rule 12.
 *
 * Only publicly visible charities have a hand-off. An unverified listing 404s here exactly as
 * it does on the page.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const charity = await getPublicCharityDonationTarget(slug);
  if (!charity) {
    return new NextResponse("We do not have a donation page for that charity.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // A page *kind*, from a closed list. Anything else becomes "charity"; a URL never gets in.
  const origin = toReferralOrigin(new URL(request.url).searchParams.get("from"));

  // A failure to count a click must never stop someone giving.
  try {
    await recordDonationReferral({ charityId: charity.id, origin });
  } catch (error) {
    console.error("Could not record a donation referral", error);
  }

  return NextResponse.redirect(charity.donationUrl, {
    status: 303,
    headers: {
      // The charity learns nothing about where the person came from.
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    },
  });
}
