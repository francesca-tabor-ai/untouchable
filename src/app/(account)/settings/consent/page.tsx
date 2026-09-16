import type { Metadata } from "next";

import { ConsentSettings, type ConsentSettingRow } from "@/components/consent/consent-settings";
import { Callout } from "@/components/ui/callout";
import { Container } from "@/components/ui/container";
import { requireAdult } from "@/lib/auth/guards";
import {
  CONSENT_CHANGE_NOTE,
  CONSENT_COPY_BY_PURPOSE,
  CONSENT_LEGAL_REVIEW_NOTE,
  CONSENT_TEXT_VERSION,
} from "@/lib/consent/text";
import { consentDecisions } from "@/lib/profile/consent";

import { setConsentAction } from "../actions";

export const metadata: Metadata = { title: "Your choices about your data" };

const britishDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function ConsentSettingsPage() {
  const user = await requireAdult("/settings/consent");
  const decisions = await consentDecisions(user.id);

  const rows: ConsentSettingRow[] = decisions.map((decision) => {
    const copy = CONSENT_COPY_BY_PURPOSE[decision.purpose];
    return {
      ...copy,
      granted: decision.granted,
      decidedOn: decision.decidedAt ? britishDate.format(decision.decidedAt) : null,
      textVersion: decision.textVersion,
      underOldWording: decision.underOldWording,
    };
  });

  return (
    <Container reading className="py-12 sm:py-16">
      <h1 className="text-display">Your choices about your data</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Five separate decisions, each one yours to change. Nothing here is bundled together, and
        changing one never changes another.
      </p>

      <Callout tone="care" className="mt-8" title="A change happens straight away">
        <p>{CONSENT_CHANGE_NOTE}</p>
        <p className="mt-2">
          When you turn something off, the next research query, export or email has already stopped
          including you. There is no overnight job to wait for.
        </p>
      </Callout>

      <Callout tone="warm" className="mt-4" title="This wording has not been through a lawyer yet">
        <p>{CONSENT_LEGAL_REVIEW_NOTE}</p>
      </Callout>

      <div className="mt-8">
        <ConsentSettings
          rows={rows}
          setConsentAction={setConsentAction}
          stopTrackingHref="/settings/consent/stop-tracking"
        />
      </div>

      <p className="mt-8 text-legal text-muted">
        Current wording version {CONSENT_TEXT_VERSION}. Every answer you have ever given is kept with
        the date and the wording you saw, so we can always show you what you agreed to.
      </p>
    </Container>
  );
}
