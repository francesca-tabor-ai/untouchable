import type { Metadata } from "next";
import Link from "next/link";

import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { recordAudit, requireEditor } from "@/lib/auth/guards";
import { referralReport } from "@/lib/charities/referrals";

// Always rendered per request: these pages read the database, and some of them read the
// session. Nothing here may be cached into a static page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Referral clicks",
  robots: { index: false, follow: false },
};

/**
 * How many people we sent to each charity's donation page.
 *
 * There is no user data on this page and there cannot be. A `DonationReferral` row holds a
 * charity and a page kind; it has no user id, no IP address and no URL, so there is nothing
 * here to aggregate into a person. It does not go through `src/lib/research/aggregate.ts`
 * because there is no consent to filter and no small group to suppress — nobody is in the
 * data. See docs/privacy.md.
 *
 * Follows and donation notes are health data and never appear here.
 */
export default async function ReferralReportPage() {
  const editor = await requireEditor();
  const report = await referralReport();
  await recordAudit(editor.id, "charity.referralReport", { charities: report.rows.length });

  return (
    <Container className="py-12">
      <p className="text-small">
        <Link href="/admin/charities" className="text-forest-600 underline underline-offset-4">
          Charity listings
        </Link>
      </p>
      <h1 className="text-display mt-6">Referral clicks</h1>
      <p className="text-ink-soft mt-3 max-w-[42rem]">
        {report.totals.all} clicks through to a charity&rsquo;s donation page in total,{" "}
        {report.totals.last30Days} in the last {report.windowDays} days.
      </p>

      <Callout className="mt-8 max-w-[42rem]" title="What this does and does not show">
        <p>
          A click through to a donation page, and the kind of page it came from. It does not show
          whether anyone gave anything — the money goes straight to the charity and we never see it.
        </p>
        <p className="mt-2">
          There is no person in this data. A referral records the charity and the page kind, and
          nothing else: no user, no IP address, no URL. A click by someone signed in and a click by
          a visitor are the same row. Who follows a charity, and who has noted a donation, never
          appears here and is never shared with anyone.
        </p>
      </Callout>

      <h2 className="sr-only">Clicks by charity</h2>
      <div className="mt-10 overflow-x-auto">
        <table className="text-small w-full min-w-[42rem] border-collapse text-left">
          <caption className="sr-only">
            Referral clicks per charity, in total, over the last 30 days, and by the kind of page
            the click came from.
          </caption>
          <thead>
            <tr className="border-line-strong border-b">
              <th scope="col" className="py-3 pr-4 font-semibold">
                Charity
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-semibold">
                Total
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-semibold">
                Last 30 days
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-semibold">
                Charity page
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-semibold">
                Condition page
              </th>
              <th scope="col" className="py-3 pr-4 text-right font-semibold">
                Story page
              </th>
              <th scope="col" className="py-3 text-right font-semibold">
                Causes page
              </th>
            </tr>
          </thead>
          <tbody>
            {report.rows.map((row) => (
              <tr key={row.charityId} className="border-line border-b">
                <th scope="row" className="py-3 pr-4 font-medium">
                  <Link
                    href={`/admin/charities/${row.charityId}`}
                    className="text-forest-700 underline underline-offset-4"
                  >
                    {row.charityName}
                  </Link>
                </th>
                <td className="py-3 pr-4 text-right">{row.total}</td>
                <td className="py-3 pr-4 text-right">{row.last30Days}</td>
                <td className="py-3 pr-4 text-right">{row.byOrigin.charity}</td>
                <td className="py-3 pr-4 text-right">{row.byOrigin.condition}</td>
                <td className="py-3 pr-4 text-right">{row.byOrigin.story}</td>
                <td className="py-3 text-right">{row.byOrigin.causes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {report.rows.length === 0 ? (
        <p className="text-ink-soft mt-8">There are no charity listings yet.</p>
      ) : null}
    </Container>
  );
}
