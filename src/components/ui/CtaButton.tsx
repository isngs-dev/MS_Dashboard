"use client";

import MagneticWrap from "@/components/ui/MagneticWrap";
import { scrollToId } from "@/lib/scroll";

type Props = {
  children: React.ReactNode;
  targetId?: string;
  size?: "sm" | "lg";
  pulse?: boolean;
  className?: string;
};

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Warm-highlight call to action that smooth-scrolls to a section id (default: the form). */
export default function CtaButton({ children, targetId = "build", size = "lg", pulse = true, className }: Props) {
  const sizing = size === "lg" ? "px-8 py-4 text-base sm:text-lg" : "px-3 py-2 text-[0.76rem] sm:px-5 sm:py-2.5 sm:text-sm";
  return (
    <MagneticWrap strength={size === "lg" ? 0.3 : 0.2}>
      <a
        href={`#${targetId}`}
        onClick={(e) => {
          e.preventDefault();
          scrollToId(targetId);
        }}
        className={`btn-cta whitespace-nowrap ${pulse ? "btn-pulse" : ""} ${sizing} ${className ?? ""}`}
      >
        <span>{children}</span>
        <span className={size === "sm" ? "hidden sm:inline-flex" : "inline-flex"}>
          <Arrow />
        </span>
      </a>
    </MagneticWrap>
  );
}
