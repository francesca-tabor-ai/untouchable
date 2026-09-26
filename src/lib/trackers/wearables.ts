/**
 * Health wearables: what can come in today, and what cannot yet.
 *
 * The brief puts wearable integrations out of scope for the MVP and into a later phase
 * (sections 4 and 11). A direct connection means a device maker sending somebody's sleep
 * and heart rate to our servers on a schedule, which needs server-side storage that does not
 * exist yet, a research-consent decision, and an agreement with each maker. None of those is
 * this branch's to make — DECISIONS.md HT-02.
 *
 * What is possible without any of that is a file the person exports from their own app and
 * opens here. It is read in the browser, turned into sleep and water records on this device,
 * and never uploaded. That is `wearable-import.ts`.
 *
 * Device makers are named because that is how people know their devices, not as a
 * recommendation. Nothing links to a shop.
 */

export type ConnectionStatus = "file" | "not-yet";

export interface WearableSource {
  key: string;
  name: string;
  /** What a file from this source can bring in today, in plain words. */
  today: string;
  /** How to get the file, in the maker's own menu names. */
  howToExport?: string;
  status: ConnectionStatus;
}

export const WEARABLE_SOURCES: readonly WearableSource[] = [
  {
    key: "apple-health",
    name: "Apple Health (iPhone and Apple Watch)",
    today: "Sleep and water, from the file the Health app exports.",
    howToExport:
      "In the Health app, tap your picture, then Export All Health Data. Unzip it and choose export.xml.",
    status: "file",
  },
  {
    key: "fitbit",
    name: "Fitbit",
    today: "Sleep, from a sleep spreadsheet (CSV) exported from your Fitbit account.",
    howToExport:
      "Export your account data from Fitbit's settings, then choose the sleep file ending in .csv.",
    status: "file",
  },
  {
    key: "spreadsheet",
    name: "Any spreadsheet",
    today:
      "Sleep or water, from a CSV file with a date column and a column for minutes asleep, hours asleep or water in ml.",
    status: "file",
  },
  {
    key: "health-connect",
    name: "Health Connect (Android)",
    today: "Not yet. Health Connect does not export a file we can read.",
    status: "not-yet",
  },
  {
    key: "garmin",
    name: "Garmin",
    today: "Not yet.",
    status: "not-yet",
  },
  {
    key: "oura",
    name: "Oura",
    today: "Not yet.",
    status: "not-yet",
  },
  {
    key: "withings",
    name: "Withings",
    today: "Not yet.",
    status: "not-yet",
  },
];

/**
 * What a direct connection would read, and what it never would, stated before any exists so
 * that the promise is on record rather than written after the fact.
 */
export const DIRECT_CONNECTION_PROMISES = {
  wouldRead: ["Time asleep", "Water you have logged", "Steps", "Resting heart rate"],
  neverRead: [
    "Your location",
    "Your contacts or messages",
    "Anything from before the day you connect, unless you choose to bring it in",
  ],
  always: [
    "You switch it on yourself, one device at a time.",
    "You can switch it off in one tap, and what it brought in goes with it if you ask.",
    "Nothing it brings in is used for research unless you have said yes to research.",
  ],
} as const;
