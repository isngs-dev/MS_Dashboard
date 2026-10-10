"use client";

import type Lenis from "lenis";

/**
 * Tiny module-level handle on the Lenis instance so any component
 * (e.g. the navbar CTA) can trigger a smooth scroll without prop drilling.
 */
let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null) {
  instance = lenis;
}

export function getLenis() {
  return instance;
}

const NAV_OFFSET = -88;

export function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;

  if (instance) {
    instance.scrollTo(el, {
      offset: NAV_OFFSET,
      duration: 1.8,
      easing: (t: number) => 1 - Math.pow(1 - t, 4),
    });
  } else {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }
  // Keep keyboard focus in sync with where we scrolled.
  el.focus({ preventScroll: true });
}
