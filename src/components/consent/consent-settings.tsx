import Link from "next/link";

import { ConsentDetails, type ConsentChoiceView } from "@/components/consent/consent-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface ConsentSettingRow extends ConsentChoiceView {
  /** "12 September 2026", or null if they have never been asked. */
  decidedOn: string | null;
  textVersion: string | null;
  underOldWording: boolean;
}

/**
 * Every consent, with where it stands, when it was decided, and one control to change it.
 *
 * Each row is its own form with its own button, so nothing here works by accident and none
 * of it needs JavaScript. Turning core tracking off goes through a confirmation screen,
 * because it is the one change with consequences a person should read before making.
 */
export function ConsentSettings({
  rows,
  setConsentAction,
  stopTrackingHref,
}: {
  rows: ConsentSettingRow[];
  setConsentAction: (formData: FormData) => Promise<void>;
  stopTrackingHref: string;
}) {
  return (
    <div className="space-y-5">
      {rows.map((row) => (
        <Card key={row.purpose} className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-title">{row.title}</h3>
            {row.granted ? <Badge tone="forest">On</Badge> : <Badge>Off</Badge>}
            {row.required ? <Badge tone="clay">Needed for tracking</Badge> : null}
          </div>

          <p className="mt-3 text-small text-muted">
            {row.decidedOn
              ? `You decided this on ${row.decidedOn}${row.textVersion ? `, under wording version ${row.textVersion}` : ""}.`
              : "You have not answered this one yet, so it is off."}
          </p>

          {row.underOldWording ? (
            <p className="mt-2 text-small text-clay-700">
              We have changed this wording since you answered. Have a read and answer again.
            </p>
          ) : null}

          <div className="mt-4">
            <ConsentDetails choice={row} />
          </div>

          <div className="mt-5 border-t border-line pt-4">
            {row.required && row.granted ? (
              <Button asChild variant="secondary">
                <Link href={stopTrackingHref}>Turn off {row.title.toLowerCase()}</Link>
              </Button>
            ) : (
              <form action={setConsentAction}>
                <input type="hidden" name="purpose" value={row.purpose} />
                <input type="hidden" name="granted" value={row.granted ? "false" : "true"} />
                <Button type="submit" variant={row.granted ? "secondary" : "primary"}>
                  {row.granted ? "Turn off" : "Turn on"}
                  <span className="sr-only"> {row.title.toLowerCase()}</span>
                </Button>
              </form>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
