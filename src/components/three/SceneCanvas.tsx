"use client";

import { Component, useEffect, useRef, useState, useSyncExternalStore, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useThree, type CanvasProps } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { useQualitySettings } from "@/hooks/useQuality";
import { hasWebGL } from "@/lib/gpu";
import { attachPointer } from "./pointer";

const noopSubscribe = () => () => {};

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[3D scene] failed, showing fallback", error, info.componentStack);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Re-renders a demand-mode canvas at a fixed rate (used for faint background scenes). */
function FrameLimiter({ fps }: { fps: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const id = window.setInterval(() => invalidate(), 1000 / fps);
    return () => window.clearInterval(id);
  }, [fps, invalidate]);
  return null;
}

type Props = {
  children: ReactNode;
  className?: string;
  camera?: CanvasProps["camera"];
  /** Mount immediately instead of waiting until the section nears the viewport. */
  eager?: boolean;
  /** How far outside the viewport (px) before the canvas starts mounting. */
  rootMargin?: string;
  /** Rendered while the canvas is not mounted yet or when WebGL is unavailable. */
  fallback?: ReactNode;
  /** Tone mapping off (flat) keeps shader colours exact. Turn off for PBR scenes. */
  flat?: boolean;
  /** Cap the render rate (e.g. 30 for a faint backdrop). Omit for full speed. */
  maxFps?: number;
  /** Cap the pixel ratio below the quality tier's own limit. */
  maxDpr?: number;
};

/**
 * Shared shell for every 3D canvas on the page:
 *  - lazy mount via IntersectionObserver (keeps first load light)
 *  - pauses rendering while off-screen
 *  - resolution follows a per-tier pixel budget, so big screens and weak GPUs render fewer pixels
 *  - adaptive resolution on top (PerformanceMonitor) if the frame rate still drops
 *  - static "demand" rendering for reduced motion
 *  - WebGL feature check + error boundary with CSS fallback
 */
export default function SceneCanvas({
  children,
  className,
  camera = { position: [0, 0, 11], fov: 38 },
  eager = false,
  rootMargin = "600px",
  fallback = null,
  flat = true,
  maxFps,
  maxDpr,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const { quality, pixelBudget, maxDpr: tierMaxDpr, antialias } = useQualitySettings();
  const [mounted, setMounted] = useState(eager);
  const [visible, setVisible] = useState(eager);
  const [area, setArea] = useState(1280 * 720); // css px of the canvas container
  const [factor, setFactor] = useState(1);
  // Bumped whenever the tab becomes visible again so the frame-rate monitor starts from a
  // clean slate: a hidden tab stops requestAnimationFrame, which would otherwise read as
  // "the GPU is struggling" and permanently drop the resolution.
  const [monitorEpoch, setMonitorEpoch] = useState(0);
  // true on the server and until the client can check; then the real answer
  const supported = useSyncExternalStore(noopSubscribe, hasWebGL, () => true);

  useEffect(() => {
    attachPointer();
    const onVisibility = () => {
      if (document.visibilityState === "visible") setMonitorEpoch((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Two observers: one with a generous margin mounts the canvas early (so it is
  // ready before the user arrives), one with a tight margin runs the render loop
  // only while the scene is actually on, or about to be on, screen.
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const mountIO = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setMounted(true);
      },
      { rootMargin },
    );
    const runIO = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "80px" });
    // track the container size; ignore tiny changes so the resolution does not thrash
    const sizeRO = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const next = Math.max(1, width * height);
      setArea((prev) => (Math.abs(next - prev) / prev > 0.1 ? next : prev));
    });
    mountIO.observe(el);
    runIO.observe(el);
    sizeRO.observe(el);
    return () => {
      mountIO.disconnect();
      runIO.disconnect();
      sizeRO.disconnect();
    };
  }, [rootMargin]);

  // Resolution: device ratio, capped by the tier, capped again by the pixel budget
  // (a 4K monitor gets a lower ratio than a laptop), then scaled by the adaptive factor.
  const deviceDpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
  const budgetDpr = Math.sqrt(pixelBudget / area);
  const baseDpr = Math.min(deviceDpr, tierMaxDpr, maxDpr ?? Infinity, budgetDpr);
  const dpr = Math.max(0.7, Math.round(baseDpr * (0.65 + 0.35 * factor) * 20) / 20);

  const limited = !!maxFps && quality !== "static";
  const frameloop: CanvasProps["frameloop"] =
    quality === "static" ? "demand" : !visible ? "never" : limited ? "demand" : "always";

  return (
    <div ref={host} className={className} data-quality={quality}>
      {mounted && supported ? (
        <SceneBoundary fallback={fallback}>
          <Canvas
            frameloop={frameloop}
            dpr={dpr}
            camera={camera}
            flat={flat}
            gl={{ antialias, alpha: true, powerPreference: "high-performance", stencil: false }}
            style={{ pointerEvents: "none" }}
            aria-hidden
          >
            <PerformanceMonitor
              key={monitorEpoch}
              factor={factor}
              step={0.25}
              ms={200}
              iterations={6}
              threshold={0.6}
              flipflops={8}
              bounds={(refresh) => (refresh > 100 ? [70, 100] : [46, 57])}
              onChange={({ factor: f }) => setFactor(f)}
            >
              {limited && <FrameLimiter fps={maxFps} />}
              {children}
            </PerformanceMonitor>
          </Canvas>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  );
}
