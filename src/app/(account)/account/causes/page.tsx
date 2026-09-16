import type { Metadata } from "next";
import Link from "next/link";

import { DonateLink } from "@/components/charities/donate-link";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireUser } from "@/lib/auth/guards";
import { donationNotesFor } from "@/lib/charities/donation-notes";
import { followedCharities } from "@/lib/charities/follows";
import { DONATION_COPY } from "@/lib/charities/prompt-policy";

import { deleteDonationNoteAction, unfollowFromCausesAction } from "./actions";

// Always rendered per request: these pages read the database, and some of them read the
// session. Nothing here may be cached into a static page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Causes I follow",
  robots: { index: false, follow: false },
};

const dateFormat: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

export default async function CausesPage() {
  const user = await requireUser("/account/causes");
  const [causes, notes] = await Promise.all([
    followedCharities(user.id),
    donationNotesFor(user.id),
  ]);

  return (
    <Container className="py-14 sm:py-20">
      <h1 className="text-hero">Causes I follow</h1>
      <p className="text-lead text-ink-soft mt-5 max-w-[42rem]">
        The charities you have chosen to keep an eye on, and any donations you have noted down for
        yourself.
      </p>

      <Callout className="mt-8 max-w-[42rem]" title="Only you can see this page">
        <p>
          We never tell a charity who follows it, and we never share this list with anyone. What you
          follow can say something about your health, so we treat it as health information. Nothing
          on this page is used in research.
        </p>
      </Callout>

      <section aria-labelledby="following" className="mt-14">
        <h2 id="following" className="text-display">
          Following
        </h2>

        {causes.length === 0 ? (
          <p className="text-ink-soft mt-5 max-w-[42rem]">
            You are not following anything yet. You do not have to.{" "}
            <Link href="/charities" className="text-forest-600 underline underline-offset-4">
              Have a look at the charities we list
            </Link>{" "}
            if you would like to.
          </p>
        ) : (
          <ul className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-2">
            {causes.map(({ charity, followedAt }) => (
              <li
                key={charity.id}
                className="rounded-card border-line flex flex-col border bg-white p-6"
              >
                <h3 className="text-title">
                  <Link
                    href={`/charities/${charity.slug}`}
                    className="text-ink hover:text-forest-700 underline-offset-4 hover:underline"
                  >
                    {charity.name}
                  </Link>
                </h3>
                <p className="text-ink-soft mt-3">{charity.description}</p>
                <p className="text-legal text-muted mt-4">
                  Followed since {followedAt.toLocaleDateString("en-GB", dateFormat)}. Registered
                  charity {charity.registeredNumber}.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <DonateLink charity={charity} origin="causes" size="sm" showHint={false} />
                  <form action={unfollowFromCausesAction}>
                    <input type="hidden" name="charityId" value={charity.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      {DONATION_COPY.unfollowLabel}
                      <span className="sr-only">: {charity.name}</span>
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="notes" className="mt-16">
        <h2 id="notes" className="text-display">
          Donations you have noted
        </h2>
        <p className="text-ink-soft mt-3 max-w-[42rem]">
          We never handle your money, so we have no way of knowing what you gave. This is only what
          you told us, kept for you.
        </p>

        {notes.length === 0 ? (
          <p className="text-ink-soft mt-6 max-w-[42rem]">
            You have not noted any donations. You can add one from a charity&rsquo;s page if you
            want a record of it.
          </p>
        ) : (
          <ul className="mt-8 list-none space-y-4 p-0">
            {notes.map((note) => (
              <li
                key={note.id}
                className="rounded-card border-line flex flex-wrap items-start justify-between gap-4 border bg-white p-6"
              >
                <div>
                  <h3 className="text-title">{note.charity.name}</h3>
                  <p className="text-ink-soft mt-2">
                    {note.amount ? `£${note.amount}` : "Amount not recorded"} ·{" "}
                    {note.donatedOn.toLocaleDateString("en-GB", dateFormat)}
                  </p>
                  {note.note ? <p className="text-ink-soft mt-3">{note.note}</p> : null}
                </div>
                <form action={deleteDonationNoteAction}>
                  <input type="hidden" name="noteId" value={note.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    Delete this note
                    <span className="sr-only">
                      : {note.charity.name},{" "}
                      {note.donatedOn.toLocaleDateString("en-GB", dateFormat)}
                    </span>
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
