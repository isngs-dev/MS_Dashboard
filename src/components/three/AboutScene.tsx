"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import SceneCanvas from "./SceneCanvas";
import NetworkGlobe from "./NetworkGlobe";
import Particles from "./Particles";
import { clamp, damp, easeOutBack, mulberry32, seg } from "./math";
import { pointer } from "./pointer";
import { useQualitySettings } from "@/hooks/useQuality";

const SIZE = 4.1;
const DEPTH = 0.95;
const GAP = 0.2;

/** The giant "25+": real extruded geometry in the brand font, swapped digit by digit while counting. */
function GiantNumber({ count }: { count: MutableRefObject<{ value: number }> }) {
  const font = useLoader(FontLoader, "/fonts/space-grotesk-bold.typeface.json");
  const tens = useRef<THREE.Mesh>(null);
  const ones = useRef<THREE.Mesh>(null);
  const plus = useRef<THREE.Mesh>(null);
  const shown = useRef({ t: -1, o: -1 });

  const { glyphs, slots, capHeight } = useMemo(() => {
    const map: Record<string, { geo: THREE.BufferGeometry; w: number }> = {};
    for (const ch of "0123456789+") {
      const geo = new TextGeometry(ch, {
        font,
        size: SIZE,
        depth: DEPTH,
        curveSegments: 10,
        bevelEnabled: true,
        bevelThickness: 0.09,
        bevelSize: 0.06,
        bevelSegments: 5,
      });
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const w = bb.max.x - bb.min.x;
      // centre each glyph horizontally in its slot and on the z axis; keep its natural baseline
      geo.translate(-(bb.min.x + w / 2), 0, -DEPTH / 2);
      map[ch] = { geo, w };
    }
    const total = map["2"].w + map["5"].w + map["+"].w + GAP * 2;
    const x0 = -total / 2;
    const slots = {
      tens: x0 + map["2"].w / 2,
      ones: x0 + map["2"].w + GAP + map["5"].w / 2,
      plus: x0 + map["2"].w + GAP + map["5"].w + GAP + map["+"].w / 2,
    };
    return { glyphs: map, slots, capHeight: SIZE * 0.7 };
  }, [font]);

  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f6e7d2",
        emissive: "#8a6a4c",
        emissiveIntensity: 0.14,
        metalness: 1,
        roughness: 0.24,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        iridescence: 0.45,
        iridescenceIOR: 1.45,
        iridescenceThicknessRange: [180, 620],
        envMapIntensity: 1.5,
      }),
    [],
  );

  useEffect(() => {
    // new glyph geometries (first mount, font reload, hot reload): force a swap on the next frame
    shown.current = { t: -1, o: -1 };
    return () => {
      Object.values(glyphs).forEach((g) => g.geo.dispose());
    };
  }, [glyphs]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame(() => {
    const v = clamp(count.current.value, 0, 25);
    const n = Math.round(v);
    const t = Math.floor(n / 10);
    const o = n % 10;

    if (shown.current.t !== t && tens.current) {
      shown.current.t = t;
      tens.current.visible = t > 0;
      if (t > 0) tens.current.geometry = glyphs[String(t)].geo;
    }
    if (shown.current.o !== o && ones.current) {
      shown.current.o = o;
      ones.current.geometry = glyphs[String(o)].geo;
    }
    if (plus.current) {
      const s = Math.max(0.0001, easeOutBack(seg(v, 21, 25)));
      plus.current.scale.setScalar(s);
      plus.current.rotation.z = (1 - clamp(s)) * -1.4;
    }
  });

  // centre the cap height vertically around y = 0
  return (
    <group position={[0, -capHeight / 2, 0]}>
      <mesh ref={tens} material={material} position={[slots.tens, 0, 0]} geometry={glyphs["0"].geo} visible={false} />
      <mesh ref={ones} material={material} position={[slots.ones, 0, 0]} geometry={glyphs["0"].geo} />
      <mesh ref={plus} material={material} position={[slots.plus, 0, 0]} geometry={glyphs["+"].geo} scale={0.0001} />
    </group>
  );
}

function StudioLights() {
  // Chrome only looks like chrome when it has contrast to reflect: a dark warm base with
  // bright strips in front of the camera and soft warm/blue lights around it.
  return (
    <Environment resolution={512} frames={1}>
      <color attach="background" args={["#a08b78"]} />
      <Lightformer form="rect" intensity={6} color="#ffffff" position={[0, 7, -3]} scale={[16, 3, 1]} />
      <Lightformer form="rect" intensity={4} color="#ffd9b8" position={[-8, 1, 1]} rotation-y={Math.PI / 2} scale={[10, 6, 1]} />
      <Lightformer form="rect" intensity={4} color="#c9dcff" position={[8, -1, 1]} rotation-y={-Math.PI / 2} scale={[10, 6, 1]} />
      <Lightformer form="ring" intensity={3} color="#f3c9a2" position={[0, -6, 3]} scale={6} />
      {/* front strips: what the flat faces of the numerals actually reflect */}
      <Lightformer form="rect" intensity={3.4} color="#fff0de" position={[-5.5, 0, 9]} scale={[2.6, 14, 1]} />
      <Lightformer form="rect" intensity={5} color="#ffffff" position={[0, 1, 10]} scale={[3.4, 14, 1]} />
      <Lightformer form="rect" intensity={3.4} color="#d6e4ff" position={[5.5, 0, 9]} scale={[2.6, 14, 1]} />
    </Environment>
  );
}

function AboutWorld({ count }: { count: MutableRefObject<{ value: number }> }) {
  const { quality, globeNodes, ambient } = useQualitySettings();
  const still = quality === "static";
  const rig = useRef<THREE.Group>(null);
  const globeRig = useRef<THREE.Group>(null);
  const smooth = useRef({ px: 0, py: 0, t: 0 });

  const dust = useMemo(() => {
    const rand = mulberry32(404);
    const n = Math.round(ambient * 0.8);
    const a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      a[i * 3] = (rand() - 0.5) * 24;
      a[i * 3 + 1] = (rand() - 0.5) * 12;
      a[i * 3 + 2] = -6 + rand() * 10;
    }
    return a;
  }, [ambient]);

  useFrame((st, dt) => {
    const s = smooth.current;
    s.t += dt;
    const tx = pointer.active ? pointer.x : Math.sin(s.t * 0.3) * 0.4;
    const ty = pointer.active ? pointer.y : Math.cos(s.t * 0.25) * 0.25;
    s.px = damp(s.px, still ? 0 : tx, 2.6, dt);
    s.py = damp(s.py, still ? 0 : ty, 2.6, dt);

    const { viewport, size } = st;
    const wide = size.width >= 900;
    const scale = clamp((viewport.width * (wide ? 0.62 : 0.94)) / 8.6, 0.3, 1.25);

    if (rig.current) {
      rig.current.scale.setScalar(scale);
      // slow swing + mouse reaction
      rig.current.rotation.y = (still ? 0.22 : Math.sin(s.t * 0.45) * 0.34) + s.px * 0.5;
      rig.current.rotation.x = -s.py * 0.3 + (still ? 0 : Math.sin(s.t * 0.37) * 0.05);
      rig.current.position.y = still ? 0 : Math.sin(s.t * 0.8) * 0.08;
    }
    if (globeRig.current) {
      const gs = clamp((Math.min(viewport.width, viewport.height * 1.5) * 0.5) / 3.9, 0.35, 1.5);
      globeRig.current.scale.setScalar(gs);
      globeRig.current.position.x = -s.px * 0.6;
      globeRig.current.position.y = -s.py * 0.35;
    }
  });

  return (
    <>
      <StudioLights />
      <group ref={globeRig} position={[0, 0, -3]}>
        <NetworkGlobe nodes={globeNodes} radius={3.7} speed={still ? 0 : 1} />
      </group>
      <group ref={rig}>
        <GiantNumber count={count} />
      </group>
      <Particles starts={dust} targets={dust} getProgress={() => 1} size={0.55} drift={10} settle={0.5} seed={9} />
    </>
  );
}

export default function AboutScene({ count }: { count: MutableRefObject<{ value: number }> }) {
  return (
    <SceneCanvas
      className="absolute inset-0"
      camera={{ position: [0, 0, 12], fov: 38 }}
      flat={false}
      rootMargin="700px"
    >
      <AboutWorld count={count} />
    </SceneCanvas>
  );
}
