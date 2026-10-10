"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCanHover, useReducedMotion } from "@/hooks/useQuality";

type Props = {
  children: React.ReactNode;
  /** How far (0-1) the element is pulled toward the cursor. */
  strength?: number;
  className?: string;
  /** Stretch to the full width of the parent (e.g. a form submit button). */
  block?: boolean;
};

/**
 * Magnetic hover: the wrapped element eases toward the pointer while it is
 * nearby and springs back on leave. The child content drifts a touch further
 * than the shell for a layered, tactile feel.
 */
export default function MagneticWrap({ children, strength = 0.32, className, block = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const canHover = useCanHover();
  const reduced = useReducedMotion();
  const enabled = canHover && !reduced;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });
  const cx = useTransform(sx, (v) => v * 0.35);
  const cy = useTransform(sy, (v) => v * 0.35);

  const onMove = (e: React.PointerEvent) => {
    if (!enabled || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy }}
      className={`${block ? "block w-full" : "inline-block"} ${className ?? ""}`}
    >
      <motion.div style={{ x: cx, y: cy }}>{children}</motion.div>
    </motion.div>
  );
}
