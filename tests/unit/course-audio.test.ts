// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { audioCacheKey, voiceLesson, VoicingFailed, type AudioCache, type VoicedChunk } from "@/lib/courses/audio";
import { applyPronunciation, chunkScript } from "@/lib/courses/voice-text";
import {
  getVoiceProvider,
  voiceAvailable,
  VoiceUnavailable,
  type VoiceJob,
  type VoiceProvider,
} from "@/lib/courses/voice";
import { draftLesson, WriterUnavailable } from "@/lib/courses/writer";

/**
 * Turning a script into audio: pronunciation, chunking, generation with retry, and a cache
 * that only regenerates what changed. DECISIONS.md LC-02 and LC-03.
 */

const GUIDE = [
  { term: "cochlea", guide: "COCK-lee-uh", spoken: "cock-lee-uh" },
  { term: "cilia", guide: "SIL-ee-uh", spoken: "sil-ee-uh" },
  { term: "stereocilia", guide: "STEER-ee-oh-SIL-ee-uh", spoken: "steer-ee-oh-sil-ee-uh" },
];

describe("pronunciation", () => {
  it("replaces whole words, whatever the case, and the longest term first", () => {
    expect(applyPronunciation("The Cochlea holds stereocilia.", GUIDE)).toBe(
      "The cock-lee-uh holds steer-ee-oh-sil-ee-uh.",
    );
  });

  it("leaves words that only contain a term alone", () => {
    expect(applyPronunciation("cochlear implants", GUIDE)).toBe("cochlear implants");
  });
});

describe("chunking", () => {
  const paragraphs = ["One. Two. Three.", "Four five six seven.", "Eight nine."];
  const script = paragraphs.join("\n\n");

  it("keeps everything, in order", () => {
    for (const limit of [20, 40, 1000]) {
      const chunks = chunkScript(script, limit);
      expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(paragraphs.join(" "));
    }
  });

  it("joins at paragraph boundaries when a paragraph fits", () => {
    expect(chunkScript(script, 40)).toEqual(["One. Two. Three.\n\nFour five six seven.", "Eight nine."]);
  });

  it("splits a long paragraph between sentences, and a long sentence between words", () => {
    const long = "Alpha beta gamma delta. Epsilon zeta eta theta iota kappa lambda mu nu xi.";
    const chunks = chunkScript(long, 30);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(30);
    expect(chunks[0]).toBe("Alpha beta gamma delta.");
    expect(chunks.join(" ")).toBe(long);
  });
});

function memoryCache(): AudioCache & { store: Map<string, VoicedChunk> } {
  const store = new Map<string, VoicedChunk>();
  return {
    store,
    get: async (key) => store.get(key) ?? null,
    set: async (key, value) => void store.set(key, value),
  };
}

/** A fake provider that fails the first `failures` jobs, and is pending once before finishing. */
function fakeProvider(failures = 0) {
  const submitted: string[] = [];
  let failuresLeft = failures;
  const polls = new Map<string, number>();
  const provider: VoiceProvider = {
    listVoices: async () => [{ id: "calm", name: "Calm" }],
    submit: async (text) => {
      submitted.push(text);
      const id = `job-${submitted.length}`;
      polls.set(id, 0);
      return id;
    },
    status: async (jobId): Promise<VoiceJob> => {
      const count = (polls.get(jobId) ?? 0) + 1;
      polls.set(jobId, count);
      if (count === 1) return { state: "pending" };
      if (failuresLeft > 0) {
        failuresLeft--;
        return { state: "failed", reason: "engine busy" };
      }
      return { state: "done", audioUrl: `https://audio.example/${jobId}.mp3`, durationSec: 10 };
    },
  };
  return { provider, submitted };
}

const instant = async () => {};
const SCRIPT = "The cochlea is small.\n\nIt is coiled like a snail.";

describe("voicing a lesson", () => {
  it("sends the pronounced text, one chunk per request, and keeps the order", async () => {
    const { provider, submitted } = fakeProvider();
    const result = await voiceLesson(SCRIPT, GUIDE, {
      provider,
      cache: memoryCache(),
      voiceId: "calm",
      maxChars: 30,
      wait: instant,
    });
    expect(submitted).toEqual(["The cock-lee-uh is small.", "It is coiled like a snail."]);
    expect(result.chunks.map((c) => c.audioUrl)).toEqual([
      "https://audio.example/job-1.mp3",
      "https://audio.example/job-2.mp3",
    ]);
    expect(result.durationSec).toBe(20);
  });

  it("retries a failed job", async () => {
    const { provider, submitted } = fakeProvider(2);
    const result = await voiceLesson("Short.", [], { provider, cache: memoryCache(), voiceId: "calm", wait: instant });
    expect(submitted).toHaveLength(3);
    expect(result.chunks).toHaveLength(1);
  });

  it("gives up after the last attempt and says which chunk", async () => {
    const { provider } = fakeProvider(99);
    await expect(
      voiceLesson("Short.", [], { provider, cache: memoryCache(), voiceId: "calm", maxAttempts: 2, wait: instant }),
    ).rejects.toBeInstanceOf(VoicingFailed);
  });

  it("only regenerates the chunk that changed", async () => {
    const cache = memoryCache();
    const first = fakeProvider();
    await voiceLesson(SCRIPT, GUIDE, { provider: first.provider, cache, voiceId: "calm", maxChars: 30, wait: instant });

    const second = fakeProvider();
    const edited = SCRIPT.replace("snail", "shell");
    await voiceLesson(edited, GUIDE, { provider: second.provider, cache, voiceId: "calm", maxChars: 30, wait: instant });
    expect(second.submitted).toEqual(["It is coiled like a shell."]);
  });

  it("keys the cache on the voice as well as the words", () => {
    expect(audioCacheKey("Hello.", "calm")).not.toBe(audioCacheKey("Hello.", "bright"));
  });
});

describe("nothing leaves the system until a provider is chosen", () => {
  it("has no voice provider, and does not retry one that is missing", async () => {
    expect(voiceAvailable()).toBe(false);
    await expect(getVoiceProvider().listVoices()).rejects.toBeInstanceOf(VoiceUnavailable);
    await expect(
      voiceLesson("Short.", [], { provider: getVoiceProvider(), cache: memoryCache(), voiceId: "calm", wait: instant }),
    ).rejects.toBeInstanceOf(VoiceUnavailable);
  });

  it("has no script writer", async () => {
    await expect(
      draftLesson({
        courseTitle: "x",
        lessonTitle: "x",
        summary: "x",
        previousLessonTitle: null,
        nextLessonTitle: null,
        sources: [],
      }),
    ).rejects.toBeInstanceOf(WriterUnavailable);
  });
});
