"use client";

import { useSyncExternalStore } from "react";
import { detectQuality, QUALITY_SETTINGS, type Quality } from "@/lib/quality";

function subscribe(onChange: () => void) {
  const queries = [
    window.matchMedia("(prefers-reduced-motion: reduce)"),
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(max-width: 767px)"),
  ];
  queries.forEach((q) => q.addEventListener("change", onChange));
  return () => queries.forEach((q) => q.removeEventListener("change", onChange));
}

/** Current rendering tier. "medium" during SSR; the real value is read on the client. */
export function useQuality(): Quality {
  return useSyncExternalStore(subscribe, detectQuality, () => "medium" as Quality);
}

export function useQualitySettings() {
  const quality = useQuality();
  return { quality, ...QUALITY_SETTINGS[quality] };
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const q = window.matchMedia("(prefers-reduced-motion: reduce)");
      q.addEventListener("change", onChange);
      return () => q.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** true when the primary input can hover (mouse / trackpad). */
export function useCanHover(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const q = window.matchMedia("(hover: hover) and (pointer: fine)");
      q.addEventListener("change", onChange);
      return () => q.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    () => false,
  );
}
