import type { Metadata } from "next";

import { WelcomeForm } from "@/components/onboarding/welcome-form";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import { getProfile, latestYearOfBirth, REGIONS, SEX_OPTIONS } from "@/lib/profile";

import { saveProfileAction } from "../actions";

export const metadata: Metadata = { title: "Your details" };

export default async function ProfileSettingsPage() {
  const user = await requireAdult("/settings/profile");
  const profile = await getProfile(user.id);

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Your details</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Only the name is needed. Everything else is optional and you can clear it at any time.
      </p>

      <div className="mt-8">
        <WelcomeForm
          action={saveProfileAction}
          regions={REGIONS}
          sexOptions={SEX_OPTIONS}
          latestYearOfBirth={latestYearOfBirth()}
          submitLabel="Save my details"
          initial={{
            displayName: profile?.displayName ?? "",
            yearOfBirth: profile?.yearOfBirth ?? null,
            sex: profile?.sex ?? null,
            region: profile?.region ?? null,
          }}
        />
      </div>
    </Container>
  );
}
