"use client";

import { useEffect, useMemo, useRef, type ComponentRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Text } from "@react-three/drei";
import * as THREE from "three";
import GlassPanel from "./GlassPanel";
import { useHeroState } from "./heroState";
import { barFragment, barVertex } from "./shaders";
import {
  BARS,
  DONUT,
  KPIS,
  LINE_POINTS,
  PANELS,
  panelById,
  type PanelSpec,
} from "./dashboardLayout";
import { easeInOutCubic, easeOutBack, easeOutCubic, seg } from "./math";

const FONT_BOLD = "/fonts/SpaceGrotesk-Bold.woff";
const FONT_MED = "/fonts/SpaceGrotesk-Medium.woff";

type TroikaText = ComponentRef<typeof Text>;

const formatNumber = (v: number, decimals: number, suffix: string) =>
  v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;

/* ------------------------------------------------------------------------ */
/* Layer: floats, parallaxes and materialises one panel + its content        */
/* ------------------------------------------------------------------------ */
function Layer({
  spec,
  children,
}: {
  spec: PanelSpec;
  children: (getReveal: () => number) => ReactNode;
}) {
  const state = useHeroState();
  const group = useRef<THREE.Group>(null);
  const phase = spec.x * 1.7 + spec.y * 2.3;

  const getReveal = () => easeOutCubic(seg(state.current.p, spec.start, spec.end));

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const s = state.current;
    const reveal = getReveal();
    const float = s.still ? 0 : Math.sin(s.t * 0.9 + phase) * 0.03 * (0.4 + spec.z * 0.6);
    g.position.set(s.px * spec.z * 0.1, s.py * spec.z * 0.07 + float, (reveal - 1) * 1.2);
  });

  return <group ref={group}>{children(getReveal)}</group>;
}

/* ------------------------------------------------------------------------ */
/* Text helpers                                                              */
/* ------------------------------------------------------------------------ */
function Label({
  text,
  position,
  size,
  color,
  getReveal,
  font = FONT_MED,
  anchorX = "left",
  letterSpacing = 0.04,
}: {
  text: string;
  position: [number, number, number];
  size: number;
  color: string;
  getReveal: () => number;
  font?: string;
  anchorX?: "left" | "center" | "right";
  letterSpacing?: number;
}) {
  const ref = useRef<TroikaText>(null);
  useFrame(() => {
    if (ref.current) ref.current.fillOpacity = getReveal();
  });
  return (
    <Text
      ref={ref}
      font={font}
      fontSize={size}
      color={color}
      anchorX={anchorX}
      anchorY="middle"
      letterSpacing={letterSpacing}
      position={position}
      fillOpacity={0}
      material-toneMapped={false}
    >
      {text}
    </Text>
  );
}

function CountText({
  value,
  decimals,
  suffix,
  position,
  size,
  start,
  getReveal,
  anchorX = "left",
}: {
  value: number;
  decimals: number;
  suffix: string;
  position: [number, number, number];
  size: number;
  start: number;
  getReveal: () => number;
  anchorX?: "left" | "center";
}) {
  const state = useHeroState();
  const ref = useRef<TroikaText>(null);
  const last = useRef("");
  const lastSync = useRef(0);
  const initial = formatNumber(state.current.still ? value : 0, decimals, suffix);

  useFrame(() => {
    const t = ref.current;
    if (!t) return;
    const s = state.current;
    const progress = easeOutCubic(seg(s.p, start, 1));
    const str = formatNumber(value * progress, decimals, suffix);
    // Every text change is a typesetting job in troika's worker plus a geometry upload,
    // so counting is capped at ~12 updates/s (the final value always goes through).
    const now = performance.now();
    if (str !== last.current && (progress >= 1 || now - lastSync.current > 85)) {
      last.current = str;
      lastSync.current = now;
      t.text = str;
      t.sync();
    }
    t.fillOpacity = getReveal();
  });

  return (
    <Text
      ref={ref}
      font={FONT_BOLD}
      fontSize={size}
      color="#2a211b"
      anchorX={anchorX}
      anchorY="middle"
      position={position}
      fillOpacity={0}
      material-toneMapped={false}
    >
      {initial}
    </Text>
  );
}

/* ------------------------------------------------------------------------ */
/* KPI card content                                                          */
/* ------------------------------------------------------------------------ */
function sparkPoints(panel: PanelSpec, seed: number): [number, number, number][] {
  const n = 14;
  const x0 = panel.x + panel.w * 0.1;
  const x1 = panel.x + panel.w / 2 - 0.2;
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v = 0.35 + 0.45 * t + 0.14 * Math.sin(t * 7 + seed) + 0.06 * Math.sin(t * 17 + seed * 2);
    pts.push([x0 + (x1 - x0) * t, panel.y - 0.34 + v * 0.42, panel.z + 0.03]);
  }
  return pts;
}

function KpiContent({ index, getReveal }: { index: number; getReveal: () => number }) {
  const kpi = KPIS[index];
  const panel = panelById(kpi.panel);
  const left = panel.x - panel.w / 2 + 0.2;
  const lineRef = useRef<ComponentRef<typeof Line>>(null);
  const points = useMemo(() => sparkPoints(panel, index * 1.9 + 0.6), [panel, index]);

  useFrame(() => {
    const l = lineRef.current;
    if (l) (l.material as THREE.Material).opacity = 0.9 * getReveal();
  });

  return (
    <>
      <Label text={kpi.label} position={[left, panel.y + 0.27, panel.z + 0.03]} size={0.095} color="#8a7765" getReveal={getReveal} letterSpacing={0.14} />
      <CountText
        value={kpi.value}
        decimals={kpi.decimals}
        suffix={kpi.suffix}
        position={[left, panel.y - 0.1, panel.z + 0.03]}
        size={0.36}
        start={panel.start + 0.04}
        getReveal={getReveal}
      />
      <Line
        ref={lineRef}
        renderOrder={120}
        points={points}
        color={["#2f66d4", "#9c8167", "#6b97e8"][index]}
        lineWidth={1.6}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* 3D bar chart                                                              */
/* ------------------------------------------------------------------------ */
const BAR_COLORS: [string, string][] = [
  ["#2456b8", "#4f86e6"],
  ["#2a5fc6", "#5a8fe9"],
  ["#2456b8", "#4f86e6"],
  ["#1f4aa8", "#3f76de"],
  ["#2a5fc6", "#6b97e8"],
  ["#1f4aa8", "#4a80e3"],
  ["#8a6f56", "#c4a98c"],
  ["#2456b8", "#5a8fe9"],
  ["#a8795c", "#dba98a"],
  ["#1f4aa8", "#4f86e6"],
];

function Bars({ getReveal }: { getReveal: () => number }) {
  const state = useHeroState();
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const gridMat = useRef<THREE.LineBasicMaterial>(null);
  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const materials = useMemo(
    () =>
      BARS.map((_, i) => {
        const [a, b] = BAR_COLORS[i % BAR_COLORS.length];
        return new THREE.ShaderMaterial({
          vertexShader: barVertex,
          fragmentShader: barFragment,
          transparent: true,
          uniforms: {
            uColorA: { value: new THREE.Color(a) },
            uColorB: { value: new THREE.Color(b) },
            uOpacity: { value: 0 },
            uGlow: { value: 1 },
          },
        });
      }),
    [],
  );
  const panel = panelById("bars");
  const gridLines = useMemo(() => {
    const pts: number[] = [];
    const y0 = BARS[0].y;
    for (let i = 0; i < 5; i++) {
      const y = y0 + (i / 4) * 1.6;
      pts.push(panel.x - panel.w / 2 + 0.22, y, panel.z + 0.02, panel.x + panel.w / 2 - 0.22, y, panel.z + 0.02);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [panel]);

  useEffect(
    () => () => {
      geometry.dispose();
      gridLines.dispose();
      materials.forEach((m) => m.dispose());
    },
    [geometry, gridLines, materials],
  );

  useFrame(() => {
    const s = state.current;
    const reveal = getReveal();
    if (gridMat.current) gridMat.current.opacity = 0.4 * reveal;
    BARS.forEach((b, i) => {
      const m = meshes.current[i];
      if (!m) return;
      const rise = easeOutBack(seg(s.p, 0.7 + i * 0.016, 0.98));
      const breathe = s.still ? 1 : 1 + 0.045 * Math.sin(s.t * 1.1 + i * 0.8);
      m.scale.set(b.w, Math.max(0.001, b.h * rise * breathe), b.d);
      materials[i].uniforms.uOpacity.value = reveal;
    });
  });

  return (
    <>
      <lineSegments geometry={gridLines} renderOrder={110}>
        <lineBasicMaterial ref={gridMat} color="#a38a72" transparent opacity={0} depthWrite={false} />
      </lineSegments>
      {BARS.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el;
          }}
          geometry={geometry}
          material={materials[i]}
          position={[b.x, b.y, b.z]}
          scale={[b.w, 0.001, b.d]}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Line graph that draws itself                                              */
/* ------------------------------------------------------------------------ */
const SEGMENTS = LINE_POINTS.length - 1;
const LOOP_SECONDS = 10;

function LineGraph({ getReveal }: { getReveal: () => number }) {
  const state = useHeroState();
  const line = useRef<ComponentRef<typeof Line>>(null);
  const head = useRef<THREE.Mesh>(null);
  const area = useRef<THREE.ShaderMaterial>(null);
  const gridMat = useRef<THREE.LineBasicMaterial>(null);
  const panel = panelById("line");

  const areaGeometry = useMemo(() => {
    const pos: number[] = [];
    const v: number[] = [];
    const xr: number[] = [];
    const idx: number[] = [];
    const base = panel.y - panel.h / 2 + 0.26;
    LINE_POINTS.forEach((p, i) => {
      pos.push(p[0], p[1], p[2] - 0.01, p[0], base, p[2] - 0.01);
      v.push(1, 0);
      const t = i / SEGMENTS;
      xr.push(t, t);
      if (i < SEGMENTS) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("aV", new THREE.Float32BufferAttribute(v, 1));
    g.setAttribute("aX", new THREE.Float32BufferAttribute(xr, 1));
    g.setIndex(idx);
    return g;
  }, [panel]);

  const areaMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { uDraw: { value: 0 }, uOpacity: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute float aV; attribute float aX;
          varying float vV; varying float vX;
          void main(){ vV = aV; vX = aX; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
        fragmentShader: /* glsl */ `
          uniform float uDraw; uniform float uOpacity;
          varying float vV; varying float vX;
          void main(){
            float clipMask = 1.0 - smoothstep(uDraw - 0.01, uDraw, vX);
            vec3 c = mix(vec3(0.147,0.31,0.80), vec3(0.028,0.133,0.658), vV);
            gl_FragColor = vec4(c, pow(vV,1.6) * 0.34 * clipMask * uOpacity);
            #include <colorspace_fragment>
          }
        `,
      }),
    [],
  );

  const gridLines = useMemo(() => {
    const pts: number[] = [];
    const y0 = panel.y - panel.h / 2 + 0.28;
    for (let i = 0; i < 4; i++) {
      const y = y0 + (i / 3) * 0.8;
      pts.push(panel.x - panel.w / 2 + 0.24, y, panel.z + 0.02, panel.x + panel.w / 2 - 0.24, y, panel.z + 0.02);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [panel]);

  useEffect(
    () => () => {
      areaGeometry.dispose();
      areaMaterial.dispose();
      gridLines.dispose();
    },
    [areaGeometry, areaMaterial, gridLines],
  );

  useFrame(() => {
    const s = state.current;
    const reveal = getReveal();
    if (gridMat.current) gridMat.current.opacity = 0.36 * reveal;
    // First draw is tied to the intro; afterwards the graph redraws on a loop.
    const startP = 0.72;
    let draw: number;
    let fade = 1;
    if (s.still) {
      draw = 1;
    } else if (s.p < 1) {
      draw = easeInOutCubic(seg(s.p, startP, 1));
    } else {
      // Continue from the end of the first draw (phase 0.3 = fully drawn, holding).
      const cycle = (((s.t - s.doneAt) / LOOP_SECONDS) + 0.3) % 1;
      draw = easeInOutCubic(seg(cycle, 0.0, 0.26));
      fade = 1 - seg(cycle, 0.9, 1.0);
    }

    const l = line.current;
    if (l) {
      const count = Math.max(1, Math.floor(draw * SEGMENTS));
      (l.geometry as THREE.InstancedBufferGeometry).instanceCount = count;
      (l.material as THREE.Material).opacity = reveal * fade;
    }

    const f = draw * SEGMENTS;
    const i = Math.min(SEGMENTS - 1, Math.floor(f));
    const a = LINE_POINTS[i];
    const b = LINE_POINTS[i + 1];
    const k = f - i;
    if (head.current) {
      head.current.position.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + 0.02);
      const pulse = s.still ? 1 : 1 + 0.25 * Math.sin(s.t * 5);
      head.current.scale.setScalar(pulse * reveal * fade);
    }
    if (area.current) {
      area.current.uniforms.uDraw.value = draw;
      area.current.uniforms.uOpacity.value = reveal * fade;
    }
  });

  return (
    <>
      <lineSegments geometry={gridLines} renderOrder={110}>
        <lineBasicMaterial ref={gridMat} color="#a38a72" transparent opacity={0} depthWrite={false} />
      </lineSegments>
      <mesh geometry={areaGeometry} renderOrder={115}>
        <primitive object={areaMaterial} attach="material" ref={area} />
      </mesh>
      <Line ref={line} points={LINE_POINTS} color="#2f66d4" lineWidth={2.6} transparent opacity={0} depthWrite={false} renderOrder={120} />
      <mesh ref={head} renderOrder={125}>
        <circleGeometry args={[0.07, 24]} />
        <meshBasicMaterial color="#1f4aa8" toneMapped={false} />
        <mesh scale={2.4} position={[0, 0, -0.005]} renderOrder={124}>
          <circleGeometry args={[0.07, 24]} />
          <meshBasicMaterial color="#6b97e8" transparent opacity={0.38} depthWrite={false} toneMapped={false} />
        </mesh>
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Rotating donut                                                            */
/* ------------------------------------------------------------------------ */
function Donut({ getReveal }: { getReveal: () => number }) {
  const state = useHeroState();
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Group>(null);

  const arcs = useMemo(() => {
    const gap = 0.05;
    const full = Math.PI * 2;
    return DONUT.segments.map((seg_, i) => {
      const before = DONUT.segments.slice(0, i).reduce((sum, x) => sum + x.share, 0);
      return { arc: seg_.share * full - gap, rot: before * full + gap / 2, color: seg_.color };
    });
  }, []);

  useFrame(() => {
    const s = state.current;
    if (group.current) {
      const grow = easeOutBack(seg(s.p, 0.78, 1));
      group.current.scale.setScalar(Math.max(0.001, grow));
      group.current.rotation.x = s.py * 0.25;
      group.current.rotation.y = -s.px * 0.25;
    }
    if (ring.current) ring.current.rotation.z = s.still ? 0.6 : -s.t * 0.4;
  });

  return (
    <group position={[DONUT.x, DONUT.y, DONUT.z]}>
      <group ref={group}>
        <group ref={ring}>
          {arcs.map((a, i) => (
            <mesh key={i} rotation={[0, 0, a.rot]}>
              <torusGeometry args={[DONUT.radius, DONUT.tube, 14, 48, a.arc]} />
              <meshStandardMaterial color={a.color} emissive={a.color} emissiveIntensity={0.16} roughness={0.35} metalness={0.25} />
            </mesh>
          ))}
        </group>
      </group>
      <CountText value={86} decimals={0} suffix="%" position={[0, 0, 0.12]} size={0.26} start={0.8} getReveal={getReveal} anchorX="center" />
    </group>
  );
}

/* ------------------------------------------------------------------------ */
/* Header / sidebar decoration                                               */
/* ------------------------------------------------------------------------ */
function HeaderDecor({ getReveal }: { getReveal: () => number }) {
  const header = panelById("header");
  const z = header.z + 0.02;
  const dots = ["#e0786a", "#e3b25f", "#79b88a"];
  return (
    <>
      {dots.map((c, i) => (
        <GlassPanel key={c} width={0.15} height={0.15} radius={0.075} tintA={c} tintB={c} border={c} fill={0.95} edge={0.2} shadow={0.12} position={[-3.45 + i * 0.24, header.y, z]} getOpacity={getReveal} />
      ))}
      <GlassPanel width={2.4} height={0.28} radius={0.14} tintA="#ffffff" tintB="#efe4d6" border="#d9c8b3" fill={0.95} edge={0.7} shadow={0.1} position={[0.1, header.y, z]} getOpacity={getReveal} />
      <GlassPanel width={0.3} height={0.3} radius={0.15} tintA="#6b97e8" tintB="#2f66d4" border="#1f4aa8" fill={0.97} edge={0.5} shadow={0.15} position={[3.4, header.y, z]} getOpacity={getReveal} />
    </>
  );
}

function SidebarDecor({ getReveal }: { getReveal: () => number }) {
  const side = panelById("sidebar");
  return (
    <>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <GlassPanel
          key={i}
          width={0.46}
          height={0.46}
          radius={0.13}
          tintA={i === 0 ? "#e4edfc" : "#fbf5ec"}
          tintB={i === 0 ? "#c9daf8" : "#eadccb"}
          border={i === 0 ? "#7fa3e6" : "#d6c3ad"}
          fill={0.95}
          edge={i === 0 ? 0.95 : 0.55}
          shadow={0.14}
          position={[side.x, side.y + 1.45 - i * 0.62, side.z + 0.02]}
          getOpacity={getReveal}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Public component                                                          */
/* ------------------------------------------------------------------------ */
export default function DashboardModel({ detail = true }: { detail?: boolean }) {
  return (
    <group>
      <ambientLight intensity={1.1} />
      <directionalLight position={[2.5, 3.5, 5]} intensity={2.2} />
      {PANELS.map((spec) => (
        <Layer key={spec.id} spec={spec}>
          {(getReveal) => (
            <>
              <GlassPanel
                width={spec.w}
                height={spec.h}
                radius={spec.r}
                tintA={spec.tintA}
                tintB={spec.tintB}
                border={spec.border}
                fill={spec.fill}
                edge={spec.edge}
                position={[spec.x, spec.y, spec.z]}
                getOpacity={getReveal}
                renderOrder={Math.round(spec.z * 10)}
              />
              {spec.id === "header" && detail && <HeaderDecor getReveal={getReveal} />}
              {spec.id === "sidebar" && detail && <SidebarDecor getReveal={getReveal} />}
              {spec.id === "kpi1" && <KpiContent index={0} getReveal={getReveal} />}
              {spec.id === "kpi2" && <KpiContent index={1} getReveal={getReveal} />}
              {spec.id === "kpi3" && <KpiContent index={2} getReveal={getReveal} />}
              {spec.id === "bars" && (
                <>
                  <Bars getReveal={getReveal} />
                  <Label text="Performance by project" position={[spec.x - spec.w / 2 + 0.22, spec.y + spec.h / 2 - 0.26, spec.z + 0.03]} size={0.11} color="#6f5f50" getReveal={getReveal} />
                </>
              )}
              {spec.id === "line" && (
                <>
                  <LineGraph getReveal={getReveal} />
                  <Label text="Score trend" position={[spec.x - spec.w / 2 + 0.24, spec.y + spec.h / 2 - 0.25, spec.z + 0.03]} size={0.11} color="#6f5f50" getReveal={getReveal} />
                </>
              )}
              {spec.id === "donut" && (
                <>
                  <Donut getReveal={getReveal} />
                  <Label text="Coverage" position={[spec.x, spec.y + spec.h / 2 - 0.22, spec.z + 0.03]} size={0.1} color="#6f5f50" getReveal={getReveal} anchorX="center" />
                </>
              )}
            </>
          )}
        </Layer>
      ))}
    </group>
  );
}
