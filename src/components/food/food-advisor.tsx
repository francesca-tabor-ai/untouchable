"use client";

import * as Tabs from "@radix-ui/react-tabs";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { cn } from "@/lib/cn";
import { allergenLabel } from "@/lib/food/allergens";
import {
  interactionsFor,
  nothingHeldNotice,
  PHARMACIST_NOTE,
} from "@/lib/food/interactions";
import { type ConditionProfile } from "@/lib/food/profile";
import { scopeCreepNote } from "@/lib/food/scope-creep";
import { NOT_A_DIETITIAN, SOURCES } from "@/lib/food/sources";
import {
  deleteProfile,
  exportProfile,
  profileSnapshot,
  recordScopeNoteSaid,
  saveProfile,
  scopeNoteSaidOn,
  serverProfileSnapshot,
  subscribeToProfile,
} from "@/lib/food/storage";
import { NO_SUBSTITUTION_HELD, substitutionsForAny } from "@/lib/food/substitutions";

import { MenuScan } from "./menu-scan";
import { ProfileForm } from "./profile-form";

/**
 * The Food Advisor shell.
 *
 * The profile is held on this device and nowhere else — see `storage.ts` for why — so this
 * is a client component with no server state behind it. The page it sits on still runs
 * `requireAdult` server-side, because a client component is not a permission check.
 */

const TAB_TRIGGER =
  "rounded-pill px-4 py-2 text-small font-medium text-forest-700 hover:bg-forest-50 data-[state=active]:bg-forest-800 data-[state=active]:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-600";

export function FoodAdvisor() {
  /**
   * The profile is read straight out of local storage rather than mirrored into component
   * state, so there is one copy of it and no effect racing the first paint. On the server
   * and during hydration the snapshot is the empty profile; the stored one arrives on the
   * first client render after that.
   */
  const profile = React.useSyncExternalStore(
    subscribeToProfile,
    profileSnapshot,
    serverProfileSnapshot,
  );
  const [scopeNote, setScopeNote] = React.useState<string | null>(null);

  const update = (next: ConditionProfile) => {
    saveProfile(next);

    /**
     * Said once, and then never again. A tool that raises this every time somebody opens it
     * is nagging them about their eating, which is the harm rather than the remedy.
     */
    const note = scopeCreepNote({ profile: next, saidOn: scopeNoteSaidOn() });
    if (note) {
      setScopeNote(note);
      recordScopeNoteSaid(new Date().toISOString().slice(0, 10));
    }
  };

  const lookup = interactionsFor(profile.medications.map((item) => item.name));
  const avoiding = profile.allergies.map((allergy) => allergy.allergenKey);
  const substitutions = substitutionsForAny(avoiding);

  return (
    <div className="space-y-8">
      {scopeNote ? (
        <Callout tone="care" title="Worth mentioning once">
          <p>{scopeNote}</p>
        </Callout>
      ) : null}

      <Tabs.Root defaultValue="profile">
        <Tabs.List
          aria-label="Food Advisor"
          className="flex flex-wrap gap-2 rounded-pill bg-cream-100 p-1"
        >
          <Tabs.Trigger value="profile" className={TAB_TRIGGER}>
            What you avoid
          </Tabs.Trigger>
          <Tabs.Trigger value="menu" className={TAB_TRIGGER}>
            Eating out
          </Tabs.Trigger>
          <Tabs.Trigger value="kitchen" className={TAB_TRIGGER}>
            Cooking
          </Tabs.Trigger>
          <Tabs.Trigger value="medicines" className={TAB_TRIGGER}>
            Medicines
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="profile" className="mt-8 focus-visible:outline-none">
          <ProfileForm profile={profile} onChange={update} />
          <DataRights profile={profile} />
        </Tabs.Content>

        <Tabs.Content value="menu" className="mt-8 focus-visible:outline-none">
          {profile.allergies.length === 0 && profile.neverList.length === 0 ? (
            <Callout tone="neutral" title="Tell it what you avoid first">
              <p>
                Without that, a menu is just a menu. Add an allergy or something you never eat on
                the first tab and come back.
              </p>
            </Callout>
          ) : (
            <MenuScan profile={profile} />
          )}
        </Tabs.Content>

        <Tabs.Content value="kitchen" className="mt-8 focus-visible:outline-none">
          <h2 className="text-title">Cooking around it</h2>
          <p className="mt-1 text-small text-muted">
            Swaps chosen for what the ingredient was doing in the dish, not for what shelf it came
            from. Each one says what it costs, because a sauce that splits at the table is worse
            than knowing in advance.
          </p>

          {substitutions.length === 0 ? (
            <p className="mt-6 text-body text-ink-soft">{NO_SUBSTITUTION_HELD}</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {substitutions.map((entry) => (
                <li
                  key={`${entry.forKey}-${entry.replacing}`}
                  className="rounded-card border border-line bg-white p-5"
                >
                  <h3 className="text-body font-semibold text-ink">
                    {entry.replacing} — {entry.job}
                  </h3>
                  <p className="mt-2 text-small text-ink-soft">{entry.use}</p>
                  <p className="mt-2 text-small text-clay-700">
                    <span className="font-medium">What it costs: </span>
                    {entry.cost}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Tabs.Content>

        <Tabs.Content value="medicines" className="mt-8 focus-visible:outline-none">
          <h2 className="text-title">Food and your medicines</h2>
          <p className="mt-1 text-small text-muted">
            Looked up in a table, never worked out. Where a medicine is not in the table it says so
            rather than going quiet.
          </p>

          {profile.medications.length === 0 ? (
            <p className="mt-6 text-body text-ink-soft">
              Nothing to look up. Add what you take on the first tab.
            </p>
          ) : (
            <div className="mt-6 space-y-5">
              {lookup.found.map((entry, index) => (
                <div
                  key={`${entry.drug}-${index}`}
                  className="rounded-card border-2 border-forest-800 bg-white p-5"
                >
                  <h3 className="text-body font-semibold text-ink">
                    {entry.drug} and {entry.food.toLowerCase()}
                  </h3>
                  <p className="mt-2 text-small text-ink-soft">{entry.whatHappens}</p>
                  <p className="mt-2 text-legal text-muted">Source: {entry.source}</p>
                </div>
              ))}

              {lookup.nothingHeldFor.length > 0 ? (
                <Callout tone="neutral" title="Not in the table">
                  <p>{nothingHeldNotice(lookup.nothingHeldFor)}</p>
                </Callout>
              ) : null}

              <Callout tone="care" title="Ask a pharmacist">
                <p>{PHARMACIST_NOTE}</p>
              </Callout>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>

      <section aria-labelledby="sources-heading" className="border-t border-line pt-8">
        <h2 id="sources-heading" className="text-title">
          Where this comes from
        </h2>
        <p className="mt-1 text-small text-muted">{NOT_A_DIETITIAN}</p>
        <ul className="mt-4 space-y-2 text-small text-ink-soft">
          {SOURCES.map((entry) => (
            <li key={entry.key}>
              <a
                href={entry.url}
                className="underline underline-offset-2 hover:text-forest-800"
                rel="noreferrer"
              >
                {entry.body}
              </a>{" "}
              — {entry.covers}
            </li>
          ))}
        </ul>
        {avoiding.length > 0 ? (
          <p className="mt-4 text-legal text-muted">
            Held on this device: {avoiding.map(allergenLabel).join(", ")}.
          </p>
        ) : null}
      </section>
    </div>
  );
}

/** One tap to take a copy, one tap to delete the lot. Both complete. */
function DataRights({ profile }: { profile: ConditionProfile }) {
  const [confirming, setConfirming] = React.useState(false);

  const download = () => {
    const blob = new Blob([exportProfile(profile)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "food-profile.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn("mt-12 border-t border-line pt-8")}>
      <h2 className="text-title">This is kept on this device</h2>
      <p className="mt-1 text-small text-ink-soft">
        Your allergies and medicines are not sent to us and are not on your account. That means
        clearing this browser clears them, and they will not be on your phone. Nothing you
        photograph is kept at all.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button variant="secondary" size="sm" onClick={download}>
          Download a copy
        </Button>
        {confirming ? (
          <Button
            variant="dark"
            size="sm"
            onClick={() => {
              deleteProfile();
              setConfirming(false);
            }}
          >
            Yes, delete all of it
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
            Delete all of it
          </Button>
        )}
      </div>
    </div>
  );
}
