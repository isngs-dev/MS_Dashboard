"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import SceneCanvas from "./SceneCanvas";
import DashboardModel from "./DashboardModel";
import Particles from "./Particles";
import StaticDashboard from "./StaticDashboard";
import { HeroCtx, type HeroState } from "./heroState";
import { ATLAS_COLS, ATLAS_ROWS, ATLAS_VARIANTS, createSheetAtlas } from "./sheetAtlas";
import { clamp, damp, mulberry32, seg } from "./math";
import { pointer } from "./pointer";
import { useQualitySettings } from "@/hooks/useQuality";

/* ------------------------------------------------------------------------ */
/* Shaders: the whole swarm is animated on the GPU from one progress value   */
/* ------------------------------------------------------------------------ */
const vertex = /* glsl */ `
  attribute vec3 aStart;
  attribute vec2 aEnd;
  attribute vec3 aRot;
  attribute vec3 aSpin;
  attribute vec4 aMisc;   // x delay, y fold direction, z atlas index, w seed
  attribute float aSize;  // chaos size multiplier

  uniform float uProgress;
  uniform float uTime;
  uniform vec3 uAnchorA;
  uniform vec3 uAnchorB;
  uniform vec2 uEndSize;
  uniform vec2 uEndTile;
  uniform float uScaleA;
  uniform float uMerge;

  varying vec2 vUv;
  varying vec3 vN;
  varying float vE;
  varying float vIdx;
  varying float vSeed;

  mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.,0.,0., 0.,c,s, 0.,-s,c); }
  mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.,-s, 0.,1.,0., s,0.,c); }
  mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c,s,0., -s,c,0., 0.,0.,1.); }
  float easeIO(float t){ return t < 0.5 ? 4.0*t*t*t : 1.0 - pow(-2.0*t + 2.0, 3.0) / 2.0; }

  void main() {
    float delay = aMisc.x * 0.5;
    float t = clamp((uProgress - delay) / 0.5, 0.0, 1.0);
    float e = easeIO(t);
    float mid = sin(e * 3.14159265);

    vec3 chaos = uAnchorA + aStart * uScaleA;
    chaos += vec3(
      sin(uTime * 0.55 + aMisc.w * 6.28),
      cos(uTime * 0.45 + aMisc.w * 9.4),
      sin(uTime * 0.35 + aMisc.w * 3.1)
    ) * 0.26 * uScaleA * (1.0 - e);

    vec3 endp = uAnchorB + vec3(aEnd * uEndSize, 0.0);
    vec3 pos = mix(chaos, endp, e);
    pos.y += mid * (0.5 + aMisc.w) * uScaleA;
    pos.z += mid * (1.4 + aMisc.w * 1.6) * uScaleA;

    vec3 rot = (aRot + aSpin * uTime) * (1.0 - e);
    rot.x += mid * aMisc.y * 1.1;
    rot.y += mid * aMisc.y * 0.9;

    vec3 p = position;
    float fold = mid * aMisc.y * 2.4;
    if (abs(fold) > 0.02) {
      float R = 1.0 / fold;
      float a = p.x * fold;
      p.x = R * sin(a);
      p.z += R * (1.0 - cos(a));
    }

    vec2 sc = mix(vec2(aSize * uScaleA), uEndTile, e) * (1.0 - 0.1 * uMerge);
    p.xy *= sc;
    p.z *= sc.x;

    mat3 R3 = rotZ(rot.z) * rotY(rot.y) * rotX(rot.x);
    vec3 world = pos + R3 * p;

    vN = R3 * vec3(0.0, 0.0, 1.0);
    vUv = uv;
    vE = e;
    vIdx = aMisc.z;
    vSeed = aMisc.w;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(world, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uAtlas;
  uniform vec2 uAtlasGrid;
  uniform float uMerge;

  varying vec2 vUv;
  varying vec3 vN;
  varying float vE;
  varying float vIdx;
  varying float vSeed;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    float idx = floor(vIdx + 0.5);
    float col = mod(idx, uAtlasGrid.x);
    float row = floor(idx / uAtlasGrid.x);
    vec2 uv = vec2((vUv.x + col) / uAtlasGrid.x, 1.0 - (row + 1.0 - vUv.y) / uAtlasGrid.y);
    vec3 tex = texture2D(uAtlas, uv).rgb;

    vec3 n = normalize(vN);
    float lit = 0.6 + 0.4 * abs(dot(n, normalize(vec3(0.3, 0.6, 0.8))));
    vec3 c = tex * lit;
    if (!gl_FrontFacing) c *= 0.7;

    float cool = smoothstep(0.55, 1.0, vE);
    c = mix(c, c * vec3(0.72, 0.84, 1.0), cool * 0.7);
    vec2 q = abs(vUv - 0.5) * 2.0;
    float edge = smoothstep(0.84, 1.0, max(q.x, q.y));
    c = mix(c, vec3(0.028, 0.133, 0.658), edge * cool * 0.9);

    float n2 = hash(floor(vUv * vec2(22.0, 28.0)) + vSeed * 17.0);
    if (n2 < uMerge) discard;

    gl_FragColor = vec4(c, 1.0);
    #include <colorspace_fragment>
  }
`;

/* ------------------------------------------------------------------------ */
/* The sheet swarm                                                           */
/* ------------------------------------------------------------------------ */
type SwarmUniforms = {
  uProgress: { value: number };
  uMerge: { value: number };
  uTime: { value: number };
  uAnchorA: { value: THREE.Vector3 };
  uAnchorB: { value: THREE.Vector3 };
  uEndSize: { value: THREE.Vector2 };
  uEndTile: { value: THREE.Vector2 };
  uScaleA: { value: number };
};

const SHEET_ASPECT = 1.25;

function SheetSwarm({ count, uniforms }: { count: number; uniforms: SwarmUniforms }) {
  const { geometry, material } = useMemo(() => {
    const rand = mulberry32(5150);
    const cols = Math.max(3, Math.round(Math.sqrt(count * 1.55)));
    const rows = Math.ceil(count / cols);

    const aStart = new Float32Array(count * 3);
    const aEnd = new Float32Array(count * 2);
    const aRot = new Float32Array(count * 3);
    const aSpin = new Float32Array(count * 3);
    const aMisc = new Float32Array(count * 4);
    const aSize = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // chaotic pile: a flattened blob of loose paper
      const ang = rand() * Math.PI * 2;
      const rad = Math.pow(rand(), 0.7);
      aStart[i * 3] = Math.cos(ang) * rad * 2.9;
      aStart[i * 3 + 1] = Math.sin(ang) * rad * 1.35;
      aStart[i * 3 + 2] = (rand() - 0.5) * 3.2;

      const c = i % cols;
      const r = Math.floor(i / cols);
      aEnd[i * 2] = (c + 0.5) / cols - 0.5;
      aEnd[i * 2 + 1] = 0.5 - (r + 0.5) / rows;

      aRot[i * 3] = (rand() - 0.5) * 2.2;
      aRot[i * 3 + 1] = (rand() - 0.5) * 2.2;
      aRot[i * 3 + 2] = (rand() - 0.5) * 3.4;
      aSpin[i * 3] = (rand() - 0.5) * 0.6;
      aSpin[i * 3 + 1] = (rand() - 0.5) * 0.7;
      aSpin[i * 3 + 2] = (rand() - 0.5) * 0.5;

      aMisc[i * 4] = rand();
      aMisc[i * 4 + 1] = rand() < 0.5 ? -1 : 1;
      aMisc[i * 4 + 2] = Math.floor(rand() * ATLAS_VARIANTS);
      aMisc[i * 4 + 3] = rand();
      aSize[i] = 0.82 + rand() * 0.5;
    }

    const g = new THREE.PlaneGeometry(1, SHEET_ASPECT, 16, 1);
    g.setAttribute("aStart", new THREE.InstancedBufferAttribute(aStart, 3));
    g.setAttribute("aEnd", new THREE.InstancedBufferAttribute(aEnd, 2));
    g.setAttribute("aRot", new THREE.InstancedBufferAttribute(aRot, 3));
    g.setAttribute("aSpin", new THREE.InstancedBufferAttribute(aSpin, 3));
    g.setAttribute("aMisc", new THREE.InstancedBufferAttribute(aMisc, 4));
    g.setAttribute("aSize", new THREE.InstancedBufferAttribute(aSize, 1));

    const m = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      side: THREE.DoubleSide,
      uniforms: {
        ...uniforms,
        uAtlas: { value: createSheetAtlas() },
        uAtlasGrid: { value: new THREE.Vector2(ATLAS_COLS, ATLAS_ROWS) },
      },
    });
    return { geometry: g, material: m };
  }, [count, uniforms]);

  useEffect(
    () => () => {
      geometry.dispose();
      (material.uniforms.uAtlas.value as THREE.Texture).dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return <instancedMesh args={[geometry, material, count]} frustumCulled={false} />;
}

/* ------------------------------------------------------------------------ */
/* World                                                                     */
/* ------------------------------------------------------------------------ */
function ChaosWorld({ progress }: { progress: MutableRefObject<number> }) {
  const { quality, sheets, ambient, detail } = useQualitySettings();
  const still = quality === "static";
  const sp = useRef(still ? 1 : 0);
  const rig = useRef<THREE.Group>(null);
  const dashGroup = useRef<THREE.Group>(null);
  const dash = useRef<HeroState>({ p: still ? 1 : 0, t: 0, doneAt: 0, px: 0, py: 0, still });

  const uniforms = useMemo<SwarmUniforms>(
    () => ({
      uProgress: { value: 0 },
      uMerge: { value: 0 },
      uTime: { value: 0 },
      uAnchorA: { value: new THREE.Vector3() },
      uAnchorB: { value: new THREE.Vector3() },
      uEndSize: { value: new THREE.Vector2(1, 1) },
      uEndTile: { value: new THREE.Vector2(0.3, 0.3) },
      uScaleA: { value: 1 },
    }),
    [],
  );

  const count = sheets;
  const cols = Math.max(3, Math.round(Math.sqrt(count * 1.55)));
  const rows = Math.ceil(count / cols);

  const ambientPts = useMemo(() => {
    const rand = mulberry32(77);
    const a = new Float32Array(Math.round(ambient * 0.7) * 3);
    for (let i = 0; i < a.length / 3; i++) {
      a[i * 3] = (rand() - 0.5) * 24;
      a[i * 3 + 1] = (rand() - 0.5) * 12;
      a[i * 3 + 2] = -5 + rand() * 8;
    }
    return a;
  }, [ambient]);

  useEffect(() => {
    dash.current.still = still;
    if (still) {
      dash.current.p = 1;
      sp.current = 1;
    }
  }, [still]);

  useFrame((st, dt) => {
    const d = dash.current;
    d.t += dt;
    sp.current = still ? 1 : damp(sp.current, progress.current, 6.5, dt);
    const P = sp.current;

    const flight = seg(P, 0.07, 0.74);
    const merge = seg(P, 0.66, 0.9);
    d.p = still ? 1 : seg(P, 0.7, 1.0);

    const tx = pointer.active ? pointer.x : 0;
    const ty = pointer.active ? pointer.y : 0;
    d.px = damp(d.px, tx, 3, dt);
    d.py = damp(d.py, ty, 3, dt);

    const { viewport, size } = st;
    const wide = size.width >= 1024;
    // reduced motion + narrow screen: the canvas gets its own block under the text
    const stacked = still && !wide;
    const vw = viewport.width;
    const vh = viewport.height;

    // anchors / scales respond to the viewport so the story works on any screen
    const dashScale = wide
      ? Math.min((vw * 0.42) / 8.1, (vh * 0.62) / 5.2)
      : stacked
        ? Math.min((vw * 0.94) / 8.1, (vh * 0.7) / 5.2)
        : Math.min((vw * 0.94) / 8.1, vh * 0.2);
    const footW = 7.8 * dashScale;
    const footH = 4.9 * dashScale;
    const u = uniforms;
    u.uScaleA.value = wide ? Math.min(vh * 0.105, vw * 0.058) : Math.min(vw * 0.15, vh * 0.065);
    if (wide) {
      u.uAnchorA.value.set(-vw * 0.2, -vh * 0.26, 0);
      u.uAnchorB.value.set(vw * 0.235, -vh * 0.02, 0);
    } else {
      u.uAnchorA.value.set(-vw * 0.1, -vh * 0.22, 0);
      u.uAnchorB.value.set(0, stacked ? 0 : -vh * 0.2, 0);
    }
    u.uEndSize.value.set(footW, footH);
    u.uEndTile.value.set((footW / cols) * 0.94, ((footH / rows) * 0.94) / SHEET_ASPECT);
    u.uProgress.value = flight;
    u.uMerge.value = merge;
    u.uTime.value = d.t;

    if (dashGroup.current) {
      dashGroup.current.scale.setScalar(dashScale);
      dashGroup.current.position.copy(u.uAnchorB.value);
      dashGroup.current.rotation.y = 0.2 + d.px * 0.18;
      dashGroup.current.rotation.x = -0.1 - d.py * 0.1;
    }
    if (rig.current) {
      rig.current.rotation.y = d.px * 0.08;
      rig.current.rotation.x = -d.py * 0.05;
    }
  });

  return (
    <HeroCtx.Provider value={dash}>
      <group ref={rig}>
        <SheetSwarm count={count} uniforms={uniforms} />
        <group ref={dashGroup}>
          <DashboardModel detail={detail} />
        </group>
      </group>
      <Particles
        starts={ambientPts}
        targets={ambientPts}
        getProgress={() => clamp(dash.current.t / 2)}
        size={0.5}
        drift={9}
        settle={0.5}
        seed={31}
      />
    </HeroCtx.Provider>
  );
}

export default function ChaosScene({ progress }: { progress: MutableRefObject<number> }) {
  return (
    <SceneCanvas
      className="absolute inset-0"
      camera={{ position: [0, 0, 11], fov: 38 }}
      rootMargin="900px"
      fallback={<StaticDashboard className="absolute inset-0 opacity-70" />}
    >
      <ChaosWorld progress={progress} />
    </SceneCanvas>
  );
}
