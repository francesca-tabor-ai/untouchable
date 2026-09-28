import "server-only";

import { createHash } from "node:crypto";

import type { PronunciationEntry } from "./types";
import { applyPronunciation, chunkScript } from "./voice-text";
import { VoiceUnavailable, type VoiceProvider } from "./voice";

/**
 * Voicing a lesson: pronounce, chunk, generate each chunk, keep them in order.
 *
 * **Stitching is a playlist, not a new file.** Joining audio into one file needs a
 * transcoder, which means a new dependency and `package.json` is single-writer. The player
 * plays the chunks back to back instead, which sounds the same and lets a changed paragraph
 * regenerate on its own. See DECISIONS.md LC-03.
 *
 * **The cache is keyed by what the engine hears.** The key is a hash of the chunk's voice
 * text and the voice id, so editing one paragraph regenerates the chunks it touched and
 * nothing else, and changing a pronunciation regenerates exactly the chunks that use it.
 */

export interface VoicedChunk {
  audioUrl: string;
  durationSec: number;
}

export interface AudioCache {
  get(key: string): Promise<VoicedChunk | null>;
  set(key: string, value: VoicedChunk): Promise<void>;
}

export interface VoicedLesson {
  chunks: VoicedChunk[];
  durationSec: number;
}

export interface VoiceOptions {
  provider: VoiceProvider;
  cache: AudioCache;
  voiceId: string;
  /** Characters per request. Set from the provider's documented limit. */
  maxChars?: number;
  /** Tries per chunk, counting the first. */
  maxAttempts?: number;
  pollIntervalMs?: number;
  /** Polls per attempt before the attempt is treated as failed. */
  maxPolls?: number;
  /** Injected so tests do not wait in real time. */
  wait?: (ms: number) => Promise<void>;
}

export class VoicingFailed extends Error {
  constructor(
    readonly chunkIndex: number,
    readonly reason: string,
  ) {
    super(`Chunk ${chunkIndex + 1} could not be voiced: ${reason}`);
    this.name = "VoicingFailed";
  }
}

export function audioCacheKey(voiceText: string, voiceId: string): string {
  return createHash("sha256").update(`${voiceId}\u0000${voiceText}`).digest("hex");
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function voiceOnce(text: string, options: Required<VoiceOptions>): Promise<VoicedChunk> {
  const jobId = await options.provider.submit(text, options.voiceId);
  for (let poll = 0; poll < options.maxPolls; poll++) {
    const job = await options.provider.status(jobId);
    if (job.state === "done") return { audioUrl: job.audioUrl, durationSec: job.durationSec };
    if (job.state === "failed") throw new Error(job.reason);
    await options.wait(options.pollIntervalMs);
  }
  throw new Error("timed out waiting for the provider");
}

async function voiceChunk(
  text: string,
  index: number,
  options: Required<VoiceOptions>,
): Promise<VoicedChunk> {
  const key = audioCacheKey(text, options.voiceId);
  const cached = await options.cache.get(key);
  if (cached) return cached;

  let lastReason = "no attempt was made";
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      const voiced = await voiceOnce(text, options);
      await options.cache.set(key, voiced);
      return voiced;
    } catch (error) {
      // No provider is not a transient failure. Retrying it only hides the real answer.
      if (error instanceof VoiceUnavailable) throw error;
      lastReason = error instanceof Error ? error.message : String(error);
      if (attempt < options.maxAttempts) await options.wait(options.pollIntervalMs * 2 ** attempt);
    }
  }
  throw new VoicingFailed(index, lastReason);
}

export async function voiceLesson(
  script: string,
  guide: readonly PronunciationEntry[],
  options: VoiceOptions,
): Promise<VoicedLesson> {
  const settings: Required<VoiceOptions> = {
    maxChars: 2000,
    maxAttempts: 3,
    pollIntervalMs: 2000,
    maxPolls: 90,
    wait: sleep,
    ...options,
  };

  const texts = chunkScript(applyPronunciation(script, guide), settings.maxChars);

  // One at a time, in order. A provider rate limit is easier to respect than to recover from.
  const chunks: VoicedChunk[] = [];
  for (const [index, text] of texts.entries()) {
    chunks.push(await voiceChunk(text, index, settings));
  }
  return { chunks, durationSec: chunks.reduce((total, chunk) => total + chunk.durationSec, 0) };
}
