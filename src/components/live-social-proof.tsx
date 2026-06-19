"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Users } from "lucide-react";

const NUMBERS = [247, 312, 389];
const ROTATION_INTERVAL_MS = 10_000;
const COUNT_DURATION_MS = 1200;

/**
 * Smoothly counts from `start` to `end` over `duration` ms.
 * Returns the current intermediate value via a callback.
 */
function useCountAnimation(
  start: number,
  end: number,
  duration: number,
  active: boolean
): number {
  const [value, setValue] = useState(start);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setValue(end);
      return;
    }

    const startTime = performance.now();
    const delta = end - start;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out expo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(Math.round(start + delta * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [start, end, duration, active]);

  return value;
}

export function LiveSocialProofCounter() {
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [fromValue, setFromValue] = useState(NUMBERS[0]);
  const previousIndex = useRef(0);

  // Rotate index every ROTATION_INTERVAL_MS
  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => {
        const next = (prev + 1) % NUMBERS.length;
        previousIndex.current = prev;
        setFromValue(NUMBERS[prev]);
        setAnimating(true);
        return next;
      });
    }, ROTATION_INTERVAL_MS);

    return () => clearInterval(id);
  }, []);

  // Reset animating flag after count animation completes
  useEffect(() => {
    if (animating) {
      const timer = setTimeout(() => setAnimating(false), COUNT_DURATION_MS + 50);
      return () => clearTimeout(timer);
    }
  }, [animating, index]);

  const displayValue = useCountAnimation(
    fromValue,
    NUMBERS[index],
    COUNT_DURATION_MS,
    animating
  );

  const formattedNumber = new Intl.NumberFormat("en-US").format(displayValue);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-[#1A1A1E]/90 backdrop-blur-md px-4 py-2 shadow-sm">
      {/* Icon */}
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
        <Users className="h-3.5 w-3.5" />
      </div>

      {/* Counter */}
      <p className="text-base sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
        <span
          className="inline-block font-bold tabular-nums text-primary-600 dark:text-primary-400 min-w-[3.5ch] text-right transition-colors duration-300"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {formattedNumber}
        </span>{" "}
        <span className="font-medium text-gray-600 dark:text-gray-400">
          freelancers joined this week
        </span>
      </p>

      {/* Pulsing dot to reinforce "live" feel */}
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
      </span>
    </div>
  );
}

export default LiveSocialProofCounter;
