"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import { useReducedMotion } from "@/hooks/useQuality";
import { FORM } from "@/content/copy";

const COLORS = ["#2f66d4", "#6b97e8", "#9c8167", "#c98f72", "#bb5a26", "#2f8f66"];
const PARTICLES = 44;

type Props = {
  /** where the confirmation email was sent */
  email: string;
  /** e.g. "Tuesday, October 14 at 3:00 PM" when a call was booked, otherwise null */
  booked: string | null;
};

/** Animated confirmation: the checkmark draws itself, then a particle burst fires. */
export default function SuccessState({ email, booked }: Props) {
  const burst = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useIsoLayoutEffect(() => {
    const box = burst.current;
    if (!box || reduced) return;
    const dots = box.querySelectorAll<HTMLElement>("[data-dot]");
    const ctx = gsap.context(() => {
      dots.forEach((dot, i) => {
        const angle = (i / dots.length) * Math.PI * 2 + gsap.utils.random(-0.25, 0.25);
        const distance = gsap.utils.random(70, 190);
        gsap.fromTo(
          dot,
          { x: 0, y: 0, scale: gsap.utils.random(0.7, 1.4), opacity: 1 },
          {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            scale: 0,
            opacity: 0,
            duration: gsap.utils.random(0.9, 1.7),
            ease: "power3.out",
            delay: 0.55 + gsap.utils.random(0, 0.12),
          },
        );
      });
    }, box);
    return () => ctx.revert();
  }, [reduced]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex min-h-[26rem] flex-col items-center justify-center py-6 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        <div ref={burst} aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {Array.from({ length: PARTICLES }).map((_, i) => (
            <span
              key={i}
              data-dot
              className="absolute h-2 w-2 rounded-full opacity-0"
              style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 12px ${COLORS[i % COLORS.length]}` }}
            />
          ))}
        </div>

        <svg viewBox="0 0 100 100" className="relative h-full w-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="ok-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#2f8f66" />
              <stop offset="1" stopColor="#2f66d4" />
            </linearGradient>
          </defs>
          <g transform="rotate(-90 50 50)">
            <motion.circle
              cx="50"
              cy="50"
              r="42"
              fill="rgb(47 143 102 / 0.1)"
              stroke="url(#ok-grad)"
              strokeWidth="4"
              strokeLinecap="round"
              initial={{ pathLength: reduced ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, ease: "easeInOut" }}
              style={{ filter: "drop-shadow(0 2px 6px rgb(47 143 102 / 0.35))" }}
            />
          </g>
          <motion.path
            d="M30 52 L44 66 L71 36"
            fill="none"
            stroke="url(#ok-grad)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: reduced ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: reduced ? 0 : 0.55, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 2px 6px rgb(47 102 212 / 0.35))" }}
          />
        </svg>
      </div>

      <h3 className="font-display text-3xl font-bold text-espresso sm:text-4xl">
        {booked ? FORM.success.bookedTitle : FORM.success.title}
      </h3>
      <p className="mt-4 max-w-sm break-words text-base leading-relaxed text-muted sm:text-lg">
        {booked ? FORM.success.bookedBody.replace("{email}", email).replace("{when}", booked) : FORM.success.body}
      </p>
    </motion.div>
  );
}
