"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { COLORS, type VisualProps } from "./shared";

const CHIPS = ["Project", "Location", "Date", "Score"];

// which chips are on at each step, and the chart that results
const STEPS = [
  { on: [1, 0, 0, 0], bars: [0.5, 0.74, 0.58, 0.9, 0.66, 0.8] },
  { on: [1, 1, 0, 0], bars: [0.34, 0.5, 0.82, 0.46, 0.7, 0.38] },
  { on: [1, 1, 1, 0], bars: [0.62, 0.3, 0.44, 0.7, 0.92, 0.56] },
  { on: [0, 1, 1, 1], bars: [0.84, 0.66, 0.9, 0.38, 0.52, 0.72] },
];

/** 07: filter chips toggle and the chart below re-draws for each combination. */
export default function FilterChips({ active, still }: VisualProps) {
  const [step, setStep] = useState(still ? 2 : 0);

  useEffect(() => {
    if (!active || still) return;
    const id = setInterval(() => setStep((s) => (s + 1) % STEPS.length), 1900);
    return () => clearInterval(id);
  }, [active, still]);

  const cur = STEPS[step];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-2" aria-hidden>
      <div className="flex flex-wrap justify-center gap-1.5">
        {CHIPS.map((c, i) => {
          const on = cur.on[i] === 1;
          return (
            <motion.span
              key={c}
              animate={{ scale: on ? 1 : 0.94 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="relative rounded-full border px-3 py-1 text-[11px] font-medium"
              style={{
                borderColor: on ? COLORS.blue : "rgb(156 129 103 / 0.4)",
                color: on ? "#fff" : "#75685c",
                background: on ? `linear-gradient(120deg, ${COLORS.blue}, #1f4aa8)` : "rgb(255 255 255 / 0.65)",
                boxShadow: on ? `0 8px 14px -8px ${COLORS.blue}aa` : "none",
                transition: "background 0.3s, border-color 0.3s, color 0.3s, box-shadow 0.3s",
              }}
            >
              {c}
            </motion.span>
          );
        })}
      </div>
      <div className="flex h-[70px] w-[200px] items-end justify-between gap-2 border-b border-taupe/30 pb-px">
        {cur.bars.map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t-md"
            animate={{ height: `${h * 100}%` }}
            transition={{ type: "spring", stiffness: 170, damping: 16, delay: still ? 0 : i * 0.03 }}
            style={{ background: `linear-gradient(180deg, ${i % 2 ? COLORS.clay : COLORS.blue}, ${COLORS.blue}66)`, boxShadow: `0 6px 10px -6px ${COLORS.blue}66` }}
          />
        ))}
      </div>
    </div>
  );
}
