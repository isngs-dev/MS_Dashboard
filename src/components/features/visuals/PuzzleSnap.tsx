"use client";

import { useId } from "react";
import { motion, useTransform } from "framer-motion";
import { COLORS, useLoop, type VisualProps } from "./shared";

const S = 58; // piece size
const K = 10; // knob half-width

type Edges = { t: number; r: number; b: number; l: number };

type Pt = { x: number; y: number };
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** One jigsaw edge from p0 to p1: flat (0), knob out (1) or socket (-1). */
function edge(p0: Pt, p1: Pt, type: number) {
  if (type === 0) return `L ${p1.x} ${p1.y}`;
  const m = lerpPt(p0, p1, 0.5);
  const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const ux = (p1.x - p0.x) / len;
  const uy = (p1.y - p0.y) / len;
  const a = { x: m.x - ux * K, y: m.y - uy * K };
  const b = { x: m.x + ux * K, y: m.y + uy * K };
  return `L ${a.x} ${a.y} A ${K + 1.5} ${K + 1.5} 0 1 ${type === 1 ? 1 : 0} ${b.x} ${b.y} L ${p1.x} ${p1.y}`;
}

function piecePath({ t, r, b, l }: Edges) {
  const tl = { x: 0, y: 0 };
  const tr = { x: S, y: 0 };
  const br = { x: S, y: S };
  const bl = { x: 0, y: S };
  return `M 0 0 ${edge(tl, tr, t)} ${edge(tr, br, r)} ${edge(br, bl, b)} ${edge(bl, tl, l)} Z`;
}

const PIECES: { edges: Edges; col: number; row: number; color: string; from: { x: number; y: number; r: number } }[] = [
  { edges: { t: 0, r: 1, b: 1, l: 0 }, col: 0, row: 0, color: COLORS.blue, from: { x: -46, y: -34, r: -24 } },
  { edges: { t: 0, r: 0, b: 1, l: -1 }, col: 1, row: 0, color: COLORS.sky, from: { x: 50, y: -30, r: 20 } },
  { edges: { t: -1, r: 1, b: 0, l: 0 }, col: 0, row: 1, color: COLORS.taupe, from: { x: -50, y: 38, r: 16 } },
  { edges: { t: -1, r: 0, b: 0, l: -1 }, col: 1, row: 1, color: COLORS.clay, from: { x: 46, y: 40, r: -18 } },
];

/** 10: four puzzle pieces drift in and snap together with a flash. */
export default function PuzzleSnap({ active, still }: VisualProps) {
  const uid = useId();
  const p = useLoop(active, still, { keyframes: [0, 1, 1, 0], times: [0, 0.4, 0.82, 1], duration: 5.6 });
  const flash = useTransform(p, [0.36, 0.44, 0.62], [0, 1, 0]);
  const glow = useTransform(p, [0.4, 0.5, 1], [0, 0.55, 0.28]);

  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden>
      <motion.div
        className="absolute h-36 w-36 rounded-full blur-2xl"
        style={{ background: `radial-gradient(closest-side, ${COLORS.taupe}, transparent)`, opacity: glow }}
      />
      <motion.div
        className="absolute h-40 w-40 rounded-full"
        style={{ background: "radial-gradient(closest-side, rgb(47 102 212 / 0.28), transparent 70%)", opacity: flash }}
      />
      <svg viewBox="-24 -24 160 160" className="relative h-full max-h-[150px] w-full overflow-visible">
        <defs>
          {PIECES.map((pc, i) => (
            <linearGradient key={i} id={`${uid}-${i}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={pc.color} stopOpacity="0.95" />
              <stop offset="1" stopColor={pc.color} stopOpacity="0.45" />
            </linearGradient>
          ))}
        </defs>
        {PIECES.map((pc, i) => (
          <Piece key={i} pc={pc} p={p} fill={`url(#${uid}-${i})`} index={i} />
        ))}
      </svg>
    </div>
  );
}

function Piece({
  pc,
  p,
  fill,
  index,
}: {
  pc: (typeof PIECES)[number];
  p: ReturnType<typeof useLoop>;
  fill: string;
  index: number;
}) {
  // staggered snap: later pieces land slightly after earlier ones
  const a = 0.0 + index * 0.025;
  const x = useTransform(p, [a, 0.4 + index * 0.012], [pc.from.x, 0]);
  const y = useTransform(p, [a, 0.4 + index * 0.012], [pc.from.y, 0]);
  const rot = useTransform(p, [a, 0.4 + index * 0.012], [pc.from.r, 0]);
  return (
    <g transform={`translate(${pc.col * S + pc.col * 1.5} ${pc.row * S + pc.row * 1.5})`}>
      <motion.path
        d={piecePath(pc.edges)}
        fill={fill}
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinejoin="round"
        style={{ x, y, rotate: rot, originX: 0.5, originY: 0.5, filter: "drop-shadow(0 4px 5px rgb(90 60 30 / 0.3))" }}
      />
    </g>
  );
}
