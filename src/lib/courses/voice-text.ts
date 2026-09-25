/**
 * Turning a written script into what the voice engine is sent.
 *
 * Two steps, both pure so they can be tested without a provider:
 *
 * 1. **Pronunciation.** Tricky words are swapped for their phonetic spelling. The written
 *    companion keeps the real word; only the engine hears "cock-lee-uh".
 * 2. **Chunking.** Long scripts are split at paragraph boundaries to fit a provider's length
 *    limit. A paragraph too long on its own is split between sentences, and only a sentence
 *    too long on its own is split between words. Never mid-word, and order is kept, because
 *    the chunks are played back one after another.
 */

import { paragraphsOf } from "./script-rules";
import type { PronunciationEntry } from "./types";

function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The script with every guided term replaced by what the engine should say. */
export function applyPronunciation(script: string, guide: readonly PronunciationEntry[]): string {
  // Longest term first, so "stereocilia" is not half-replaced by a guide entry for "cilia".
  const ordered = [...guide].sort((a, b) => b.term.length - a.term.length);
  return ordered.reduce(
    (text, entry) =>
      text.replace(new RegExp(`\\b${escapeForRegExp(entry.term)}\\b`, "gi"), entry.spoken),
    script,
  );
}

function splitLong(text: string, maxChars: number, pieces: RegExp): string[] {
  const parts = text.match(pieces) ?? [text];
  const out: string[] = [];
  let current = "";
  for (const raw of parts) {
    const part = raw.trim();
    if (!part) continue;
    const joined = current ? `${current} ${part}` : part;
    if (joined.length <= maxChars) {
      current = joined;
    } else {
      if (current) out.push(current);
      current = part;
    }
  }
  if (current) out.push(current);
  return out;
}

function fitParagraph(paragraph: string, maxChars: number): string[] {
  if (paragraph.length <= maxChars) return [paragraph];
  return splitLong(paragraph, maxChars, /[^.!?]+[.!?]*/g).flatMap((sentence) =>
    sentence.length <= maxChars ? [sentence] : splitLong(sentence, maxChars, /\S+/g),
  );
}

/** The script in order, in pieces no longer than `maxChars`, joined at the largest boundary that fits. */
export function chunkScript(script: string, maxChars: number): string[] {
  if (maxChars < 20) throw new Error("A chunk limit that small would split words.");
  const chunks: string[] = [];
  let current = "";
  for (const piece of paragraphsOf(script).flatMap((p) => fitParagraph(p, maxChars))) {
    const joined = current ? `${current}\n\n${piece}` : piece;
    if (joined.length <= maxChars) {
      current = joined;
    } else {
      if (current) chunks.push(current);
      current = piece;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
