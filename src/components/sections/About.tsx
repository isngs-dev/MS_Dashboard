"use client";

import { useRef } from "react";
import RevealHeading from "@/components/ui/RevealHeading";
import { AboutScene } from "@/components/three/lazy";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import { ABOUT } from "@/content/copy";

const TAGLINE_CLASS =
  "font-display text-[clamp(1.9rem,5.4vw,4.9rem)] font-bold leading-[1.06] tracking-tight";

export default function About() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const sweep = useRef<HTMLSpanElement>(null);
  const count = useRef({ value: 0 });

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      count.current.value = 25;
      return;
    }

    const ctx = gsap.context(() => {
      // 0 -> 25 when the number scrolls into view
      ScrollTrigger.create({
        trigger: stage.current,
        start: "top 65%",
        once: true,
        onEnter: () => {
          gsap.to(count.current, { value: 25, duration: 2.8, ease: "power2.out" });
        },
      });

      // a light sweep glides across the tagline letters, then repeats
      if (sweep.current) {
        gsap.fromTo(
          sweep.current,
          { backgroundPositionX: "170%" },
          {
            backgroundPositionX: "-70%",
            duration: 1.9,
            ease: "power2.inOut",
            delay: 1.1,
            repeat: -1,
            repeatDelay: 4.2,
            scrollTrigger: { trigger: sweep.current, start: "top 85%", toggleActions: "play pause resume pause" },
          },
        );
      }
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="about" aria-labelledby="about-title" className="relative overflow-hidden pb-28 sm:pb-40">
      {/* 3D stage: giant glass-metal 25+ over a rotating network globe */}
      <div ref={stage} className="relative h-[78svh] min-h-[520px] w-full">
        <AboutScene count={count} />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-paper/85"
        />
      </div>

      <div className="relative mx-auto -mt-16 max-w-5xl px-5 sm:-mt-24 sm:px-8">
        <RevealHeading
          as="h2"
          id="about-title"
          text={ABOUT.headline}
          highlight={ABOUT.headlineHighlight}
          className="mx-auto max-w-4xl text-center font-display text-[clamp(2rem,4.4vw,3.9rem)] font-bold leading-[1.05] text-espresso"
        />

        <div className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
          {ABOUT.paragraphs.map((p) => (
            <div key={p} className="glass rounded-3xl p-6 sm:p-8">
              <p className="text-base leading-relaxed text-muted sm:text-lg">{p}</p>
            </div>
          ))}
        </div>

        <div className="relative mt-24 text-center sm:mt-32">
          <div className="relative inline-block">
            <RevealHeading
              as="p"
              text={ABOUT.tagline}
              highlight={["Built", "by", "iSN.", "for", "Mystery", "Shopping."]}
              className={TAGLINE_CLASS}
              start="top 90%"
            />
            <span ref={sweep} aria-hidden className={`sweep-hl pointer-events-none absolute inset-0 ${TAGLINE_CLASS}`}>
              {ABOUT.tagline}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
