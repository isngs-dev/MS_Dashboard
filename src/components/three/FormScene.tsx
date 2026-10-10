"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import DashboardModel from "./DashboardModel";
import Particles from "./Particles";
import { HeroCtx, type HeroState } from "./heroState";
import { clamp, damp, mulberry32 } from "./math";
import { pointer } from "./pointer";
import { useQualitySettings } from "@/hooks/useQuality";

/** Drifting particles + a ghosted, slowly turning 3D dashboard behind the form. */
function FormWorld() {
  const { quality, ambient } = useQualitySettings();
  const still = quality === "static";
  const state = useRef<HeroState>({ p: 1, t: 0, doneAt: 0, px: 0, py: 0, still });
  const rig = useRef<THREE.Group>(null);

  const field = useMemo(() => {
    const rand = mulberry32(808);
    const n = Math.round(ambient * 1.1);
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = (rand() - 0.5) * 26;
      a[i * 3 + 1] = (rand() - 0.5) * 14;
      a[i * 3 + 2] = -6 + rand() * 11;
    }
    return a;
  }, [ambient]);

  useFrame((st, dt) => {
    const s = state.current;
    s.t += dt;
    const tx = pointer.active ? pointer.x : Math.sin(s.t * 0.25) * 0.4;
    const ty = pointer.active ? pointer.y : Math.cos(s.t * 0.2) * 0.25;
    s.px = damp(s.px, still ? 0 : tx, 2.4, dt);
    s.py = damp(s.py, still ? 0 : ty, 2.4, dt);

    const { viewport, size } = st;
    const wide = size.width >= 1024;
    const scale = clamp((viewport.width * (wide ? 0.5 : 1.0)) / 8.4, 0.35, 1.3);
    const rg = rig.current;
    if (rg) {
      rg.scale.setScalar(scale);
      rg.position.set(wide ? viewport.width * 0.2 : 0, wide ? 0.1 : -viewport.height * 0.14, -2);
      rg.rotation.y = 0.3 + (still ? 0 : Math.sin(s.t * 0.3) * 0.18) + s.px * 0.2;
      rg.rotation.x = -0.14 - s.py * 0.12;
    }
  });

  return (
    <HeroCtx.Provider value={state}>
      <group ref={rig}>
        <DashboardModel detail={false} />
      </group>
      <Particles starts={field} targets={field} getProgress={() => 1} size={0.6} drift={11} settle={0.7} seed={17} />
    </HeroCtx.Provider>
  );
}

export default function FormScene() {
  return (
    <SceneCanvas className="absolute inset-0" camera={{ position: [0, 0, 11], fov: 38 }} rootMargin="700px" maxFps={30} maxDpr={1}>
      <FormWorld />
    </SceneCanvas>
  );
}
