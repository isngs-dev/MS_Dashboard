"use client";

import RevealHeading from "@/components/ui/RevealHeading";
import CtaButton from "@/components/ui/CtaButton";
import { HeroScene } from "@/components/three/lazy";
import { HERO } from "@/content/copy";

/** Animated gradient mesh + soft light beams behind the 3D scene (two transform-only layers). */
function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="hero-mesh" />
      <div className="hero-beams" />
    </div>
  );
}

export default function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative flex min-h-[100svh] items-start overflow-hidden px-5 pt-32 sm:px-8 lg:items-center lg:pt-24"
    >
      <HeroBackdrop />
      <HeroScene />
      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="max-w-2xl lg:max-w-[46%]">
          <RevealHeading
            as="h1"
            id="hero-title"
            text={HERO.headline}
            highlight={HERO.headlineHighlight}
            trigger="load"
            delay={0.35}
            className="font-display text-[clamp(2.6rem,5.6vw,5.4rem)] font-bold leading-[0.98] text-espresso"
          />
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">{HERO.subheadline}</p>
          <div className="mt-10">
            <CtaButton>{HERO.cta}</CtaButton>
          </div>
        </div>
      </div>
    </section>
  );
}
