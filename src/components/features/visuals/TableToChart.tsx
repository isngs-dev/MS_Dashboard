"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { COLORS, type VisualProps } from "./shared";

const ROWS = [
  { n: 72, c: COLORS.blue },
  { n: 48, c: COLORS.sky },
  { n: 91, c: COLORS.taupe },
  { n: 36, c: COLORS.blue },
  { n: 64, c: COLORS.sky },
];

/** 09: a plain table of numbers morphs into a bar chart, then back. */
export default function TableToChart({ active, still }: VisualProps) {
  const [toggled, setToggled] = useState(false);
  const chart = still || toggled;

  useEffect(() => {
    if (still || !active) return;
    const id = setInterval(() => setToggled((c) => !c), 2600);
    return () => clearInterval(id);
  }, [active, still]);

  return (
    <div className="flex h-full w-full items-center justify-center" aria-hidden>
      <div className="flex w-[230px] flex-col gap-[7px]">
        {ROWS.map((r, i) => (
          <div key={i} className="flex h-[17px] items-center gap-[6px]">
            <motion.div
              className="h-[7px] rounded-full bg-taupe/35"
              animate={{ width: chart ? 22 : 62 }}
              transition={{ type: "spring", stiffness: 150, damping: 18, delay: i * 0.04 }}
            />
            <motion.div
              className="relative flex items-center overflow-hidden"
              animate={{
                width: chart ? `${r.n * 1.45}%` : 62,
                height: chart ? 15 : 17,
                borderRadius: chart ? 8 : 5,
              }}
              transition={{ type: "spring", stiffness: 140, damping: 17, delay: i * 0.05 }}
              style={{
                background: chart ? `linear-gradient(90deg, ${COLORS.blue}, ${r.c})` : "rgb(255 255 255 / 0.78)",
                border: chart ? "1px solid transparent" : "1px solid rgb(156 129 103 / 0.32)",
                boxShadow: chart ? `0 6px 10px -6px ${r.c}99` : "none",
                transition: "background 0.45s, border-color 0.45s, box-shadow 0.45s",
              }}
            >
              <span className="px-1.5 font-mono text-[10px] font-semibold tabular-nums transition-colors duration-300" style={{ color: chart ? "#fff" : "#4a3f36" }}>
                {r.n}
              </span>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}
