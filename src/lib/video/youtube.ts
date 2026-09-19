/**
 * Turning a source URL into a video we are willing to show — and refusing everything else.
 *
 * Most of our sources are interviews on YouTube of the person speaking for themselves, which
 * is the best evidence a story can have. Embedding one the ordinary way would be a privacy
 * failure: a standard YouTube embed contacts Google and sets cookies the moment the page
 * loads, on a page about a named person's diagnosis, which tells Google who is reading about
 * what. So nothing here produces a `youtube.com` address at all. The only address this module
 * will build is `youtube-nocookie.com`, and it is only ever loaded after somebody presses
 * play — see `src/components/video/youtube-facade.tsx`.
 *
 * This file is deliberately strict. A URL we cannot confidently identify as a YouTube video
 * is not "probably fine": it is rejected, and the story renders with no video. A permissive
 * parser here would end up putting an arbitrary third-party origin in an iframe on a health
 * page.
 */

/** YouTube video ids are eleven characters of URL-safe base64. Anything else is not one. */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Hosts we accept, after a leading `www.`, `m.` or `music.` is removed. Matched whole, never
 * with `includes` or `endsWith` — `youtube.com.example.test` is somebody else's domain.
 */
const HOSTS = new Set(["youtube.com", "youtube-nocookie.com"]);

/** Path prefixes that carry the id in the next segment: /embed/<id>, /v/<id>, and so on. */
const ID_IN_PATH = new Set(["embed", "v", "shorts", "live"]);

export interface YouTubeVideo {
  id: string;
  /** Seconds from the start, when the source URL asked to begin part-way in. */
  startSeconds: number | null;
}

/**
 * A YouTube video, or null.
 *
 * Accepts the forms editors actually paste: `watch?v=`, `youtu.be/`, `embed/`, with or
 * without `t=` or `start=`. Rejects everything else, including other people's domains that
 * merely contain the word youtube.
 */
export function parseYouTubeUrl(raw: string | null | undefined): YouTubeVideo | null {
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  // Only the two web protocols. `javascript:`, `data:` and friends are not sources.
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const host = url.hostname.toLowerCase().replace(/^(?:www|m|music)\./, "");
  const segments = url.pathname.split("/").filter(Boolean);

  let id: string | null = null;

  if (host === "youtu.be") {
    // The share link: youtu.be/<id>
    id = segments[0] ?? null;
  } else if (HOSTS.has(host)) {
    if (segments[0] === "watch") {
      id = url.searchParams.get("v");
    } else if (segments.length >= 2 && ID_IN_PATH.has(segments[0]!)) {
      id = segments[1]!;
    }
  }

  if (!id || !VIDEO_ID.test(id)) return null;

  return { id, startSeconds: parseStartSeconds(url) };
}

/**
 * The timestamp on a share link. YouTube writes it as `t` on a watch or share link and as
 * `start` on an embed, and `t` may be plain seconds (`444`), seconds with a suffix (`444s`)
 * or a duration (`1h2m3s`).
 */
function parseStartSeconds(url: URL): number | null {
  const raw = url.searchParams.get("start") ?? url.searchParams.get("t");
  if (!raw) return null;

  const value = raw.trim().toLowerCase();

  if (/^\d+$/.test(value)) return positive(Number(value));

  const parts = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
  if (!parts || (!parts[1] && !parts[2] && !parts[3])) return null;

  const seconds =
    Number(parts[1] ?? 0) * 3600 + Number(parts[2] ?? 0) * 60 + Number(parts[3] ?? 0);
  return positive(seconds);
}

function positive(seconds: number): number | null {
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return Math.floor(seconds);
}

/**
 * The only address this codebase ever builds for a video.
 *
 * `youtube-nocookie.com` is Google's own privacy-enhanced host: it does not write the
 * tracking cookies the ordinary player does. It is still a third-party request, which is why
 * it is never made until somebody presses play.
 */
export function youTubeEmbedUrl(video: YouTubeVideo): string {
  const url = new URL(`https://www.youtube-nocookie.com/embed/${video.id}`);
  // Keep suggestions to the same channel at the end rather than showing whatever Google
  // would like this reader to watch next on a page about someone's illness.
  url.searchParams.set("rel", "0");
  if (video.startSeconds !== null) url.searchParams.set("start", String(video.startSeconds));
  return url.toString();
}
