"use client";

import { useRef } from "react";
import RevealHeading from "@/components/ui/RevealHeading";
import { ChaosScene } from "@/components/three/lazy";
import { gsap } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import { useReducedMotion } from "@/hooks/useQuality";
import { VALUE } from "@/content/copy";

/**
 * Pinned scroll story. The wrapper is tall; the stage inside it is `sticky`.
 * One ScrollTrigger drives both the 3D swarm (via `progress`) and the DOM text
 * timeline, so words and 3D stay perfectly in sync, forwards and backwards.
 */
export default function ValueProposition() {
  const wrapper = useRef<HTMLElement>(null);
  const intro = useRef<HTMLDivElement>(null);
  const l1 = useRef<HTMLParagraphElement>(null);
  const l2 = useRef<HTMLParagraphElement>(null);
  const l3 = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const progress = useRef(reduced ? 1 : 0);

  useIsoLayoutEffect(() => {
    const root = wrapper.current;
    if (!root) return;

    if (reduced) {
      progress.current = 1;
      return;
    }

    const ctx = gsap.context(() => {
      const strike = (el: HTMLElement | null) => el?.querySelector<HTMLElement>("[data-strike]") ?? null;

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.6,
          onUpdate: (self) => {
            progress.current = self.progress;
          },
          onRefresh: (self) => {
            progress.current = self.progress;
          },
        },
      });

      const enter = { opacity: 0, y: 46, filter: "blur(14px)" };
      const shown = { opacity: 1, y: 0, filter: "blur(0px)", ease: "power2.out" };

      tl.fromTo(intro.current, { opacity: 1, y: 0, filter: "blur(0px)" }, { opacity: 0, y: -90, filter: "blur(14px)", duration: 0.1, ease: "power1.in" }, 0.2);

      tl.fromTo(l1.current, enter, { ...shown, duration: 0.08 }, 0.3);
      tl.to(strike(l1.current), { "--s": "100%", duration: 0.07, ease: "power2.inOut" }, 0.42);
      tl.to(l1.current!.querySelector("[data-text]"), { color: "#a39382", duration: 0.07 }, 0.42);

      tl.fromTo(l2.current, enter, { ...shown, duration: 0.08 }, 0.5);
      tl.to(strike(l2.current), { "--s": "100%", duration: 0.07, ease: "power2.inOut" }, 0.62);
      tl.to(l2.current!.querySelector("[data-text]"), { color: "#a39382", duration: 0.07 }, 0.62);

      tl.fromTo(l3.current, { ...enter, scale: 0.93 }, { ...shown, scale: 1, duration: 0.1 }, 0.74);
      tl.to(l3.current, { "--glow": 1, duration: 0.08, ease: "power2.out" }, 0.82);
      tl.to({}, { duration: 0.1 }, 0.9); // hold on the finished dashboard
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  const hidden = reduced ? "" : "opacity-0";

  return (
    <section
      ref={wrapper}
      id="value"
      aria-labelledby="value-title"
      className="relative"
      style={reduced ? undefined : { height: "440vh" }}
    >
      <div className={`${reduced ? "relative min-h-[100svh] py-28" : "sticky top-0 h-[100svh]"} overflow-hidden`}>
        {!reduced && <ChaosScene progress={progress} />}

        <div className="relative z-10 mx-auto h-full w-full max-w-7xl px-5 pt-28 sm:px-8 lg:pt-32">
          <div ref={intro} className="max-w-2xl lg:max-w-[50%]">
            <RevealHeading
              as="h2"
              id="value-title"
              text={VALUE.headline}
              highlight={VALUE.headlineHighlight}
              className="font-display text-[clamp(2.1rem,4.7vw,4.3rem)] font-bold leading-[1.02] text-espresso"
            />
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{VALUE.body}</p>
          </div>

          <div
            className={`${
              reduced ? "mt-14" : "absolute inset-x-5 top-28 sm:inset-x-8 lg:top-1/2 lg:-translate-y-1/2"
            } flex max-w-xl flex-col gap-4 sm:gap-5 lg:max-w-[46%]`}
          >
            {[VALUE.closing[0], VALUE.closing[1]].map((line, i) => (
              <p
                key={line}
                ref={i === 0 ? l1 : l2}
                className={`font-display text-[clamp(1.55rem,3vw,2.7rem)] font-semibold leading-[1.15] ${hidden}`}
              >
                <span
                  data-text
                  data-strike
                  className="strike text-text"
                  style={reduced ? ({ ["--s" as string]: "100%", color: "#a39382" } as React.CSSProperties) : undefined}
                >
                  {line}
                </span>
              </p>
            ))}
            <p
              ref={l3}
              className={`lit-line font-display text-[clamp(2rem,4.2vw,3.8rem)] font-bold leading-[1.05] ${hidden}`}
              style={reduced ? ({ ["--glow" as string]: 1 } as React.CSSProperties) : undefined}
            >
              <span className="gradient-text">{VALUE.closing[2]}</span>
            </p>
          </div>
        </div>

        {/* reduced motion: the finished dashboard sits under the text on phones, behind it on desktop */}
        {reduced && (
          <div className="relative mt-12 h-[56svh] lg:absolute lg:inset-0 lg:mt-0 lg:h-auto">
            <ChaosScene progress={progress} />
          </div>
        )}
      </div>
    </section>
  );
}
