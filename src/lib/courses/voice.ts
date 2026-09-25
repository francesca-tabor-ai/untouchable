import "server-only";

/**
 * Text to speech.
 *
 * Pluggable, in the shape `src/lib/email/` and `src/lib/food/vision.ts` already use: an
 * interface, a provider that declines, and call sites that never learn which is which.
 *
 * **No provider is wired up.** The spec names Higgsfield. Switching it on is not a code
 * change a feature branch gets to make, for three reasons recorded in DECISIONS.md LC-02:
 * it is a new sub-processor, which needs a data processing agreement and a line in the
 * privacy notice; its key has to be provisioned server-side by the platform lead; and whether
 * its terms suit a health platform at all has not been checked. Until then
 * `VoiceUnavailableProvider` declines and the lesson page offers the script to read.
 *
 * What a real provider receives is deliberately boring: a chunk of a general biology lesson
 * and a voice id. No user id, no symptom, nothing a listener typed. Scripts are not about
 * anybody, so this is the one place audio generation could be switched on without sending
 * health data to a third party. Keep it that way.
 *
 * `server-only` so the key a real provider reads can never be bundled into the browser.
 */

export interface Voice {
  id: string;
  name: string;
}

export type VoiceJob =
  | { state: "pending" }
  | { state: "done"; audioUrl: string; durationSec: number }
  | { state: "failed"; reason: string };

export interface VoiceProvider {
  listVoices(): Promise<Voice[]>;
  /** Starts generation and returns the provider's job id. */
  submit(text: string, voiceId: string): Promise<string>;
  status(jobId: string): Promise<VoiceJob>;
}

export class VoiceUnavailable extends Error {
  constructor() {
    super("No voice provider is configured.");
    this.name = "VoiceUnavailable";
  }
}

/** Declines rather than returning silence, which would look like a lesson with nothing in it. */
class VoiceUnavailableProvider implements VoiceProvider {
  async listVoices(): Promise<Voice[]> {
    throw new VoiceUnavailable();
  }
  async submit(): Promise<string> {
    throw new VoiceUnavailable();
  }
  async status(): Promise<VoiceJob> {
    throw new VoiceUnavailable();
  }
}

let provider: VoiceProvider = new VoiceUnavailableProvider();

/** Swap the provider — used by tests, and by a real provider at boot. */
export function setVoiceProvider(next: VoiceProvider) {
  provider = next;
}

export function getVoiceProvider(): VoiceProvider {
  return provider;
}

export function voiceAvailable(): boolean {
  return !(provider instanceof VoiceUnavailableProvider);
}
