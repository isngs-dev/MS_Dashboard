import { mulberry32 } from "./math";

/**
 * Single source of truth for the hero dashboard geometry. Both the visible
 * meshes and the particle "assemble" targets are derived from it, so the
 * streaming data lands exactly on the panels it forms.
 */

export type PanelSpec = {
  id: string;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  r: number;
  tintA: string;
  tintB: string;
  /** colour of the thin glass edge line */
  border: string;
  fill: number;
  edge: number;
  /** intro window (0..1 of the whole intro) in which this panel materialises */
  start: number;
  end: number;
};

export const PANELS: PanelSpec[] = [
  { id: "frame", x: 0, y: 0, z: 0, w: 7.8, h: 4.9, r: 0.28, tintA: "#ffffff", tintB: "#f1e8db", border: "#cdb9a2", fill: 0.7, edge: 0.9, start: 0.4, end: 0.75 },
  { id: "header", x: 0, y: 2.0, z: 0.1, w: 7.4, h: 0.5, r: 0.14, tintA: "#fffdf9", tintB: "#f3eadf", border: "#dccbb6", fill: 0.9, edge: 0.7, start: 0.45, end: 0.8 },
  { id: "sidebar", x: -3.35, y: -0.3, z: 0.18, w: 0.9, h: 3.9, r: 0.16, tintA: "#f8f0e5", tintB: "#eadccb", border: "#d6c3ad", fill: 0.92, edge: 0.7, start: 0.5, end: 0.82 },
  { id: "kpi1", x: -1.75, y: 1.0, z: 0.45, w: 2.0, h: 0.95, r: 0.16, tintA: "#ffffff", tintB: "#e3ecfc", border: "#9fb9ec", fill: 0.92, edge: 0.9, start: 0.55, end: 0.85 },
  { id: "kpi2", x: 0.425, y: 1.0, z: 0.58, w: 2.0, h: 0.95, r: 0.16, tintA: "#ffffff", tintB: "#f6e8d9", border: "#dcc4a8", fill: 0.92, edge: 0.9, start: 0.6, end: 0.88 },
  { id: "kpi3", x: 2.6, y: 1.0, z: 0.7, w: 2.0, h: 0.95, r: 0.16, tintA: "#ffffff", tintB: "#dde7fa", border: "#9fb9ec", fill: 0.92, edge: 0.9, start: 0.65, end: 0.9 },
  { id: "bars", x: -1.2, y: -0.9, z: 0.85, w: 3.1, h: 2.4, r: 0.2, tintA: "#ffffff", tintB: "#f3eadf", border: "#d6c3ad", fill: 0.9, edge: 0.9, start: 0.68, end: 0.93 },
  { id: "line", x: 2.075, y: -0.45, z: 1.05, w: 3.05, h: 1.5, r: 0.2, tintA: "#ffffff", tintB: "#e9f0fc", border: "#a9c0ee", fill: 0.9, edge: 0.9, start: 0.72, end: 0.96 },
];

export const panelById = (id: string) => PANELS.find((p) => p.id === id)!;

/* ---- bar chart ---------------------------------------------------------- */
export const BAR_HEIGHTS = [0.42, 0.66, 0.52, 0.86, 0.7, 1.0, 0.78, 0.92, 0.6, 0.82];
export const BARS = (() => {
  const p = panelById("bars");
  const count = BAR_HEIGHTS.length;
  const bw = 0.17;
  const gap = 0.1;
  const total = count * bw + (count - 1) * gap;
  const x0 = p.x - total / 2 + bw / 2;
  const baseY = p.y - p.h / 2 + 0.34;
  const maxH = 1.55;
  return BAR_HEIGHTS.map((h, i) => ({
    x: x0 + i * (bw + gap),
    y: baseY,
    z: p.z + 0.12,
    w: bw,
    d: 0.2,
    h: h * maxH,
  }));
})();

/* ---- line graph --------------------------------------------------------- */
export const LINE_POINTS = (() => {
  const p = panelById("line");
  const n = 64;
  const x0 = p.x - p.w / 2 + 0.3;
  const x1 = p.x + p.w / 2 - 0.3;
  const yBase = p.y - p.h / 2 + 0.28;
  const yAmp = 0.8;
  const pts: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const v =
      0.18 +
      0.5 * t +
      0.13 * Math.sin(t * 9.0) +
      0.07 * Math.sin(t * 21.0 + 1.2) +
      0.12 * Math.pow(t, 3);
    pts.push([x0 + (x1 - x0) * t, yBase + yAmp * Math.min(Math.max(v, 0.05), 1), p.z + 0.04]);
  }
  return pts;
})();

/* ---- KPI cards ---------------------------------------------------------- */
export const KPIS = [
  { panel: "kpi1", label: "TOTAL VISITS", value: 12840, decimals: 0, suffix: "" },
  { panel: "kpi2", label: "AVG. SCORE", value: 94.6, decimals: 1, suffix: "%" },
  { panel: "kpi3", label: "LOCATIONS", value: 326, decimals: 0, suffix: "" },
] as const;

/* ---- particle targets --------------------------------------------------- */
function samplePanelOutline(rand: () => number, p: PanelSpec): [number, number, number] {
  const per = 2 * (p.w + p.h);
  let s = rand() * per;
  let x: number;
  let y: number;
  if (s < p.w) {
    x = -p.w / 2 + s;
    y = p.h / 2;
  } else if ((s -= p.w) < p.h) {
    x = p.w / 2;
    y = p.h / 2 - s;
  } else if ((s -= p.h) < p.w) {
    x = p.w / 2 - s;
    y = -p.h / 2;
  } else {
    s -= p.w;
    x = -p.w / 2;
    y = -p.h / 2 + s;
  }
  return [p.x + x, p.y + y, p.z];
}

/**
 * Where each particle ends up. The mix favours the data-bearing parts of the
 * dashboard (bars, line) so the assembly reads as "data becoming charts".
 */
export function sampleDashboardTargets(count: number, seed = 7): Float32Array {
  const rand = mulberry32(seed);
  const out = new Float32Array(count * 3);
  const outlinePanels = PANELS.filter((p) => p.id !== "frame");

  for (let i = 0; i < count; i++) {
    const r = rand();
    let pt: [number, number, number];
    if (r < 0.3) {
      pt = samplePanelOutline(rand, outlinePanels[Math.floor(rand() * outlinePanels.length)]);
    } else if (r < 0.5) {
      const b = BARS[Math.floor(rand() * BARS.length)];
      pt = [b.x + (rand() - 0.5) * b.w, b.y + rand() * b.h, b.z + (rand() - 0.5) * b.d];
    } else if (r < 0.8) {
      const q = LINE_POINTS[Math.floor(rand() * LINE_POINTS.length)];
      pt = [q[0] + (rand() - 0.5) * 0.04, q[1] + (rand() - 0.5) * 0.04, q[2]];
    } else if (r < 0.92) {
      const k = PANELS.filter((p) => p.id.startsWith("kpi"))[Math.floor(rand() * 3)];
      pt = [k.x + (rand() - 0.5) * k.w * 0.9, k.y + (rand() - 0.5) * k.h * 0.8, k.z];
    } else {
      pt = samplePanelOutline(rand, panelById("frame"));
    }
    out[i * 3] = pt[0];
    out[i * 3 + 1] = pt[1];
    out[i * 3 + 2] = pt[2];
  }
  return out;
}

/** Start positions: scattered on a wide shell around the dashboard (i.e. the screen edges). */
export function sampleEdgeStarts(count: number, seed = 21): Float32Array {
  const rand = mulberry32(seed);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // choose one of the four screen edges, plus depth scatter
    const edge = Math.floor(rand() * 4);
    const along = (rand() - 0.5) * 2;
    const reachX = 13;
    const reachY = 8;
    let x = 0;
    let y = 0;
    if (edge === 0) {
      x = -reachX - rand() * 4;
      y = along * reachY;
    } else if (edge === 1) {
      x = reachX + rand() * 4;
      y = along * reachY;
    } else if (edge === 2) {
      x = along * reachX;
      y = reachY + rand() * 3;
    } else {
      x = along * reachX;
      y = -reachY - rand() * 3;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = (rand() - 0.5) * 8;
  }
  return out;
}
