"use client";

import { Play } from "lucide-react";
import * as React from "react";

import type { StoryVideo } from "@/lib/video";

/**
 * A video that loads nothing from Google until somebody presses play.
 *
 * The ordinary way to put a YouTube video on a page is an iframe. That iframe contacts
 * Google as soon as the page loads, before the reader has done anything and whether or not
 * they ever watch. On this platform the page is about a named person's diagnosis, so the
 * request itself is the disclosure: it tells a third party that this browser is reading
 * about that illness. AGENTS.md rule 11 forbids third-party tracking on authenticated
 * pages, and the brief allows only cookieless analytics on public ones.
 *
 * So what renders first is ours: our own card, in our own type, on our own colours, with a
 * real `<button>`. There is no iframe, no script, no image and no link element pointing at
 * any Google domain in the markup at all.
 *
 * **Not YouTube's thumbnail.** `img.youtube.com` and `i.ytimg.com` serve the poster frames,
 * and hot-linking one would make exactly the request this component exists to prevent — the
 * facade would look private while leaking on load. Hence a typographic card instead of a
 * still.
 *
 * Only on click does an iframe appear, pointed at `youtube-nocookie.com`, which is Google's
 * own host that does not set the tracking cookies the standard player does. The reader has
 * chosen that by then, and the line under the button says so before they choose.
 */
export function YouTubeFacade({
  video,
  personName,
  className,
}: {
  video: StoryVideo;
  /** Whose video this is, so the button says who it plays. */
  personName?: string | null;
  className?: string;
}) {
  const [playing, setPlaying] = React.useState(false);
  const frameRef = React.useRef<HTMLIFrameElement>(null);

  // The button the person pressed is gone once the player is in. Without this, focus falls
  // back to the top of the document and a keyboard user has to find their place again.
  React.useEffect(() => {
    if (playing) frameRef.current?.focus();
  }, [playing]);

  const label = personName
    ? `Play the video of ${personName}: ${video.title}, ${video.publisher}. Plays from YouTube.`
    : `Play the video: ${video.title}, ${video.publisher}. Plays from YouTube.`;

  return (
    <div className={className} data-testid="video-facade">
      <div className="relative aspect-video w-full overflow-hidden rounded-card bg-forest-800">
        {playing ? (
          <iframe
            ref={frameRef}
            // Built by src/lib/video/youtube.ts, which can only produce this one host.
            src={`${video.embedUrl}&autoplay=1`}
            title={`${video.title} — ${video.publisher}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
            data-testid="video-player"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label={label}
            data-testid="video-play"
            className="absolute inset-0 flex h-full w-full flex-col justify-between gap-4 p-5 text-left transition-colors duration-[--duration-quick] ease-[--ease-out-soft] hover:bg-forest-900 sm:p-7"
          >
            <span className="text-small font-medium tracking-wide text-clay-200 uppercase">
              {video.publisher}
            </span>

            <span className="flex items-center gap-4">
              {/* The lime is a fill, never text — forest-900 sits on it at about 11:1. */}
              <span
                aria-hidden
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-pill bg-clay-500 text-forest-900"
              >
                <Play className="h-6 w-6 translate-x-[1px]" fill="currentColor" />
              </span>
              <span className="font-display text-title text-white">{video.title}</span>
            </span>
          </button>
        )}
      </div>

      {/* Said plainly, and said before the choice rather than after it. */}
      <p className="mt-3 text-legal text-muted">
        {playing
          ? "This is playing from YouTube."
          : "This plays from YouTube. Nothing loads from Google until you press play."}{" "}
        <a
          href={video.sourceUrl}
          rel="noopener noreferrer"
          className="text-forest-600 underline underline-offset-4"
        >
          Open the source on YouTube instead
        </a>
        .
      </p>
    </div>
  );
}
