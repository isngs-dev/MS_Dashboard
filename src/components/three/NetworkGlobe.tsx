"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { mulberry32 } from "./math";

const nodeVertex = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  uniform float uPixelRatio;
  uniform float uTime;
  varying float vGlow;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float tw = 0.7 + 0.3 * sin(uTime * 1.6 + aPhase * 6.2831);
    gl_PointSize = aSize * tw * uPixelRatio * (52.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vGlow = tw;
  }
`;

const nodeFragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vGlow;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, smoothstep(0.0, 0.7, core) * vGlow);
    #include <colorspace_fragment>
  }
`;

function nodeMaterial(color: string) {
  return new THREE.ShaderMaterial({
    vertexShader: nodeVertex,
    fragmentShader: nodeFragment,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPixelRatio: { value: 1 },
      uTime: { value: 0 },
    },
  });
}

type Props = {
  nodes: number;
  radius?: number;
  /** rotation speed multiplier (0 for still renders) */
  speed?: number;
};

/**
 * Slowly turning network of glowing nodes joined by thin links, wrapped in a
 * faint wireframe globe, with light pulses travelling along long-haul arcs.
 */
export default function NetworkGlobe({ nodes, radius = 3.6, speed = 1 }: Props) {
  const group = useRef<THREE.Group>(null);
  const gl = useThree((s) => s.gl);

  const data = useMemo(() => {
    const rand = mulberry32(1999);
    const pos: THREE.Vector3[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < nodes; i++) {
      const y = 1 - (i / (nodes - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const t = golden * i;
      // tiny jitter so it reads as organic, not a perfect lattice
      const j = 1 + (rand() - 0.5) * 0.02;
      pos.push(new THREE.Vector3(Math.cos(t) * r, y, Math.sin(t) * r).multiplyScalar(radius * j));
    }

    // k nearest neighbour links
    const links = new Set<string>();
    const segs: number[] = [];
    const K = 3;
    for (let i = 0; i < nodes; i++) {
      const d = pos
        .map((p, j) => ({ j, d: p.distanceToSquared(pos[i]) }))
        .filter((o) => o.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, K);
      for (const { j } of d) {
        const key = i < j ? `${i}-${j}` : `${j}-${i}`;
        if (links.has(key)) continue;
        links.add(key);
        segs.push(pos[i].x, pos[i].y, pos[i].z, pos[j].x, pos[j].y, pos[j].z);
      }
    }

    // long arcs between distant nodes
    const arcs: THREE.QuadraticBezierCurve3[] = [];
    const arcSegs: number[] = [];
    let guard = 0;
    while (arcs.length < 12 && guard++ < 400) {
      const a = pos[Math.floor(rand() * nodes)];
      const b = pos[Math.floor(rand() * nodes)];
      if (a.distanceTo(b) < radius * 1.1) continue;
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(radius * 1.55);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      arcs.push(curve);
      const pts = curve.getPoints(36);
      for (let k = 0; k < pts.length - 1; k++) {
        arcSegs.push(pts[k].x, pts[k].y, pts[k].z, pts[k + 1].x, pts[k + 1].y, pts[k + 1].z);
      }
    }

    const nodePos = new Float32Array(nodes * 3);
    const nodeSize = new Float32Array(nodes);
    const nodePhase = new Float32Array(nodes);
    pos.forEach((p, i) => {
      nodePos.set([p.x, p.y, p.z], i * 3);
      nodeSize[i] = 0.7 + rand() * 1.1;
      nodePhase[i] = rand();
    });

    const nodeGeo = new THREE.BufferGeometry();
    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3));
    nodeGeo.setAttribute("aSize", new THREE.BufferAttribute(nodeSize, 1));
    nodeGeo.setAttribute("aPhase", new THREE.BufferAttribute(nodePhase, 1));

    const linkGeo = new THREE.BufferGeometry();
    linkGeo.setAttribute("position", new THREE.Float32BufferAttribute(segs, 3));
    const arcGeo = new THREE.BufferGeometry();
    arcGeo.setAttribute("position", new THREE.Float32BufferAttribute(arcSegs, 3));

    const pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(arcs.length * 3), 3));
    pulseGeo.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(arcs.length).fill(2.6), 1));
    pulseGeo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(arcs.length), 1));

    return { nodeGeo, linkGeo, arcGeo, pulseGeo, arcs, offsets: arcs.map(() => rand()) };
  }, [nodes, radius]);

  const materials = useMemo(
    () => ({
      node: nodeMaterial("#2f66d4"),
      pulse: nodeMaterial("#bb5a26"),
      link: new THREE.LineBasicMaterial({ color: "#2f66d4", transparent: true, opacity: 0.3, depthWrite: false }),
      arc: new THREE.LineBasicMaterial({ color: "#b9694a", transparent: true, opacity: 0.55, depthWrite: false }),
      wire: new THREE.MeshBasicMaterial({ color: "#2f66d4", wireframe: true, transparent: true, opacity: 0.1, depthWrite: false }),
    }),
    [],
  );

  const wireGeo = useMemo(() => new THREE.SphereGeometry(radius * 0.992, 30, 20), [radius]);

  useEffect(
    () => () => {
      Object.values(data).forEach((v) => {
        if (v instanceof THREE.BufferGeometry) v.dispose();
      });
      Object.values(materials).forEach((m) => m.dispose());
      wireGeo.dispose();
    },
    [data, materials, wireGeo],
  );

  const pulse = useRef(new THREE.Vector3());

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime;
    const pr = gl.getPixelRatio();
    for (const m of [materials.node, materials.pulse]) {
      m.uniforms.uPixelRatio.value = pr;
      m.uniforms.uTime.value = t;
    }
    if (group.current) group.current.rotation.y += dt * 0.07 * speed;

    const attr = data.pulseGeo.getAttribute("position") as THREE.BufferAttribute;
    data.arcs.forEach((curve, i) => {
      const u = (t * 0.11 * speed + data.offsets[i]) % 1;
      curve.getPoint(u, pulse.current);
      attr.setXYZ(i, pulse.current.x, pulse.current.y, pulse.current.z);
    });
    attr.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <mesh geometry={wireGeo} material={materials.wire} />
      <lineSegments geometry={data.linkGeo} material={materials.link} />
      <lineSegments geometry={data.arcGeo} material={materials.arc} />
      <points geometry={data.nodeGeo} material={materials.node} frustumCulled={false} />
      <points geometry={data.pulseGeo} material={materials.pulse} frustumCulled={false} />
    </group>
  );
}
