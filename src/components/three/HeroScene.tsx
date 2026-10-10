"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import DashboardModel from "./DashboardModel";
import Particles from "./Particles";
import StaticDashboard from "./StaticDashboard";
import { HeroCtx, type HeroState } from "./heroState";
import { sampleDashboardTargets, sampleEdgeStarts } from "./dashboardLayout";
import { clamp, damp, mulberry32, seg } from "./math";
import { pointer } from "./pointer";
import { useQualitySettings } from "@/hooks/useQuality";

const INTRO_DELAY = 0.25;
const INTRO_SECONDS = 4.8;

function HeroWorld() {
  const { quality, heroParticles, ambient, detail } = useQualitySettings();
  const still = quality === "static";
  const state = useRef<HeroState>({ p: still ? 1 : 0, t: 0, doneAt: 0, px: 0, py: 0, still });
  const rig = useRef<THREE.Group>(null);
  const world = useRef<THREE.Group>(null);
  const spread = useRef(1);

  useEffect(() => {
    state.current.still = still;
    if (still) state.current.p = 1;
  }, [still]);

  const { starts, targets, ambientStarts } = useMemo(() => {
    const rand = mulberry32(99);
    const a = new Float32Array(ambient * 3);
    for (let i = 0; i < ambient; i++) {
      a[i * 3] = (rand() - 0.5) * 22;
      a[i * 3 + 1] = (rand() - 0.5) * 12;
      a[i * 3 + 2] = -4 + rand() * 9;
    }
    return {
      starts: sampleEdgeStarts(heroParticles),
      targets: sampleDashboardTargets(heroParticles),
      ambientStarts: a,
    };
  }, [heroParticles, ambient]);

  useFrame((st, dt) => {
    const s = state.current;
    dt = Math.min(dt, 0.1);
    s.t += dt;
    if (!s.still) {
      const wasDone = s.p >= 1;
      s.p = clamp((s.t - INTRO_DELAY) / INTRO_SECONDS);
      if (!wasDone && s.p >= 1) s.doneAt = s.t;
    }

    // pointer (desktop) with a slow autonomous sway so touch devices still feel alive
    const idleX = s.still ? 0 : Math.sin(s.t * 0.33) * 0.35;
    const idleY = s.still ? 0 : Math.cos(s.t * 0.27) * 0.25;
    const tx = pointer.active ? pointer.x : idleX;
    const ty = pointer.active ? pointer.y : idleY;
    s.px = damp(s.px, tx, 3.2, dt);
    s.py = damp(s.py, ty, 3.2, dt);

    const { viewport, size } = st;
    const wide = size.width >= 1024;
    const base = wide ? (viewport.width * 0.5) / 8.4 : (viewport.width * 1.05) / 8.4;
    const scale = clamp(base, 0.3, 1.15);
    spread.current = Math.max(1, (viewport.width * 0.66) / (13 * scale));

    const rg = rig.current;
    if (rg) {
      rg.scale.setScalar(scale);
      rg.position.set(wide ? viewport.width * 0.2 : 0, wide ? -0.1 : -viewport.height * 0.2, 0);
      rg.rotation.y = 0.34 + s.px * 0.28;
      rg.rotation.x = -0.16 - s.py * 0.17;
      rg.rotation.z = -0.025 + s.px * 0.02;
    }
    const wd = world.current;
    if (wd) {
      wd.position.x = -s.px * 0.35;
      wd.position.y = -s.py * 0.2;
    }
  });

  return (
    <HeroCtx.Provider value={state}>
      <group ref={world}>
        <Particles
          starts={ambientStarts}
          targets={ambientStarts}
          getProgress={() => seg(state.current.t, 0.3, 2.8)}
          size={0.6}
          drift={9}
          settle={0.55}
          colors={["#2f66d4", "#6b97e8", "#9c8167"]}
          seed={11}
        />
      </group>
      <group ref={rig}>
        <DashboardModel detail={detail} />
        <Particles
          starts={starts}
          targets={targets}
          getProgress={() => seg(state.current.p, 0, 0.82)}
          getSpread={() => spread.current}
          size={quality === "low" ? 1.3 : 1}
          settle={0.4}
        />
      </group>
    </HeroCtx.Provider>
  );
}

export default function HeroScene() {
  return (
    <SceneCanvas
      eager
      className="absolute inset-0"
      camera={{ position: [0, 0, 11], fov: 38 }}
      fallback={<StaticDashboard className="absolute inset-0" />}
    >
      <HeroWorld />
    </SceneCanvas>
  );
}
