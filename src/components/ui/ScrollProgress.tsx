"use client";

import { useEffect, useRef } from "react";

/** Thin gradient bar fixed to the top of the viewport showing page scroll progress. */
export default function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-[3px] bg-taupe/10"
    >
      <div
        ref={bar}
        className="h-full origin-left bg-gradient-to-r from-blue-deep via-blue to-clay shadow-[0_0_10px_rgb(47_102_212/0.45)]"
        style={{ transform: "scaleX(0)", willChange: "transform" }}
      />
    </div>
  );
}
