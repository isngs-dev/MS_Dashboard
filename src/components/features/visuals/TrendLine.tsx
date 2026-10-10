"use client";

import { useEffect, useId, useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { COLORS, useLoop, type VisualProps } from "./shared";

const PATH =
  "M10 116 C 30 108, 44 90, 62 96 S 96 74, 116 64 S 150 66, 168 46 S 212 32, 236 18 S 262 16, 276 10";
const AREA = `${PATH} L276 132 L10 132 Z`;

/** 03: a trend line draws itself, a point rides its head, insights pop. */
export default function TrendLine({ active, still }: VisualProps) {
  const uid = useId();
  const path = useRef<SVGPathElement>(null);
  const p = useLoop(active, still, { keyframes: [0, 1, 1, 0], times: [0, 0.5, 0.88, 1], duration: 7 });

  // The head position reads the real path geometry, so nudge once after mount.
  useEffect(() => {
    p.set(p.get() + 1e-6);
  }, [p]);

  const x = useTransform(p, (v) => path.current?.getPointAtLength(v * path.current.getTotalLength()).x ?? 10);
  const y = useTransform(p, (v) => path.current?.getPointAtLength(v * path.current.getTotalLength()).y ?? 116);
  const flag1 = useTransform(p, [0.3, 0.42], [0, 1]);
  const flag2 = useTransform(p, [0.7, 0.85], [0, 1]);
  const areaOpacity = useTransform(p, [0, 0.6, 1], [0, 0.9, 0.9]);

  return (
    <svg viewBox="0 0 290 140" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={`${uid}-s`} x1="0" x2="1">
          <stop offset="0" stopColor={COLORS.blue} />
          <stop offset="0.6" stopColor={COLORS.sky} />
          <stop offset="1" stopColor={COLORS.taupe} />
        </linearGradient>
        <linearGradient id={`${uid}-a`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={COLORS.sky} stopOpacity="0.38" />
          <stop offset="1" stopColor={COLORS.sky} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[30, 62, 94, 126].map((gy) => (
        <line key={gy} x1="8" x2="282" y1={gy} y2={gy} stroke="rgb(156 129 103 / 0.25)" strokeDasharray="3 5" />
      ))}
      <motion.path d={AREA} fill={`url(#${uid}-a)`} style={{ opacity: areaOpacity }} />
      <motion.path
        ref={path}
        d={PATH}
        fill="none"
        stroke={`url(#${uid}-s)`}
        strokeWidth="3.4"
        strokeLinecap="round"
        style={{ pathLength: p }}
      />
      <motion.g style={{ opacity: flag1 }}>
        <circle cx="118" cy="64" r="4.5" fill="#fff" stroke={COLORS.blue} strokeWidth="2" />
        <rect x="124" y="40" width="46" height="14" rx="7" fill="#fff" stroke="rgb(156 129 103 / 0.45)" />
        <rect x="131" y="45" width="26" height="4" rx="2" fill="rgb(156 129 103 / 0.6)" />
      </motion.g>
      <motion.g style={{ opacity: flag2 }}>
        <circle cx="236" cy="18" r="4.5" fill="#fff" stroke={COLORS.blue} strokeWidth="2" />
        <rect x="186" y="26" width="46" height="14" rx="7" fill="#fff" stroke="rgb(156 129 103 / 0.45)" />
        <rect x="193" y="31" width="30" height="4" rx="2" fill="rgb(156 129 103 / 0.6)" />
      </motion.g>
      <motion.circle cx={x} cy={y} r="9" fill={COLORS.sky} opacity="0.28" />
      <motion.circle cx={x} cy={y} r="4.2" fill="#1f4aa8" />
    </svg>
  );
}
