import * as THREE from "three";
import { mulberry32 } from "./math";

/**
 * Procedurally drawn "messy paperwork" atlas: spreadsheets, report pages and
 * raw number sheets. Drawn once on a 2D canvas -> a single texture, so the whole
 * pile renders in one instanced draw call.
 */
export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 3;
const CELL_W = 256;
const CELL_H = 320;

const INK = "#4a3f36";
const INK_SOFT = "#9a8d80";
const HILITE = ["#f1dcae", "#efc6b6", "#d6e0c0", "#c9d9f3", "#e4d3bf"];
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function paper(ctx: CanvasRenderingContext2D, x: number, y: number, tone: string) {
  ctx.fillStyle = tone;
  ctx.fillRect(x, y, CELL_W, CELL_H);
  // faint paper grain edge
  ctx.strokeStyle = "rgba(120,90,60,0.4)";
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, CELL_W - 3, CELL_H - 3);
}

function num(rand: () => number) {
  const r = rand();
  if (r < 0.25) return (rand() * 100).toFixed(1) + "%";
  if (r < 0.5) return String(Math.floor(rand() * 9000 + 100));
  if (r < 0.75) return (rand() * 10).toFixed(2);
  return String(Math.floor(rand() * 99));
}

function spreadsheet(ctx: CanvasRenderingContext2D, x: number, y: number, rand: () => number, v: number) {
  paper(ctx, x, y, v % 2 ? "#fbf7f0" : "#f6efe3");
  const cols = 4 + (v % 3);
  const rows = 15;
  const pad = 10;
  const cw = (CELL_W - pad * 2) / cols;
  const rh = (CELL_H - pad * 2 - 18) / rows;

  // header
  ctx.fillStyle = v % 2 ? "#2f66d4" : "#9c8167";
  ctx.fillRect(x + pad, y + pad, CELL_W - pad * 2, 18);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let c = 0; c < cols; c++) ctx.fillRect(x + pad + c * cw + 6, y + pad + 6, cw * 0.55, 5);

  ctx.font = `10px ${MONO}`;
  ctx.textBaseline = "middle";
  for (let r = 0; r < rows; r++) {
    const ry = y + pad + 18 + r * rh;
    if (rand() < 0.28) {
      ctx.fillStyle = HILITE[Math.floor(rand() * HILITE.length)] + "cc";
      const cc = Math.floor(rand() * cols);
      ctx.fillRect(x + pad + cc * cw, ry, cw * (rand() < 0.3 ? 2 : 1), rh);
    }
    for (let c = 0; c < cols; c++) {
      if (rand() < 0.12) continue; // missing values
      ctx.fillStyle = rand() < 0.1 ? "#c2410c" : INK;
      ctx.fillText(num(rand), x + pad + c * cw + 4, ry + rh / 2);
    }
  }
  // grid
  ctx.strokeStyle = "rgba(130,105,80,0.45)";
  ctx.lineWidth = 1;
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(x + pad + c * cw, y + pad + 18);
    ctx.lineTo(x + pad + c * cw, y + CELL_H - pad);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(x + pad, y + pad + 18 + r * rh);
    ctx.lineTo(x + CELL_W - pad, y + pad + 18 + r * rh);
    ctx.stroke();
  }
}

function report(ctx: CanvasRenderingContext2D, x: number, y: number, rand: () => number, v: number) {
  paper(ctx, x, y, "#fffdf9");
  const pad = 16;
  // title + subtitle
  ctx.fillStyle = INK;
  ctx.fillRect(x + pad, y + pad, 120 + rand() * 60, 12);
  ctx.fillStyle = INK_SOFT;
  ctx.fillRect(x + pad, y + pad + 20, 90, 6);

  // chart block
  const cx = x + pad;
  const cy = y + 62;
  const cw = CELL_W - pad * 2;
  const ch = 90;
  ctx.fillStyle = "#efe6d9";
  ctx.fillRect(cx, cy, cw, ch);
  if (v % 2 === 0) {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const h = 14 + rand() * (ch - 28);
      ctx.fillStyle = i % 3 === 0 ? "#2f66d4" : "#7aa2e8";
      ctx.fillRect(cx + 10 + i * ((cw - 20) / n), cy + ch - 8 - h, (cw - 20) / n - 6, h);
    }
  } else {
    ctx.strokeStyle = "#bb5a26";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const px = cx + 8 + (i / 10) * (cw - 16);
      const py = cy + 12 + rand() * (ch - 30);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // body text
  ctx.fillStyle = INK_SOFT;
  for (let i = 0; i < 9; i++) {
    const w = (CELL_W - pad * 2) * (0.5 + rand() * 0.5);
    ctx.fillRect(x + pad, y + 170 + i * 15, i === 8 ? w * 0.4 : w, 5);
  }
  // red scribbles / flags
  if (rand() < 0.7) {
    ctx.strokeStyle = "#bb5a26";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 180 + rand() * 30, y + 200 + rand() * 40, 16, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function rawNumbers(ctx: CanvasRenderingContext2D, x: number, y: number, rand: () => number, v: number) {
  paper(ctx, x, y, v % 2 ? "#f3ede3" : "#f8f1e5");
  ctx.textBaseline = "top";
  for (let i = 0; i < 26; i++) {
    const size = 11 + Math.floor(rand() * 20);
    ctx.font = `${rand() < 0.3 ? "700" : "500"} ${size}px ${MONO}`;
    ctx.fillStyle = rand() < 0.15 ? "#c2410c" : rand() < 0.4 ? INK : INK_SOFT;
    ctx.fillText(num(rand), x + 10 + rand() * 150, y + 8 + (i / 26) * (CELL_H - 30) + rand() * 6);
  }
}

export function createSheetAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = CELL_W * ATLAS_COLS;
  canvas.height = CELL_H * ATLAS_ROWS;
  const ctx = canvas.getContext("2d")!;
  const rand = mulberry32(2024);

  const drawers = [
    spreadsheet, spreadsheet, spreadsheet, spreadsheet,
    report, report, report, report,
    rawNumbers, rawNumbers, spreadsheet, report,
  ];
  drawers.forEach((draw, i) => {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    ctx.save();
    ctx.beginPath();
    ctx.rect(col * CELL_W, row * CELL_H, CELL_W, CELL_H);
    ctx.clip();
    draw(ctx, col * CELL_W, row * CELL_H, rand, i);
    ctx.restore();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export const ATLAS_VARIANTS = ATLAS_COLS * ATLAS_ROWS;
