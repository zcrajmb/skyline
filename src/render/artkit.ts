/**
 * Small drawing helpers for piece art. All coordinates are in cell units:
 * the renderer scales the context so 1 unit = 1 grid cell.
 */

export type Ctx = CanvasRenderingContext2D;

export const WINDOW_LIT = '#ffcf87';
export const WINDOW_WARM = '#f2a65a';
export const WINDOW_DARK = 'rgba(20, 24, 40, 0.55)';

/** Deterministic 0..1 value from integer coords, so window patterns are stable. */
export function noise(i: number, j: number, seed = 0): number {
  let h = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string | CanvasGradient): void {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
}

/** Filled polygon from a flat [x0, y0, x1, y1, ...] list. */
export function poly(ctx: Ctx, pts: number[], fill: string | CanvasGradient): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, stroke: string, width = 0.03): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Vertical gradient between two colours over [y0, y1]. */
export function vgrad(ctx: Ctx, y0: number, y1: number, top: string, bottom: string): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

/** Horizontal gradient — handy for a lit side and a shaded side. */
export function hgrad(ctx: Ctx, x0: number, x1: number, left: string, right: string): CanvasGradient {
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, left);
  g.addColorStop(1, right);
  return g;
}

export interface WindowOpts {
  /** Fraction of windows lit, 0..1. */
  lit?: number;
  seed?: number;
  /** Window size as a fraction of its grid slot. */
  fill?: [number, number];
}

/** A grid of small windows filling the rect (x, y, w, h). */
export function windows(ctx: Ctx, x: number, y: number, w: number, h: number,
                        cols: number, rows: number, opts: WindowOpts = {}): void {
  const { lit = 0.35, seed = 1, fill = [0.5, 0.45] } = opts;
  const sw = w / cols, sh = h / rows;
  const ww = sw * fill[0], wh = sh * fill[1];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const n = noise(i, j, seed);
      ctx.fillStyle = n < lit ? (n < lit * 0.4 ? WINDOW_WARM : WINDOW_LIT) : WINDOW_DARK;
      ctx.fillRect(x + i * sw + (sw - ww) / 2, y + j * sh + (sh - wh) / 2, ww, wh);
    }
  }
}

/** Evenly spaced horizontal lines (floor plates / bands) across a rect. */
export function bands(ctx: Ctx, x: number, y: number, w: number, h: number, count: number,
                      stroke: string, width = 0.025): void {
  for (let i = 1; i < count; i++) line(ctx, x, y + (h * i) / count, x + w, y + (h * i) / count, stroke, width);
}
