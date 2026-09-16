"use client";

import { useState } from "react";

import { addDonationNoteAction } from "@/app/(public)/charities/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { DONATION_COPY } from "@/lib/charities/prompt-policy";

/**
 * "I gave something" — a private note, kept by the person for themselves.
 *
 * We never know whether a donation happened: the money goes straight to the charity. This is
 * a diary entry, not a receipt, and the copy says so rather than implying we checked.
 *
 * Closed by default. A form asking about money should not be the first thing on the page.
 */
export function NoteDonation({ charity }: { charity: { id: string; slug: string; name: string } }) {
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-card border-line mt-5 border bg-white p-6">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={open}
        aria-controls="note-donation-form"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close" : DONATION_COPY.noteLabel}
        <span className="sr-only"> for {charity.name}</span>
      </Button>

      <div id="note-donation-form" hidden={!open}>
        <p className="text-small text-ink-soft mt-5">
          If you gave to {charity.name}, you can keep a note of it here. We have no way of knowing
          whether you did — the money goes straight to the charity — so this is only ever what you
          tell us.
        </p>

        <form action={addDonationNoteAction} className="mt-6 space-y-5">
          <input type="hidden" name="charityId" value={charity.id} />
          <input type="hidden" name="slug" value={charity.slug} />

          <Field
            label="Amount, in pounds"
            hint="For example 25, or 25.50. Leave it blank if you would rather not say."
          >
            {(props) => <Input {...props} name="amount" inputMode="decimal" autoComplete="off" />}
          </Field>

          <Field label="Date you gave" required>
            {(props) => (
              <Input {...props} name="donatedOn" type="date" defaultValue={today} required />
            )}
          </Field>

          <Field
            label="Note to yourself"
            hint="Only you will ever read this. 500 characters at most."
          >
            {(props) => <Textarea {...props} name="note" maxLength={500} />}
          </Field>

          <Button type="submit" size="sm">
            Save this note
          </Button>
          <p className="text-legal text-muted">{DONATION_COPY.notePrivacy}</p>
        </form>
      </div>
    </div>
  );
}
