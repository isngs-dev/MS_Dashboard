"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { COLORS, type VisualProps } from "./shared";

const N = 14;
const seed = [0.4, 0.55, 0.45, 0.62, 0.52, 0.7, 0.58, 0.66, 0.5, 0.74, 0.6, 0.82, 0.7, 0.78];

const pathFrom = (vals: number[]) =>
  vals
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i / (N - 1)) * 250 + 8} ${70 - v * 52}`)
    .join(" ");

/** 08: a live pulse dot with data points streaming into a rolling sparkline. */
export default function LivePulse({ active, still }: VisualProps) {
  const [vals, setVals] = useState(seed);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active || still) return;
    const id = setInterval(() => {
      setVals((v) => [...v.slice(1), Math.min(0.95, Math.max(0.2, v[v.length - 1] + (Math.random() - 0.45) * 0.3))]);
      setTick((t) => t + 1);
    }, 650);
    return () => clearInterval(id);
  }, [active, still]);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-3" aria-hidden>
      <div className="flex items-center gap-3">
        <span className="relative flex h-5 w-5 items-center justify-center">
          {!still && (
            <>
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ background: COLORS.green }}
                animate={active ? { scale: [1, 3.2], opacity: [0.55, 0] } : undefined}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
              <motion.span
                className="absolute inset-0 rounded-full"
                style={{ background: COLORS.green }}
                animate={active ? { scale: [1, 3.2], opacity: [0.45, 0] } : undefined}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.9 }}
              />
            </>
          )}
          <span className="relative h-3 w-3 rounded-full" style={{ background: COLORS.green, boxShadow: `0 0 10px ${COLORS.green}88` }} />
        </span>
        <span className="h-2 w-16 rounded-full bg-taupe/30" />
        <span className="h-2 w-8 rounded-full bg-taupe/20" />
      </div>

      <svg viewBox="0 0 266 80" className="w-[250px] overflow-visible">
        <defs>
          <linearGradient id="lp-stroke" x1="0" x2="1">
            <stop offset="0" stopColor={COLORS.blue} stopOpacity="0.2" />
            <stop offset="0.5" stopColor={COLORS.sky} />
            <stop offset="1" stopColor={COLORS.green} />
          </linearGradient>
        </defs>
        <motion.path
          d={pathFrom(vals)}
          animate={{ d: pathFrom(vals) }}
          transition={{ duration: 0.6, ease: "linear" }}
          fill="none"
          stroke="url(#lp-stroke)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {vals.map((v, i) => (
          <motion.circle
            key={`${tick}-${i}`}
            cx={(i / (N - 1)) * 250 + 8}
            cy={70 - v * 52}
            r={i === N - 1 ? 4.5 : 2.2}
            fill={i === N - 1 ? "#1f4aa8" : COLORS.sky}
            opacity={0.35 + (i / N) * 0.65}
          />
        ))}
      </svg>
    </div>
  );
}
