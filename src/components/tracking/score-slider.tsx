"use client";

import * as React from "react";

import { cn } from "@/lib/cn";

/**
 * One 0–10 score, as a real `<input type="range">`.
 *
 * Native on purpose, and this is the whole reason the daily log can be both fast and
 * accessible. A range input is already draggable with a thumb, already operable with the
 * arrow keys, Home and End, already announced as a slider with its value, and already works
 * on a phone with one thumb. A slider built out of divs and pointer events is a rewrite of
 * all of that, done worse.
 *
 * What is added on top:
 *
 * - a real `<label>` tied to the input by id, so it is announced and so tapping the label
 *   moves focus to the slider;
 * - the current value shown, in text, right beside the label, large enough to read at arm's
 *   length — not only in the thumb's position;
 * - `aria-valuetext`, so a screen reader says "6 out of 10" rather than "6";
 * - a 44px high hit area and a 28px thumb, the minimum comfortable touch target.
 *
 * **No colour carries meaning.** The track is one neutral colour at every value. A slider
 * that turns red at 8 would be the interface telling somebody their day was bad, which is
 * not ours to say (AGENTS.md rule 9).
 */
export function ScoreSlider({
  name,
  label,
  defaultValue,
  min = 0,
  max = 10,
  lowLabel,
  highLabel,
  hint,
}: {
  name: string;
  label: string;
  defaultValue: number;
  min?: number;
  max?: number;
  /** What the bottom of the scale means. A definition, never a judgement. */
  lowLabel: string;
  highLabel: string;
  hint?: string;
}) {
  const id = React.useId();
  const [value, setValue] = React.useState(defaultValue);
  const hintId = hint ? `${id}-hint` : undefined;
  const scaleId = `${id}-scale`;
  // The scale anchors are shown on screen and read out, once, as part of the slider's
  // description. Hiding them from assistive technology would leave a screen reader user
  // with a bare number and no idea which end of the scale is which.
  const describedBy = [hintId, scaleId].filter(Boolean).join(" ");

  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-body font-medium text-ink">
          {label}
        </label>
        {/* The slider itself announces its value, so this is not read out twice. */}
        <output
          htmlFor={id}
          aria-hidden="true"
          className="min-w-12 rounded-pill bg-cream-200 px-3 py-1 text-center text-body font-semibold tabular-nums text-ink"
        >
          {value}
        </output>
      </div>

      {hint ? (
        <p id={hintId} className="mt-1 text-small text-muted">
          {hint}
        </p>
      ) : null}

      <input
        id={id}
        name={name}
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        aria-describedby={describedBy}
        aria-valuetext={`${value} out of ${max}`}
        className={cn(
          "mt-1 h-11 w-full cursor-pointer appearance-none bg-transparent",
          "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-pill [&::-webkit-slider-runnable-track]:bg-cream-300",
          "[&::-webkit-slider-thumb]:-mt-[0.625rem] [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-pill [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-forest-800",
          "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-pill [&::-moz-range-track]:bg-cream-300",
          "[&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:rounded-pill [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-forest-800",
        )}
      />

      <div id={scaleId} className="flex justify-between gap-4 text-legal text-muted">
        <span>{lowLabel}</span>
        <span className="text-right">{highLabel}</span>
      </div>
    </div>
  );
}
