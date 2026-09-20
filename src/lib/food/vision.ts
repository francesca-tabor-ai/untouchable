/**
 * Reading a photograph of a menu, a packet or a fridge.
 *
 * Pluggable, in the shape `src/lib/email/` already established: an interface, a provider
 * that does nothing in development, and call sites that never learn which is which.
 *
 * **No provider is wired up.** Every vision-capable model in reach would mean a new runtime
 * dependency, and `package.json` is a single-writer file (AGENTS.md section 3). So the seam
 * is here and the implementation behind it is a platform-lead decision, not something to be
 * smuggled in by a feature branch. Until then `PhotoUnavailableProvider` declines, and the
 * screen offers typing the menu out instead, which produces exactly the same analysis.
 *
 * Two rules bind whatever gets plugged in here, and both are enforced by the shape of
 * `MenuRead` rather than by asking a provider to behave:
 *
 * **Legibility is reported, never papered over.** `unreadableSections` is a required field.
 * A provider that cannot read the specials board says so and the screen asks for another
 * photograph of that part. Guessing a dish's contents from its name when the description
 * was unreadable is the single most dangerous thing a tool like this can do, so a dish read
 * without its description comes back with `description: undefined` and lands in
 * "not enough information" — not in a bucket built from its name.
 *
 * **The image does not persist.** Photographs of menus and fridges are location and
 * lifestyle data about a person whose health data we already hold. EXIF is stripped before
 * the bytes leave the device, nothing is written to disk, and the buffer is not retained
 * after the call returns.
 */

export interface MenuRead {
  dishes: { name: string; description?: string }[];
  /** Named specifically — "the specials board", "the dessert section" — never a count. */
  unreadableSections: string[];
}

export interface PantryRead {
  /** Only what is actually visible. Never what a fridge usually contains. */
  items: { name: string; dateText?: string; note?: string }[];
  /** A jar turned away, or a label out of focus. Asked about rather than assumed. */
  unidentified: string[];
  /** Storage problems visible in the frame — raw meat above ready-to-eat food, open tins. */
  storageNotes: string[];
}

export interface FoodVisionProvider {
  readMenu(image: Uint8Array): Promise<MenuRead>;
  readPantry(image: Uint8Array): Promise<PantryRead>;
}

export class PhotoReadUnavailable extends Error {
  constructor() {
    super("No photo reader is configured.");
    this.name = "PhotoReadUnavailable";
  }
}

/**
 * The default. Declines rather than returning an empty read, because an empty read is
 * indistinguishable from a menu with nothing on it worth flagging.
 */
class PhotoUnavailableProvider implements FoodVisionProvider {
  async readMenu(): Promise<MenuRead> {
    throw new PhotoReadUnavailable();
  }
  async readPantry(): Promise<PantryRead> {
    throw new PhotoReadUnavailable();
  }
}

let provider: FoodVisionProvider = new PhotoUnavailableProvider();

/** Swap the provider — used by tests, and by a real provider at boot. */
export function setFoodVisionProvider(next: FoodVisionProvider) {
  provider = next;
}

export function getFoodVisionProvider(): FoodVisionProvider {
  return provider;
}

export function photoReadingAvailable(): boolean {
  return !(provider instanceof PhotoUnavailableProvider);
}

export const PHOTO_UNAVAILABLE_NOTICE =
  "Reading a photograph is not switched on yet. Typing the menu out, or pasting it in, gives you the same questions to ask — it is the words that do the work, not the picture.";

/** What the screen says when part of a photograph could not be read. */
export function unreadableNotice(sections: readonly string[]): string {
  if (sections.length === 0) return "";
  return `We could not read ${sections.join(", ")}. Rather than guess at what is in those from the names, they have been left out. Another photograph of just that part would let us look at it.`;
}
