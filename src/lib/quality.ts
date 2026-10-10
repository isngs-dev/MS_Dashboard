import { probeGpu } from "./gpu";

/**
 * Rendering quality tiers.
 *
 *  - "static": reduced motion requested -> render still frames only
 *  - "low":    phones / data-saver / software rendering -> fewer particles, small pixel budget
 *  - "medium": integrated GPUs, tablets, small laptops
 *  - "high":   capable desktops with a discrete GPU
 */
export type Quality = "high" | "medium" | "low" | "static";

type NavigatorExtras = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function detectQuality(): Quality {
  if (typeof window === "undefined") return "medium";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";

  const nav = navigator as NavigatorExtras;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const saveData = nav.connection?.saveData === true;
  const gpu = probeGpu().cls;

  if (gpu === "software" || saveData || memory <= 2 || cores <= 2) return "low";
  if (narrow || (coarse && window.innerWidth < 1024)) return "low";
  if (gpu === "integrated" || coarse || cores <= 4 || memory <= 4) return "medium";
  return "high";
}

/**
 * pixelBudget: max drawing-buffer pixels per canvas. Fill rate, not geometry, is what
 * hurts on large screens, so resolution scales down automatically as the canvas grows.
 */
export const QUALITY_SETTINGS = {
  high: { pixelBudget: 3.0e6, maxDpr: 2, heroParticles: 650, ambient: 260, sheets: 34, globeNodes: 320, antialias: true, detail: true },
  medium: { pixelBudget: 1.6e6, maxDpr: 1.5, heroParticles: 380, ambient: 150, sheets: 24, globeNodes: 200, antialias: false, detail: false },
  low: { pixelBudget: 0.9e6, maxDpr: 1.25, heroParticles: 170, ambient: 70, sheets: 16, globeNodes: 110, antialias: false, detail: false },
  static: { pixelBudget: 2.4e6, maxDpr: 1.5, heroParticles: 360, ambient: 120, sheets: 24, globeNodes: 200, antialias: false, detail: true },
} as const;
