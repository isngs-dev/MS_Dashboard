"use client";

import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { glassFragment, glassVertex } from "./shaders";

type Props = {
  width: number;
  height: number;
  radius?: number;
  /** glass fill, top-left to bottom-right */
  tintA?: string;
  tintB?: string;
  /** colour of the thin edge line */
  border?: string;
  fill?: number;
  edge?: number;
  /** strength of the soft drop shadow (0 = none) */
  shadow?: number;
  position?: [number, number, number];
  /** Per-frame opacity (0..1). Defaults to fully visible. */
  getOpacity?: () => number;
  renderOrder?: number;
};

/** Frosted white glass rounded-rect panel (SDF shader: crisp edge, soft shadow, moving sheen). */
export default function GlassPanel({
  width,
  height,
  radius = 0.16,
  tintA = "#ffffff",
  tintB = "#f0e7da",
  border = "#d6c3ad",
  fill = 0.8,
  edge = 0.8,
  shadow = 0.34,
  position = [0, 0, 0],
  getOpacity,
  renderOrder = 0,
}: Props) {
  // room around the panel for the shadow to fade out; tiny elements need less
  const pad = Math.min(0.5, 0.4 * Math.min(width, height) + 0.1);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: glassVertex,
        fragmentShader: glassFragment,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: {
          uSize: { value: new THREE.Vector2(width, height) },
          uPad: { value: pad },
          uRadius: { value: radius },
          uOpacity: { value: getOpacity ? 0 : 1 },
          uTime: { value: 0 },
          uFill: { value: fill },
          uEdge: { value: edge },
          uShadow: { value: shadow },
          uTintA: { value: new THREE.Color(tintA) },
          uTintB: { value: new THREE.Color(tintB) },
          uBorder: { value: new THREE.Color(border) },
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height, pad, radius, tintA, tintB, border, fill, edge, shadow],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    if (getOpacity) material.uniforms.uOpacity.value = getOpacity();
  });

  return (
    <mesh position={position} material={material} renderOrder={renderOrder}>
      <planeGeometry args={[width + pad * 2, height + pad * 2]} />
    </mesh>
  );
}
