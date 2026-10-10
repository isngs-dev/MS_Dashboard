"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useCanHover, useReducedMotion } from "@/hooks/useQuality";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Maximum tilt in degrees. */
  max?: number;
  /** Extra classes for the always-on glass backing layer. */
  glassClassName?: string;
  /** "live" keeps the gradient border spinning; "hover" only while interacting. */
  border?: "hover" | "live";
};

/**
 * 3D tilt card: rotates toward the cursor, with a specular light that tracks
 * the pointer and an animated gradient border. The glass backing is a separate
 * layer so inner content can keep real `translateZ` depth (backdrop-filter
 * would otherwise flatten the 3D context).
 */
export default function TiltCard({ children, className, max = 9, glassClassName, border = "hover" }: Props) {
  const canHover = useCanHover();
  const reduced = useReducedMotion();
  const enabled = canHover && !reduced;

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 190, damping: 18, mass: 0.5 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 190, damping: 18, mass: 0.5 });
  const lift = useSpring(0, { stiffness: 220, damping: 22 });
  const scale = useTransform(lift, [0, 1], [1, 1.015]);
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(520px circle at ${gx} ${gy}, rgb(255 255 255 / 0.7), rgb(47 102 212 / 0.06) 40%, transparent 64%)`;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onEnter = () => enabled && lift.set(1);
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
    lift.set(0);
  };

  return (
    <motion.div
      onPointerMove={onMove}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      style={{
        rotateX: enabled ? rx : 0,
        rotateY: enabled ? ry : 0,
        scale,
        transformPerspective: 1100,
        transformStyle: "preserve-3d",
      }}
      className={`${border === "live" ? "gborder gborder-live" : "gborder gborder-hover"} group relative rounded-[1.6rem] ${className ?? ""}`}
    >
      <div className={`glass absolute inset-0 rounded-[inherit] ${glassClassName ?? ""}`} />
      {enabled && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: glare }}
        />
      )}
      {children}
    </motion.div>
  );
}
