"use client";

import { useRef, type ComponentType } from "react";
import { useInView } from "framer-motion";
import TiltCard from "./TiltCard";
import { useReducedMotion } from "@/hooks/useQuality";
import type { VisualProps } from "./visuals/shared";

type Props = {
  n: string;
  title: string;
  body: string;
  Visual: ComponentType<VisualProps>;
  /** grid placement classes for the bento layout */
  className?: string;
  /** "wide" lays the visual beside the copy (from the given breakpoint up); "highlight" is the hero card */
  layout?: "stack" | "wide-md" | "wide-lg";
  highlight?: boolean;
};

const LAYOUTS = {
  stack: { row: "flex-col", visual: "h-44 w-full" },
  "wide-md": { row: "flex-col md:flex-row md:items-center md:gap-8", visual: "h-48 w-full md:h-60 md:w-[44%]" },
  "wide-lg": { row: "flex-col lg:flex-row lg:items-center lg:gap-8", visual: "h-44 w-full lg:h-56 lg:w-[42%]" },
} as const;

/** Giant outlined number: sits above the glass, behind the content (parallaxed by the section). */
function GiantNumber({ n, highlight }: { n: string; highlight?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      style={{ transform: "translateZ(10px)" }}
    >
      <svg
        data-parallax
        viewBox="0 0 300 170"
        className={`absolute -right-2 -top-5 select-none ${highlight ? "w-[21rem]" : "w-[14rem]"}`}
      >
        <text
          x="296"
          y="150"
          textAnchor="end"
          fontFamily="var(--font-display)"
          fontWeight="700"
          fontSize="168"
          letterSpacing="-6"
          fill="none"
          stroke="url(#num-grad)"
          strokeWidth="1.6"
        >
          {n}
        </text>
      </svg>
    </div>
  );
}

export default function FeatureCard({ n, title, body, Visual, className, layout = "stack", highlight }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { margin: "-12% 0px -12% 0px" });
  const active = inView && !reduced;
  const L = LAYOUTS[layout];

  return (
    // The outer wrapper is what GSAP animates in (flip/rise). Tilt lives on the inner card.
    <div ref={ref} data-card className={`feature-card-in [perspective:1200px] ${className ?? ""}`}>
      <TiltCard
        className="h-full"
        border={highlight ? "live" : "hover"}
        glassClassName={highlight ? "bg-gradient-to-br from-blue/10 via-white/40 to-clay/15" : ""}
      >
        {highlight && (
          <div aria-hidden className="pointer-events-none absolute -inset-2 -z-10 rounded-[2rem] bg-gradient-to-br from-blue/20 via-sky/15 to-clay/25 blur-2xl" />
        )}
        <GiantNumber n={n} highlight={highlight} />

        <div
          className={`relative z-10 flex h-full gap-5 p-6 sm:p-7 ${L.row}`}
          style={{ transform: "translateZ(24px)" }}
        >
          <div
            className={`relative shrink-0 overflow-hidden rounded-2xl border border-taupe/20 bg-white/55 ${L.visual} ${highlight ? "md:h-64" : ""}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_0%,rgb(47_102_212/0.10),transparent_70%)]" />
            <Visual active={active} still={reduced} />
          </div>
          <div className="min-w-0">
            <h3 className={`font-display font-bold leading-tight text-espresso ${highlight ? "text-2xl sm:text-3xl" : "text-xl sm:text-[1.4rem]"}`}>
              {title}
            </h3>
            <p className={`mt-3 leading-relaxed text-muted ${highlight ? "text-base sm:text-[1.05rem]" : "text-[0.95rem]"}`}>{body}</p>
          </div>
        </div>
      </TiltCard>
    </div>
  );
}
