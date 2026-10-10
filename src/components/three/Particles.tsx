"use client";

import { useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "./math";
import { particleFragment, particleVertex } from "./shaders";

type Props = {
  starts: Float32Array;
  targets: Float32Array;
  /** Called every frame; return 0..1 assembly progress. */
  getProgress: () => number;
  /** Multiplier on how far the start positions are pushed out (for wide screens). */
  getSpread?: () => number;
  size?: number;
  /** Amplitude multiplier for the idle wander once settled. */
  drift?: number;
  /** Alpha multiplier once assembled (0 hides the particles after they land). */
  settle?: number;
  colors?: [string, string, string];
  seed?: number;
};

/** GPU-animated particle cloud that streams from `starts` into `targets`. */
export default function Particles({
  starts,
  targets,
  getProgress,
  getSpread,
  size = 1,
  drift = 1,
  settle = 0.45,
  colors = ["#2f66d4", "#6b97e8", "#9c8167"],
  seed = 3,
}: Props) {
  const count = targets.length / 3;
  const gl = useThree((s) => s.gl);

  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(seed);
    const rands = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      rands[i * 4] = rand();
      rands[i * 4 + 1] = 0.55 + rand() * 0.9;
      rands[i * 4 + 2] = rand();
      rands[i * 4 + 3] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(targets, 3));
    g.setAttribute("aStart", new THREE.BufferAttribute(starts, 3));
    g.setAttribute("aTarget", new THREE.BufferAttribute(targets, 3));
    g.setAttribute("aRand", new THREE.BufferAttribute(rands, 4));

    const m = new THREE.ShaderMaterial({
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uProgress: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: 1 },
        uSize: { value: size },
        uSettle: { value: settle },
        uSpread: { value: 1 },
        uDrift: { value: drift },
        uColorA: { value: new THREE.Color(colors[0]) },
        uColorB: { value: new THREE.Color(colors[1]) },
        uColorC: { value: new THREE.Color(colors[2]) },
      },
    });
    return { geometry: g, material: m };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, starts, targets, seed]);

  useFrame((state) => {
    const u = material.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uProgress.value = getProgress();
    u.uPixelRatio.value = gl.getPixelRatio();
    u.uSize.value = size;
    u.uSettle.value = settle;
    u.uDrift.value = drift;
    if (getSpread) u.uSpread.value = getSpread();
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
