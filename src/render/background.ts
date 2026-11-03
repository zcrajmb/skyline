import { mulberry32 } from '../core/rng';
import { fitCanvas } from './renderer';

/** Dusk sky with a faint layered city silhouette. Fixed seed, so it never shifts. */
export function drawBackground(canvas: HTMLCanvasElement): void {
  const { w, h, dpr } = fitCanvas(canvas);
  const ctx = canvas.getContext('2d')!;
  const rng = mulberry32(20261103);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#11152b');
  sky.addColorStop(0.42, '#2e2a52');
  sky.addColorStop(0.72, '#6e4466');
  sky.addColorStop(0.9, '#b8675f');
  sky.addColorStop(1, '#d9875f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Horizon glow.
  const glow = ctx.createRadialGradient(w * 0.62, h * 0.98, 0, w * 0.62, h * 0.98, Math.max(w, h) * 0.6);
  glow.addColorStop(0, 'rgba(255, 190, 130, 0.35)');
  glow.addColorStop(1, 'rgba(255, 190, 130, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // A few early stars.
  for (let i = 0; i < 90; i++) {
    const x = rng() * w, y = rng() * h * 0.45;
    ctx.fillStyle = `rgba(255, 245, 230, ${0.15 + rng() * 0.4})`;
    ctx.fillRect(x, y, dpr * (rng() < 0.15 ? 1.6 : 1), dpr * (rng() < 0.15 ? 1.6 : 1));
  }

  skyline(ctx, rng, w, h, dpr, h * 0.8, h * 0.16, 'rgba(58, 44, 82, 0.55)', 0.04);
  skyline(ctx, rng, w, h, dpr, h * 0.88, h * 0.12, 'rgba(22, 18, 40, 0.85)', 0.1);
}

function skyline(ctx: CanvasRenderingContext2D, rng: () => number, w: number, h: number, dpr: number,
                 base: number, maxH: number, fill: string, litChance: number): void {
  let x = -10 * dpr;
  while (x < w) {
    const bw = (18 + rng() * 46) * dpr;
    const bh = maxH * (0.25 + rng() * 0.75);
    const top = base - bh;
    ctx.fillStyle = fill;
    ctx.fillRect(x, top, bw, h - top);
    // Occasional setback or mast.
    if (rng() < 0.3) ctx.fillRect(x + bw * 0.3, top - bh * 0.15, bw * 0.4, bh * 0.15);
    if (rng() < 0.15) ctx.fillRect(x + bw * 0.48, top - bh * 0.35, Math.max(1, dpr * 1.5), bh * 0.35);
    // Scattered warm windows.
    for (let wy = top + 6 * dpr; wy < h - 4 * dpr; wy += 7 * dpr) {
      for (let wx = x + 4 * dpr; wx < x + bw - 4 * dpr; wx += 6 * dpr) {
        if (rng() < litChance) {
          ctx.fillStyle = `rgba(255, 200, 130, ${0.25 + rng() * 0.35})`;
          ctx.fillRect(wx, wy, 2 * dpr, 2.5 * dpr);
        }
      }
    }
    x += bw + rng() * 6 * dpr;
  }
}
