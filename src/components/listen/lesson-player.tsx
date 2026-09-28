"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { saveProgress, useLessonProgress } from "@/lib/courses/progress";

export interface PlayerChunk {
  audioUrl: string;
  durationSec: number;
}

const SPEEDS = [1, 1.25, 1.5] as const;

function clock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Which chunk an overall position falls in, and how far into it. */
function locate(chunks: readonly PlayerChunk[], position: number): { index: number; offset: number } {
  let remaining = position;
  for (const [index, chunk] of chunks.entries()) {
    if (remaining < chunk.durationSec) return { index, offset: remaining };
    remaining -= chunk.durationSec;
  }
  return { index: 0, offset: 0 };
}

/**
 * The lesson player. Chunks play back to back as one lesson (DECISIONS.md LC-03), the
 * position is saved on this device as it plays, and a lesson can be marked finished whether
 * it was heard or read.
 */
export function LessonPlayer({ lessonId, chunks }: { lessonId: string; chunks: PlayerChunk[] }) {
  const progress = useLessonProgress(lessonId);

  return (
    <div className="space-y-5">
      {chunks.length > 0 ? (
        <AudioControls lessonId={lessonId} chunks={chunks} resumeFrom={progress.position_sec} />
      ) : (
        <Callout tone="neutral" title="Audio is not switched on yet">
          <p>
            The script below is exactly what will be read aloud. You can read it now, and mark
            the lesson finished when you are done.
          </p>
        </Callout>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant={progress.completed ? "secondary" : "dark"}
          size="sm"
          aria-pressed={progress.completed}
          onClick={() => saveProgress(lessonId, { completed: !progress.completed })}
        >
          {progress.completed ? "Finished — mark as not finished" : "Mark as finished"}
        </Button>
        <p className="text-small text-ink-soft" role="status">
          {progress.completed ? "You have marked this lesson finished." : ""}
        </p>
      </div>
    </div>
  );
}

function AudioControls({
  lessonId,
  chunks,
  resumeFrom,
}: {
  lessonId: string;
  chunks: PlayerChunk[];
  resumeFrom: number;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [initial] = useState(() => locate(chunks, resumeFrom));
  const pendingOffset = useRef(initial.offset);
  const [index, setIndex] = useState(initial.index);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [position, setPosition] = useState(resumeFrom);

  const before = chunks.slice(0, index).reduce((total, chunk) => total + chunk.durationSec, 0);
  const total = chunks.reduce((sum, chunk) => sum + chunk.durationSec, 0);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
  }, [speed, index]);

  function onLoaded() {
    const element = audio.current;
    if (!element) return;
    if (pendingOffset.current > 0) {
      element.currentTime = pendingOffset.current;
      pendingOffset.current = 0;
    }
    element.playbackRate = speed;
    if (playing) void element.play();
  }

  function onTime() {
    const element = audio.current;
    if (!element) return;
    const overall = before + element.currentTime;
    setPosition(overall);
    // Every few seconds is plenty to resume from, and spares the storage on every frame.
    if (Math.floor(overall) % 5 === 0) saveProgress(lessonId, { position_sec: overall });
  }

  function onEnded() {
    if (index < chunks.length - 1) {
      setIndex(index + 1);
      return;
    }
    setPlaying(false);
    saveProgress(lessonId, { position_sec: 0, completed: true });
    setPosition(0);
    setIndex(0);
  }

  function toggle() {
    const element = audio.current;
    if (!element) return;
    if (playing) {
      element.pause();
      saveProgress(lessonId, { position_sec: position });
      setPlaying(false);
    } else {
      void element.play();
      setPlaying(true);
    }
  }

  return (
    <div className="rounded-card border border-line bg-white p-5">
      <audio
        ref={audio}
        src={chunks[index]!.audioUrl}
        preload="metadata"
        onLoadedMetadata={onLoaded}
        onTimeUpdate={onTime}
        onEnded={onEnded}
      />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" onClick={toggle} aria-label={playing ? "Pause lesson" : "Play lesson"}>
          {playing ? "Pause" : position > 0 ? "Carry on" : "Play"}
        </Button>
        <p className="text-small tabular-nums text-ink-soft">
          {clock(position)} of {clock(total)}
        </p>
      </div>

      <fieldset className="mt-5">
        <legend className="text-small font-medium text-ink">Speed</legend>
        <div className="mt-2 flex gap-2">
          {SPEEDS.map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={option === speed ? "dark" : "secondary"}
              aria-pressed={option === speed}
              onClick={() => setSpeed(option)}
            >
              {option}×
            </Button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
