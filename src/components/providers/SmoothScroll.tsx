"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { setLenis } from "@/lib/scroll";

/**
 * Lenis smooth scrolling driven by GSAP's ticker so ScrollTrigger and Lenis
 * share a single rAF loop (no desync, no double work).
 * Skipped entirely when the visitor prefers reduced motion.
 */
export default function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    const start = () => {
      if (lenis) return;
      lenis = new Lenis({
        lerp: 0.09,
        wheelMultiplier: 1,
        touchMultiplier: 1.4,
        smoothWheel: true,
        autoRaf: false,
      });
      setLenis(lenis);
      lenis.on("scroll", ScrollTrigger.update);
      tick = (time: number) => lenis?.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    };

    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      lenis?.destroy();
      lenis = null;
      tick = null;
      setLenis(null);
    };

    const sync = () => (reduced.matches ? stop() : start());
    sync();
    reduced.addEventListener("change", sync);

    return () => {
      reduced.removeEventListener("change", sync);
      stop();
    };
  }, []);

  return <>{children}</>;
}
