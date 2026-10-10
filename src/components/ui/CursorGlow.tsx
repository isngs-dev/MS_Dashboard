"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useCanHover, useReducedMotion } from "@/hooks/useQuality";

/** Soft light that trails the mouse. Only mounted for fine-pointer devices. */
export default function CursorGlow() {
  const canHover = useCanHover();
  const reduced = useReducedMotion();
  const glow = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canHover || !glow.current || !dot.current) return;
    const g = glow.current;
    const d = dot.current;

    gsap.set([g, d], { xPercent: -50, yPercent: -50, x: window.innerWidth / 2, y: window.innerHeight / 3 });
    const gx = gsap.quickTo(g, "x", { duration: reduced ? 0 : 0.7, ease: "power3.out" });
    const gy = gsap.quickTo(g, "y", { duration: reduced ? 0 : 0.7, ease: "power3.out" });
    const dx = gsap.quickTo(d, "x", { duration: reduced ? 0 : 0.15, ease: "power3.out" });
    const dy = gsap.quickTo(d, "y", { duration: reduced ? 0 : 0.15, ease: "power3.out" });

    let shown = false;
    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to([g, d], { opacity: 1, duration: 0.5 });
      }
      gx(e.clientX);
      gy(e.clientY);
      dx(e.clientX);
      dy(e.clientY);
    };
    const onLeave = () => {
      shown = false;
      gsap.to([g, d], { opacity: 0, duration: 0.4 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [canHover, reduced]);

  if (!canHover) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[60]">
      <div
        ref={glow}
        className="absolute left-0 top-0 h-[520px] w-[520px] rounded-full opacity-0"
        style={{
          background:
            "radial-gradient(closest-side, rgb(47 102 212 / 0.14), rgb(224 178 142 / 0.12) 45%, transparent 72%)",
          willChange: "transform",
        }}
      />
      <div
        ref={dot}
        className="absolute left-0 top-0 h-2.5 w-2.5 rounded-full bg-blue opacity-0 shadow-[0_0_14px_3px_rgb(47_102_212/0.45)]"
        style={{ willChange: "transform" }}
      />
    </div>
  );
}
