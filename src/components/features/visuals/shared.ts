"use client";

import { useEffect } from "react";
import { animate, useMotionValue, type MotionValue } from "framer-motion";

export type VisualProps = {
  /** card is on screen and motion is allowed */
  active: boolean;
  /** reduced motion: render the resolved end state, no loops */
  still: boolean;
};

export const COLORS = {
  blue: "#2f66d4",
  sky: "#6b97e8",
  taupe: "#9c8167",
  clay: "#c98f72",
  terracotta: "#bb5a26",
  green: "#2f8f66",
} as const;

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * A looping 0..1 MotionValue. Keyframes + times let one value drive several
 * coordinated parts of a visual (grow, hold, reset) with perfect sync.
 * `rest` is what a still (reduced motion) render shows.
 */
export function useLoop(
  active: boolean,
  still: boolean,
  opts: { keyframes?: number[]; times?: number[]; duration?: number; rest?: number; delay?: number } = {},
): MotionValue<number> {
  const { keyframes = [0, 1, 1, 0], times = [0, 0.5, 0.85, 1], duration = 6, rest = 1, delay = 0 } = opts;
  const mv = useMotionValue(still ? rest : 0);

  useEffect(() => {
    if (still) {
      mv.set(rest);
      return;
    }
    if (!active) return;
    const controls = animate(mv, keyframes, {
      duration,
      times,
      ease: "easeInOut",
      repeat: Infinity,
      delay,
    });
    return () => controls.stop();
    // keyframes/times are stable literals per visual
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, still, duration, delay]);

  return mv;
}
