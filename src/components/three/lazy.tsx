"use client";

import dynamic from "next/dynamic";

/**
 * Every 3D scene is code-split and client-only, so three.js / R3F never touch
 * the initial JS bundle or server render. Scenes additionally wait for their
 * section to approach the viewport before mounting a WebGL context.
 */
export const HeroScene = dynamic(() => import("./HeroScene"), { ssr: false, loading: () => null });
export const ChaosScene = dynamic(() => import("./ChaosScene"), { ssr: false, loading: () => null });
export const AboutScene = dynamic(() => import("./AboutScene"), { ssr: false, loading: () => null });
export const FormScene = dynamic(() => import("./FormScene"), { ssr: false, loading: () => null });
