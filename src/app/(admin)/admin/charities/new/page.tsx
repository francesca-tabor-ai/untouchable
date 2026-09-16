import type { Metadata } from "next";
import Link from "next/link";

import { CharityForm } from "@/components/charities/charity-form";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireEditor } from "@/lib/auth/guards";
import { listConditionsForTagging } from "@/lib/charities/admin";

import { createCharityAction } from "../actions";

// Always rendered per request: these pages read the database, and some of them read the
// session. Nothing here may be cached into a static page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add a charity",
  robots: { index: false, follow: false },
};

export default async function NewCharityPage() {
  await requireEditor();
  const conditions = await listConditionsForTagging();

  return (
    <Container className="py-12">
      <p className="text-small">
        <Link href="/admin/charities" className="text-forest-600 underline underline-offset-4">
          Charity listings
        </Link>
      </p>
      <h1 className="text-display mt-6">Add a charity</h1>

      <Callout className="mt-6 max-w-[42rem]" title="Before you save">
        <p>
          Have the official register open. The name, number and regulator must match it exactly.
          Write the description in our own words — do not paste the charity&rsquo;s own copy, and do
          not make any claim about what a treatment or a service achieves.
        </p>
        <p className="mt-2">
          A new listing is not public. Once you have checked it against the register, record that
          check from the listing&rsquo;s page and it goes live.
        </p>
      </Callout>

      <CharityForm
        action={createCharityAction}
        conditions={conditions}
        submitLabel="Create listing"
        values={{
          name: "",
          slug: "",
          registeredNumber: "",
          regulator: "CCEW",
          websiteUrl: "",
          donationUrl: "",
          description: "",
          logoUrl: "",
          logoPermission: false,
          active: true,
          conditionIds: [],
        }}
      />
    </Container>
  );
}
