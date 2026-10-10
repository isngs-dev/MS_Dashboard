"use client";

import { createContext, useContext, type MutableRefObject } from "react";

/** Mutable per-frame state shared by every hero mesh (kept out of React state on purpose). */
export type HeroState = {
  /** intro timeline progress 0..1 */
  p: number;
  /** seconds since the scene mounted */
  t: number;
  /** scene time at which the intro finished (looping animations continue from here) */
  doneAt: number;
  /** smoothed pointer -1..1 */
  px: number;
  py: number;
  /** true when rendering a still frame (reduced motion) */
  still: boolean;
};

export const HeroCtx = createContext<MutableRefObject<HeroState> | null>(null);

export function useHeroState() {
  const ctx = useContext(HeroCtx);
  if (!ctx) throw new Error("useHeroState must be used inside <HeroCtx.Provider>");
  return ctx;
}
