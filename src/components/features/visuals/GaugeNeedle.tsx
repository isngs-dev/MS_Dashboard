"use client";

import { useEffect, useId } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { COLORS, type VisualProps } from "./shared";

// needle angle: -90 (far left) .. +90 (far right)
const SWEEP = [-62, 52, 14, 70, 28];

/** 06: a performance gauge whose needle sweeps and settles. */
export default function GaugeNeedle({ active, still }: VisualProps) {
  const uid = useId();
  const angle = useMotionValue(still ? 48 : -80);
  const value = useTransform(angle, (a) => Math.round(((a + 90) / 180) * 100));

  useEffect(() => {
    if (!active || still) return;
    let stopped = false;
    let controls: ReturnType<typeof animate> | undefined;
    let i = 0;
    const next = () => {
      if (stopped) return;
      controls = animate(angle, SWEEP[i % SWEEP.length], {
        type: "spring",
        stiffness: 42,
        damping: 6.5,
        mass: 1.1,
        onComplete: () => setTimeout(next, 1100),
      });
      i += 1;
    };
    next();
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [active, still, angle]);

  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden>
      <div className="relative h-[116px] w-[220px]">
        <svg viewBox="0 0 220 116" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <linearGradient id={`${uid}-g`} x1="0" x2="1">
              <stop offset="0" stopColor={COLORS.terracotta} />
              <stop offset="0.5" stopColor="#d6b98f" />
              <stop offset="1" stopColor={COLORS.blue} />
            </linearGradient>
          </defs>
          <path d="M20 108 A 90 90 0 0 1 200 108" fill="none" stroke="rgb(156 129 103 / 0.2)" strokeWidth="14" strokeLinecap="round" />
          <path d="M20 108 A 90 90 0 0 1 200 108" fill="none" stroke={`url(#${uid}-g)`} strokeWidth="14" strokeLinecap="round" style={{ filter: "drop-shadow(0 3px 5px rgb(90 60 30 / 0.25))" }} />
          {Array.from({ length: 11 }).map((_, i) => {
            const a = (-90 + i * 18) * (Math.PI / 180);
            const r1 = 70;
            const r2 = i % 5 === 0 ? 60 : 64;
            return (
              <line key={i} x1={110 + Math.sin(a) * r1} y1={108 - Math.cos(a) * r1} x2={110 + Math.sin(a) * r2} y2={108 - Math.cos(a) * r2} stroke="rgb(120 90 60 / 0.45)" strokeWidth={i % 5 === 0 ? 2 : 1} />
            );
          })}
        </svg>
        {/* needle (DOM so the pivot is exact) */}
        <motion.div
          className="absolute bottom-[8px] left-1/2 h-[78px] w-[3px] -translate-x-1/2 origin-bottom rounded-full bg-espresso"
          style={{ rotate: angle, boxShadow: "0 2px 4px rgb(42 33 27 / 0.3)" }}
        />
        <div className="absolute bottom-[1px] left-1/2 h-[16px] w-[16px] -translate-x-1/2 rounded-full border-2 border-espresso bg-white" />
        <motion.span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 font-display text-lg font-bold tabular-nums text-espresso">
          {value}
        </motion.span>
      </div>
    </div>
  );
}
