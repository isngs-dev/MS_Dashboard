"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";

type Tag = "h1" | "h2" | "h3" | "p" | "div";

type Props = {
  text: string;
  /** Words (matched after stripping nothing; exact token match) that get the gradient treatment. */
  highlight?: readonly string[];
  as?: Tag;
  className?: string;
  /** "scroll" animates when the element enters the viewport, "load" animates immediately. */
  trigger?: "scroll" | "load";
  /** ScrollTrigger start position. */
  start?: string;
  delay?: number;
  stagger?: number;
  id?: string;
};

/**
 * Word-by-word headline reveal: each word slides up and resolves from blur to sharp.
 * The accessible name is the full sentence (visually-hidden copy), the animated
 * spans are aria-hidden so screen readers never read it word by word.
 */
export default function RevealHeading({
  text,
  highlight = [],
  as: Tag = "h2",
  className,
  trigger = "scroll",
  start = "top 88%",
  delay = 0,
  stagger = 0.075,
  id,
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const words = text.split(" ");
  const hi = new Set(highlight);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const targets = el.querySelectorAll<HTMLElement>(".rw");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      gsap.set(targets, { opacity: 1, y: 0, filter: "none" });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y: "0.55em", filter: "blur(14px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.05,
          delay,
          stagger,
          ease: "power3.out",
          scrollTrigger: trigger === "scroll" ? { trigger: el, start, once: true } : undefined,
          onComplete: () => {
            gsap.set(targets, { filter: "none", transform: "none", willChange: "auto" });
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [text, trigger, start, delay, stagger]);

  // The tag is chosen by the caller; every supported tag accepts the same props/ref.
  const Component = Tag as "div";

  return (
    <Component ref={root} id={id} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((w, i) => (
          <span key={`${w}-${i}`}>
            <span className={`rw ${hi.has(w) ? "gradient-text" : ""}`}>{w}</span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Component>
  );
}
