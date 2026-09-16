"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

/**
 * A horizontally scrollable row.
 *
 * The scrolling itself is native overflow with scroll-snap, so it works by touch, by
 * trackpad, and by tabbing through the links inside it — with no JavaScript at all. The
 * arrows are an enhancement layered on top: they are rendered only once the component has
 * mounted, because a button that does nothing is worse than no button.
 *
 * Deliberately not an auto-playing marquee. Moving content that contains links has to offer
 * a way to pause it (WCAG 2.2.2), it is hard to read, and it is hard to click. On a page
 * about people's diagnoses, calm is the right register anyway.
 */
export function Scroller({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const ref = React.useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = React.useState(true);
  const [atEnd, setAtEnd] = React.useState(false);

  // False during server rendering and the first client render, true afterwards. This is how
  // the arrows stay out of the markup for anyone without JavaScript, without writing state
  // from inside an effect.
  const mounted = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ResizeObserver fires once on observe, which gives us the first measurement without
    // setting state directly in the effect.
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [update]);

  const nudge = (direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    // Roughly one card, so nothing is ever left half-shown.
    el.scrollBy({ left: direction * Math.min(el.clientWidth * 0.8, 360), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <ul
        ref={ref}
        onScroll={update}
        aria-label={label}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </ul>

      {mounted ? (
        <div className="mt-6 flex gap-2">
          <ArrowButton label="Scroll left" onClick={() => nudge(-1)} disabled={atStart}>
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </ArrowButton>
          <ArrowButton label="Scroll right" onClick={() => nudge(1)} disabled={atEnd}>
            <ChevronRight aria-hidden className="h-5 w-5" />
          </ArrowButton>
        </div>
      ) : null}
    </div>
  );
}

function ArrowButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-pill border border-line bg-white text-forest-700 transition-colors duration-[--duration-quick] hover:bg-cream-50 disabled:opacity-40"
    >
      {children}
    </button>
  );
}
