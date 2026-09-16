import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { recordAudit, requireEditor } from "@/lib/auth/guards";
import { listCharitiesForAdmin, type AdminCharityRow } from "@/lib/charities/admin";
import { REGULATORS } from "@/lib/charities/regulators";
import { REVERIFY_AFTER_MONTHS, reverifyDueAt } from "@/lib/charities/verification";

import { verifyCharityAction } from "./actions";

// Always rendered per request: these pages read the database, and some of them read the
// session. Nothing here may be cached into a static page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Charity listings",
  robots: { index: false, follow: false },
};

const dateFormat: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };

export default async function AdminCharitiesPage() {
  const editor = await requireEditor();
  const charities = await listCharitiesForAdmin();
  await recordAudit(editor.id, "charity.list", { count: charities.length });

  const neverVerified = charities.filter((row) => row.verification === "never_verified");
  const lapsed = charities.filter((row) => row.verification === "lapsed");

  return (
    <Container className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display">Charity listings</h1>
          <p className="text-ink-soft mt-2">
            {charities.length} listings. {charities.filter((row) => row.publiclyVisible).length}{" "}
            visible on the public site.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/charities/referrals">Referral clicks</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/charities/new">Add a charity</Link>
          </Button>
        </div>
      </div>

      {lapsed.length > 0 || neverVerified.length > 0 ? (
        <Callout tone="warm" className="mt-8" title="Listings that need a look">
          <ul className="list-disc space-y-1 pl-5">
            {lapsed.length > 0 ? (
              <li>
                {lapsed.length} {lapsed.length === 1 ? "listing has" : "listings have"} not been
                checked against the register for {REVERIFY_AFTER_MONTHS} months:{" "}
                {lapsed.map((row) => row.name).join(", ")}.
              </li>
            ) : null}
            {neverVerified.length > 0 ? (
              <li>
                {neverVerified.length}{" "}
                {neverVerified.length === 1 ? "listing has" : "listings have"} never been checked,
                so {neverVerified.length === 1 ? "it is" : "they are"} not public:{" "}
                {neverVerified.map((row) => row.name).join(", ")}.
              </li>
            ) : null}
          </ul>
        </Callout>
      ) : null}

      <h2 className="sr-only">All listings</h2>
      <div className="mt-10 overflow-x-auto">
        <table className="text-small w-full min-w-[46rem] border-collapse text-left">
          <caption className="sr-only">
            Every charity listing, with its verification state and whether the public can see it.
          </caption>
          <thead>
            <tr className="border-line-strong border-b">
              <th scope="col" className="py-3 pr-4 font-semibold">
                Charity
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                Register
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                Verification
              </th>
              <th scope="col" className="py-3 pr-4 font-semibold">
                Public
              </th>
              <th scope="col" className="py-3 font-semibold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {charities.map((row) => (
              <Row key={row.id} row={row} />
            ))}
          </tbody>
        </table>
      </div>

      {charities.length === 0 ? (
        <p className="text-ink-soft mt-8">
          There are no charity listings yet.{" "}
          <Link
            href="/admin/charities/new"
            className="text-forest-600 underline underline-offset-4"
          >
            Add the first one
          </Link>
          .
        </p>
      ) : null}
    </Container>
  );
}

function Row({ row }: { row: AdminCharityRow }) {
  return (
    <tr className="border-line border-b align-top">
      <th scope="row" className="py-4 pr-4 font-medium">
        <Link
          href={`/admin/charities/${row.id}`}
          className="text-forest-700 underline underline-offset-4"
        >
          {row.name}
        </Link>
        <span className="text-muted mt-1 block font-normal">
          {row.conditions.map((condition) => condition.name).join(", ") || "No conditions tagged"}
        </span>
        {!row.logoPermission ? (
          <span className="text-muted mt-1 block font-normal">
            No logo permission — name shown as text
          </span>
        ) : null}
      </th>
      <td className="py-4 pr-4">
        {REGULATORS[row.regulator].shortName}
        <span className="text-muted mt-1 block">{row.registeredNumber}</span>
      </td>
      <td className="py-4 pr-4">
        <VerificationBadge row={row} />
      </td>
      <td className="py-4 pr-4">{row.publiclyVisible ? "Yes" : "No"}</td>
      <td className="py-4">
        <form action={verifyCharityAction}>
          <input type="hidden" name="id" value={row.id} />
          <Button type="submit" variant="secondary" size="sm">
            {row.verification === "never_verified" ? "Record a check" : "Re-check"}
            <span className="sr-only">: {row.name}</span>
          </Button>
        </form>
      </td>
    </tr>
  );
}

function VerificationBadge({ row }: { row: AdminCharityRow }) {
  if (row.verification === "never_verified") {
    return <Badge tone="clay">Never checked</Badge>;
  }

  const verifiedAt = row.verifiedAt as Date;
  const due = reverifyDueAt(verifiedAt);

  if (row.verification === "lapsed") {
    return (
      <>
        <Badge tone="clay">Re-check overdue</Badge>
        <span className="text-muted mt-1 block">
          Last checked {verifiedAt.toLocaleDateString("en-GB", dateFormat)}
          {row.verifiedByEmail ? ` by ${row.verifiedByEmail}` : ""}. Was due{" "}
          {due.toLocaleDateString("en-GB", dateFormat)}.
        </span>
      </>
    );
  }

  return (
    <>
      <Badge tone="forest">Checked</Badge>
      <span className="text-muted mt-1 block">
        {verifiedAt.toLocaleDateString("en-GB", dateFormat)}
        {row.verifiedByEmail ? ` by ${row.verifiedByEmail}` : ""}. Due again{" "}
        {due.toLocaleDateString("en-GB", dateFormat)}.
      </span>
    </>
  );
}
