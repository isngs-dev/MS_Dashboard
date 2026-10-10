"use client";

import { useId } from "react";
import { motion, useTransform } from "framer-motion";
import { COLORS, useLoop, type VisualProps } from "./shared";

/** 05: a finished report slides out of the stack and gets a checkmark. */
export default function ReportSlide({ active, still }: VisualProps) {
  const uid = useId();
  const p = useLoop(active, still, { keyframes: [0, 1, 1, 0], times: [0, 0.34, 0.84, 1], duration: 6 });

  const slide = useTransform(p, [0, 0.5, 1], [0, 34, 56]);
  const lift = useTransform(p, [0, 1], [0, -8]);
  const tilt = useTransform(p, [0, 1], [0, -5]);
  const check = useTransform(p, [0.5, 0.95], [0, 1]);
  const badgeScale = useTransform(p, [0.5, 0.78, 1], [0.2, 1.18, 1]);
  const badgeOpacity = useTransform(p, [0.46, 0.6], [0, 1]);
  const lines = useTransform(p, [0.1, 0.9], [0, 1]);

  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden>
      <div className="relative h-[124px] w-[210px]">
        {/* back of the stack */}
        {[2, 1].map((n) => (
          <div
            key={n}
            className="absolute left-0 top-0 h-[112px] w-[84px] rounded-lg border border-taupe/25 bg-white/70"
            style={{ transform: `translate(${-n * 6}px, ${n * 4}px)` }}
          />
        ))}
        {/* the report */}
        <motion.div
          className="absolute left-0 top-0 h-[112px] w-[88px] rounded-lg border border-taupe/30 p-2.5"
          style={{
            x: slide,
            y: lift,
            rotate: tilt,
            background: "linear-gradient(160deg, #ffffff, #f6efe6)",
            boxShadow: "0 18px 34px -14px rgb(90 60 30 / 0.4), inset 0 1px 0 #fff",
          }}
        >
          <div className="h-2 w-9 rounded-full bg-espresso/75" />
          <div className="mt-2.5 flex h-[34px] items-end gap-1">
            {[0.4, 0.7, 0.5, 0.9, 0.65].map((h, i) => (
              <motion.div key={i} className="flex-1 rounded-sm" style={{ height: `${h * 100}%`, background: i % 2 ? COLORS.sky : COLORS.blue, scaleY: lines, originY: 1 }} />
            ))}
          </div>
          {[1, 0.8, 0.9, 0.55].map((w, i) => (
            <motion.div key={i} className="mt-1.5 h-1 rounded-full bg-taupe/40" style={{ width: `${w * 100}%`, scaleX: lines, originX: 0 }} />
          ))}
        </motion.div>

        {/* checkmark badge */}
        <motion.svg
          viewBox="0 0 48 48"
          className="absolute -right-1 top-3 h-14 w-14"
          style={{ x: slide, scale: badgeScale, opacity: badgeOpacity }}
        >
          <defs>
            <linearGradient id={`${uid}-c`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={COLORS.green} />
              <stop offset="1" stopColor={COLORS.blue} />
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="21" fill="rgb(47 143 102 / 0.14)" stroke={`url(#${uid}-c)`} strokeWidth="2.5" />
          <motion.path d="M14 25 L21.5 32 L34 17" fill="none" stroke={`url(#${uid}-c)`} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength: check }} />
        </motion.svg>
      </div>
    </div>
  );
}
