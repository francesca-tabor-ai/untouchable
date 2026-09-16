import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CharityForm } from "@/components/charities/charity-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import { getCharityForAdmin, listConditionsForTagging } from "@/lib/charities/admin";
import { logoSuppressionReason } from "@/lib/charities/logo";
import { REGULATORS } from "@/lib/charities/regulators";
import { REVERIFY_AFTER_MONTHS, reverifyDueAt } from "@/lib/charities/verification";

import { setCharityActiveAction, updateCharityAction, verifyCharityAction } from "../actions";

// Always rendered per request: these pages read the database, and some of them read the
// session. Nothing here may be cached into a static page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit charity listing",
  robots: { index: false, follow: false },
};

const dateFormat: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

export default async function EditCharityPage({ params }: { params: Promise<{ id: string }> }) {
  await requireEditor();
  const { id } = await params;
  const charity = await getCharityForAdmin(id);
  if (!charity) notFound();

  const regulator = REGULATORS[charity.regulator];
  const conditions = await listConditionsForTagging();
  const logoNote = logoSuppressionReason(charity);

  return (
    <Container className="py-12">
      <p className="text-small">
        <Link href="/admin/charities" className="text-forest-600 underline underline-offset-4">
          Charity listings
        </Link>
      </p>
      <h1 className="text-display mt-6">{charity.name}</h1>

      <section aria-labelledby="verification" className="mt-8 max-w-[42rem]">
        <h2 id="verification" className="text-title">
          Checked against the register
        </h2>

        <p className="mt-3">
          {charity.verification === "never_verified" ? (
            <Badge tone="clay">Never checked</Badge>
          ) : charity.verification === "lapsed" ? (
            <Badge tone="clay">Re-check overdue</Badge>
          ) : (
            <Badge tone="forest">Checked</Badge>
          )}
        </p>

        <p className="text-ink-soft mt-4">
          {charity.verifiedAt ? (
            <>
              Last checked {charity.verifiedAt.toLocaleDateString("en-GB", dateFormat)}
              {charity.verifiedByEmail ? ` by ${charity.verifiedByEmail}` : ""}. Due again{" "}
              {reverifyDueAt(charity.verifiedAt).toLocaleDateString("en-GB", dateFormat)} — listings
              are re-checked every {REVERIFY_AFTER_MONTHS} months.
            </>
          ) : (
            <>
              Nobody has checked this listing against the {regulator.name} register, so the public
              cannot see it.
            </>
          )}
        </p>

        <p className="text-small mt-4">
          <a
            href={regulator.registerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-forest-600 underline underline-offset-4"
          >
            Open the {regulator.shortName} register
          </a>{" "}
          <span className="text-muted">(opens in a new tab)</span>
        </p>

        <form action={verifyCharityAction} className="mt-5">
          <input type="hidden" name="id" value={charity.id} />
          <Button type="submit" size="sm">
            I have checked this against the register
          </Button>
          <p className="text-legal text-muted mt-3">
            This records your name and today&rsquo;s date against the listing. Only do it if you
            have actually looked.
          </p>
        </form>

        <form action={setCharityActiveAction} className="mt-6">
          <input type="hidden" name="id" value={charity.id} />
          <input type="hidden" name="active" value={charity.active ? "false" : "true"} />
          <Button type="submit" variant="secondary" size="sm">
            {charity.active ? "Take this listing off the public site" : "Put this listing back"}
          </Button>
        </form>
      </section>

      {logoNote ? (
        <Callout className="mt-8 max-w-[42rem]" title="Logo">
          <p>{logoNote}</p>
        </Callout>
      ) : null}

      <h2 className="text-title mt-12">Listing details</h2>
      <CharityForm
        action={updateCharityAction}
        conditions={conditions}
        submitLabel="Save listing"
        values={{
          id: charity.id,
          name: charity.name,
          slug: charity.slug,
          registeredNumber: charity.registeredNumber,
          regulator: charity.regulator,
          websiteUrl: charity.websiteUrl,
          donationUrl: charity.donationUrl,
          description: charity.description,
          logoUrl: charity.logoUrl ?? "",
          logoPermission: charity.logoPermission,
          active: charity.active,
          conditionIds: charity.conditions.map((condition) => condition.id),
        }}
      />
    </Container>
  );
}
