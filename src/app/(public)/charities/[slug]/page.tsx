import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CharityIdentity } from "@/components/charities/charity-identity";
import { DonateLink } from "@/components/charities/donate-link";
import { FollowCharity } from "@/components/charities/follow-charity";
import { NoteDonation } from "@/components/charities/note-donation";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { getCurrentUser } from "@/lib/auth/guards";
import { isFollowing } from "@/lib/charities/follows";
import { logoSuppressionReason } from "@/lib/charities/logo";
import { getPublicCharity } from "@/lib/charities/queries";
import { REGULATORS } from "@/lib/charities/regulators";

// Always rendered per request: these pages read the database, and some of them read the
// session. Nothing here may be cached into a static page.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const charity = await getPublicCharity(slug);
  if (!charity) return { title: "Charity not found" };

  return {
    title: charity.name,
    description: charity.description.slice(0, 200),
  };
}

export default async function CharityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Unverified and withdrawn listings are filtered out in the query, so this is a 404 for
  // exactly the same reason a made-up slug is: there is no public page here.
  const charity = await getPublicCharity(slug);
  if (!charity) notFound();

  const regulator = REGULATORS[charity.regulator];
  const user = await getCurrentUser();
  const following = user ? await isFollowing(user.id, charity.id) : false;

  return (
    <Container className="py-14 sm:py-20">
      <p className="text-small">
        <Link href="/charities" className="text-forest-600 underline underline-offset-4">
          All charities
        </Link>
      </p>

      <h1 className="text-hero mt-6">
        <CharityIdentity charity={charity} />
      </h1>

      {logoSuppressionReason(charity) === null ? (
        <p className="text-small text-muted mt-3">{charity.name}</p>
      ) : null}

      <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <h2 className="sr-only">About this charity</h2>
          <p className="text-lead text-ink-soft">{charity.description}</p>
          <p className="text-legal text-muted mt-4">
            We write these descriptions ourselves. They are not the charity&rsquo;s own words and
            the charity does not approve them.
          </p>

          <h2 className="text-display mt-12">Who they are on the register</h2>
          <dl className="mt-6 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-small text-ink font-semibold">Registered name</dt>
              <dd className="text-ink-soft mt-1">{charity.name}</dd>
            </div>
            <div>
              <dt className="text-small text-ink font-semibold">Registered charity number</dt>
              <dd className="text-ink-soft mt-1">{charity.registeredNumber}</dd>
            </div>
            <div>
              <dt className="text-small text-ink font-semibold">Regulator</dt>
              <dd className="text-ink-soft mt-1">
                {regulator.name} ({regulator.nations})
              </dd>
            </div>
            <div>
              <dt className="text-small text-ink font-semibold">Checked by an editor</dt>
              <dd className="text-ink-soft mt-1">
                {charity.verifiedAt
                  ? charity.verifiedAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "Not yet checked"}
              </dd>
            </div>
          </dl>
          <p className="text-small mt-6">
            <a
              href={regulator.registerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest-600 underline underline-offset-4"
            >
              Look this charity up on the {regulator.shortName} register
            </a>{" "}
            <span className="text-muted">(opens in a new tab)</span>
          </p>
          <p className="text-small mt-3">
            <a
              href={charity.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-forest-600 underline underline-offset-4"
            >
              The charity&rsquo;s own website
            </a>{" "}
            <span className="text-muted">(opens in a new tab)</span>
          </p>

          {charity.conditions.length > 0 ? (
            <>
              <h2 className="text-display mt-12">Conditions they work on</h2>
              <ul className="mt-5 flex list-none flex-wrap gap-2 p-0">
                {charity.conditions.map(({ condition }) => (
                  <li key={condition.id}>
                    <Link
                      href={`/charities?condition=${condition.slug}`}
                      className="rounded-pill border-line text-small text-ink-soft hover:border-line-strong hover:text-forest-700 inline-flex min-h-11 items-center border bg-white px-4"
                    >
                      {condition.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {user ? (
            <>
              <h2 className="text-display mt-12">Your own record</h2>
              <NoteDonation charity={charity} />
            </>
          ) : null}
        </div>

        <aside aria-labelledby="giving" className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-card border-line border bg-white p-6">
            <h2 id="giving" className="text-title">
              Give to {charity.name}
            </h2>
            <div className="mt-5">
              <DonateLink charity={charity} origin="charity" block />
            </div>

            <div className="border-line mt-6 border-t pt-6">
              <FollowCharity charity={charity} signedIn={user !== null} following={following} />
            </div>
          </div>

          <Callout className="mt-6" title="How giving works here">
            <p>
              We hand you over to the charity&rsquo;s own donation page. UnTouchable never takes or
              holds payment, and takes nothing from what you give. Gift Aid is handled by the
              charity.
            </p>
            <p className="mt-2">
              Giving is optional. Nothing about your account changes whether you give or not.
            </p>
          </Callout>
        </aside>
      </div>
    </Container>
  );
}
