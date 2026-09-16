"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CheckboxRow } from "@/components/ui/checkbox";
import { FormError } from "@/components/onboarding/form-error";
import { Button } from "@/components/ui/button";

/**
 * The 18-or-over gate for an account that does not have one recorded.
 *
 * Everyone who signs up here confirms this at sign-up, so this is the path for an account
 * created some other way. Nothing about tracking opens until it is answered: `requireAdult`
 * sends people here, and it is the only screen inside the account area that does not need
 * the confirmation to have been made.
 *
 * The session is refreshed after the answer is saved, so the new state takes effect without
 * making somebody sign in again.
 */
export function AgeConfirmation({ action }: { action: () => Promise<void> }) {
  return (
    <SessionProvider>
      <AgeConfirmationForm action={action} />
    </SessionProvider>
  );
}

function AgeConfirmationForm({ action }: { action: () => Promise<void> }) {
  const { update } = useSession();
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (!confirmed) {
          setError("UnTouchable is only for adults, so we need you to confirm you are 18 or over.");
          return;
        }
        setError(null);
        startTransition(async () => {
          await action();
          await update();
          router.refresh();
        });
      }}
    >
      <FormError message={error} />

      <CheckboxRow
        name="ageConfirmed"
        label="I am 18 or over."
        description="We hold no health information at all about under-18s. We do not ask for your date of birth."
        checked={confirmed}
        onCheckedChange={(next) => {
          setConfirmed(next);
          if (next) setError(null);
        }}
      />

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : "Confirm and carry on"}
      </Button>
    </form>
  );
}
