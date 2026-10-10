"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import { COLORS, clamp01, easeOut, useLoop, type VisualProps } from "./shared";

const BARS = [
  { v: 24, h: 0.42, c: COLORS.blue },
  { v: 41, h: 0.68, c: COLORS.sky },
  { v: 33, h: 0.55, c: COLORS.blue },
  { v: 58, h: 1, c: COLORS.taupe },
  { v: 47, h: 0.8, c: COLORS.sky },
];

const W = 26;
const D = 26;
const MAX = 104;

function Bar({ p, i, bar }: { p: MotionValue<number>; i: number; bar: (typeof BARS)[number] }) {
  const grow = useTransform(p, (v) => easeOut(clamp01((v - i * 0.07) / 0.55)));
  const height = useTransform(grow, (g) => Math.max(2, g * bar.h * MAX));
  const count = useTransform(grow, (g) => Math.round(g * bar.v));

  const face = "absolute";
  return (
    <motion.div className="relative" style={{ width: W, height, transformStyle: "preserve-3d", marginInline: 6 }}>
      {/* front */}
      <div className={`${face} inset-0 rounded-[3px]`} style={{ transform: `translateZ(${D / 2}px)`, background: `linear-gradient(180deg, ${bar.c}, ${bar.c}88)`, boxShadow: `0 10px 14px -8px ${bar.c}99` }} />
      {/* right side */}
      <div className={`${face} top-0 h-full`} style={{ width: D, left: W - D / 2, transform: "rotateY(90deg)", background: `linear-gradient(180deg, ${bar.c}aa, ${bar.c}44)` }} />
      {/* top */}
      <div className={`${face} left-0`} style={{ width: W, height: D, top: -D / 2, transform: "rotateX(90deg)", background: "linear-gradient(135deg, rgb(255 255 255 / 0.85), rgb(255 255 255 / 0.35))" }} />
      {/* counting number rides the top edge */}
      <motion.span
        className="absolute left-1/2 -translate-x-1/2 font-display text-[13px] font-bold tabular-nums text-espresso"
        style={{ bottom: "100%", marginBottom: 14, transform: `translateZ(${D}px) translateX(-50%)` }}
      >
        {count}
      </motion.span>
    </motion.div>
  );
}

/** 04: 3D bars grow while their values count up. */
export default function BarsCounting({ active, still }: VisualProps) {
  const p = useLoop(active, still, { keyframes: [0, 1, 1, 0], times: [0, 0.48, 0.86, 1], duration: 6.4 });
  return (
    <div className="relative flex h-full w-full items-end justify-center pb-4 [perspective:800px]" aria-hidden>
      <div className="flex items-end" style={{ transformStyle: "preserve-3d", transform: "rotateX(-14deg) rotateY(-28deg)" }}>
        {BARS.map((b, i) => (
          <Bar key={i} p={p} i={i} bar={b} />
        ))}
      </div>
    </div>
  );
}
