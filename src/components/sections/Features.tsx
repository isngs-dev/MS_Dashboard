"use client";

import { useRef, type ComponentType } from "react";
import RevealHeading from "@/components/ui/RevealHeading";
import FeatureCard from "@/components/features/FeatureCard";
import StackedLayers from "@/components/features/visuals/StackedLayers";
import WidgetRearrange from "@/components/features/visuals/WidgetRearrange";
import TrendLine from "@/components/features/visuals/TrendLine";
import BarsCounting from "@/components/features/visuals/BarsCounting";
import ReportSlide from "@/components/features/visuals/ReportSlide";
import GaugeNeedle from "@/components/features/visuals/GaugeNeedle";
import FilterChips from "@/components/features/visuals/FilterChips";
import LivePulse from "@/components/features/visuals/LivePulse";
import TableToChart from "@/components/features/visuals/TableToChart";
import PuzzleSnap from "@/components/features/visuals/PuzzleSnap";
import type { VisualProps } from "@/components/features/visuals/shared";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIsoLayoutEffect } from "@/hooks/useIsoLayoutEffect";
import { FEATURES } from "@/content/copy";

type CardConfig = {
  Visual: ComponentType<VisualProps>;
  className: string;
  layout: "stack" | "wide-md" | "wide-lg";
  highlight?: boolean;
};

/**
 * Bento placement on a 6-column grid (lg): 3 / 2 / 3 / 2 cards per row,
 * with card 10 the wide, highlighted finale. Tablets collapse to 2 columns.
 */
const CARDS: CardConfig[] = [
  { Visual: StackedLayers, className: "lg:col-span-2", layout: "stack" },
  { Visual: WidgetRearrange, className: "lg:col-span-2", layout: "stack" },
  { Visual: TrendLine, className: "lg:col-span-2", layout: "stack" },
  { Visual: BarsCounting, className: "lg:col-span-3", layout: "wide-lg" },
  { Visual: ReportSlide, className: "lg:col-span-3", layout: "wide-lg" },
  { Visual: GaugeNeedle, className: "lg:col-span-2", layout: "stack" },
  { Visual: FilterChips, className: "lg:col-span-2", layout: "stack" },
  { Visual: LivePulse, className: "lg:col-span-2", layout: "stack" },
  { Visual: TableToChart, className: "md:col-span-2 lg:col-span-2", layout: "stack" },
  { Visual: PuzzleSnap, className: "md:col-span-2 lg:col-span-4", layout: "wide-md", highlight: true },
];

export default function Features() {
  const root = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = el.querySelectorAll<HTMLElement>("[data-card]");

    if (reduced) {
      gsap.set(cards, { opacity: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      // staggered 3D flip / rise as cards enter the viewport
      ScrollTrigger.batch(cards, {
        start: "top 90%",
        once: true,
        batchMax: 3,
        interval: 0.12,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { opacity: 0, y: 110, rotateX: -58, scale: 0.92, transformPerspective: 1100, transformOrigin: "50% 100%" },
            {
              opacity: 1,
              y: 0,
              rotateX: 0,
              scale: 1,
              duration: 1.2,
              ease: "power3.out",
              stagger: 0.14,
              clearProps: "transform",
            },
          ),
      });

      // oversized outline numbers drift against the scroll for depth
      cards.forEach((card) => {
        const num = card.querySelector<HTMLElement>("[data-parallax]");
        if (!num) return;
        gsap.fromTo(
          num,
          { y: 34 },
          {
            y: -34,
            ease: "none",
            scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="features" aria-labelledby="features-title" className="relative px-5 py-28 sm:px-8 sm:py-36">
      {/* shared gradient for the outlined numbers */}
      <svg aria-hidden width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="num-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2f66d4" stopOpacity="0.8" />
            <stop offset="0.5" stopColor="#9c8167" stopOpacity="0.55" />
            <stop offset="1" stopColor="#c98f72" stopOpacity="0.75" />
          </linearGradient>
        </defs>
      </svg>

      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/4 -z-0 mx-auto h-[60%] max-w-5xl rounded-full bg-[radial-gradient(closest-side,rgb(224_178_142/0.3),transparent)] blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <header className="mx-auto max-w-4xl text-center">
          <RevealHeading
            as="h2"
            id="features-title"
            text={FEATURES.headline}
            highlight={FEATURES.headlineHighlight}
            className="font-display text-[clamp(2.1rem,4.6vw,4.2rem)] font-bold leading-[1.04] text-espresso"
          />
          <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted sm:text-lg">{FEATURES.intro}</p>
        </header>

        <ul className="mt-16 grid grid-cols-1 gap-5 sm:mt-20 md:grid-cols-2 lg:grid-cols-6 lg:gap-6">
          {FEATURES.items.map((item, i) => {
            const cfg = CARDS[i];
            return (
              <li key={item.n} className={`contents`}>
                <FeatureCard n={item.n} title={item.title} body={item.body} Visual={cfg.Visual} className={cfg.className} layout={cfg.layout} highlight={cfg.highlight} />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
