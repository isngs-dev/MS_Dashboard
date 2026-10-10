"use client";

import { motion } from "framer-motion";
import { COLORS, type VisualProps } from "./shared";

const LAYERS = [
  { c: COLORS.taupe, z: 66 },
  { c: COLORS.sky, z: 22 },
  { c: COLORS.blue, z: -22 },
  { c: COLORS.clay, z: -66 },
];

const GRID =
  "linear-gradient(rgb(255 255 255 / 0.55) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.55) 1px, transparent 1px)";

/** 01: separate data layers slide together and merge into a single slab. */
export default function StackedLayers({ active, still }: VisualProps) {
  return (
    <div className="relative h-full w-full [perspective:760px]" aria-hidden>
      <div
        className="absolute left-1/2 top-1/2 h-0 w-0"
        style={{ transformStyle: "preserve-3d", transform: "translate(-50%, -34%) rotateX(62deg) rotateZ(-34deg)" }}
      >
        {LAYERS.map((l, i) => (
          <motion.div
            key={l.c}
            className="absolute -left-[58px] -top-[58px] h-[116px] w-[116px] rounded-xl border"
            style={{
              backgroundImage: `${GRID}, linear-gradient(135deg, ${l.c}77, ${l.c}22)`,
              backgroundSize: "16px 16px, 16px 16px, 100% 100%",
              borderColor: `${l.c}cc`,
              boxShadow: `0 16px 22px -14px ${l.c}99, inset 0 0 22px ${l.c}22`,
            }}
            initial={{ z: still ? i * 7 - 10 : l.z }}
            animate={active && !still ? { z: [l.z, i * 7 - 10, i * 7 - 10, l.z] } : undefined}
            transition={{ duration: 4.6, times: [0, 0.42, 0.66, 1], ease: "easeInOut", repeat: Infinity }}
          />
        ))}
      </div>
    </div>
  );
}
