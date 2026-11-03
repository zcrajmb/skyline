import { COLS, HIDDEN_ROWS, TOTAL_ROWS, VISIBLE_ROWS } from '../core/board';
import type { Game } from '../core/game';
import type { PieceDef } from '../pieces';
import { SpriteCache } from './sprites';

const FLASH_MS = 260;

/** Size a canvas's backing store to its CSS box at device resolution. */
export function fitCanvas(canvas: HTMLCanvasElement): { w: number; h: number; dpr: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width * dpr));
  const h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return { w, h, dpr };
}

export class BoardRenderer {
  private ctx: CanvasRenderingContext2D;
  private cell = 0;
  private ox = 0;
  private oy = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly sprites: SpriteCache) {
    this.ctx = canvas.getContext('2d')!;
  }

  /** Call after layout changes. */
  resize(): void {
    const { w, h, dpr } = fitCanvas(this.canvas);
    const margin = Math.ceil(3 * dpr); // room for the frame
    this.cell = Math.max(4, Math.floor(Math.min((w - 2 * margin) / COLS, (h - 2 * margin) / VISIBLE_ROWS)));
    this.ox = Math.floor((w - this.cell * COLS) / 2);
    this.oy = Math.floor((h - this.cell * VISIBLE_ROWS) / 2);
  }

  /** CSS pixels per cell, used by touch input to map drags to columns. */
  cellCssPx(): number {
    return this.cell / Math.min(window.devicePixelRatio || 1, 3);
  }

  draw(game: Game | null): void {
    const { ctx, cell: c, ox, oy } = this;
    const bw = c * COLS, bh = c * VISIBLE_ROWS;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Well.
    ctx.fillStyle = 'rgba(12, 14, 30, 0.86)';
    ctx.fillRect(ox, oy, bw, bh);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < COLS; x++) { ctx.moveTo(ox + x * c + 0.5, oy); ctx.lineTo(ox + x * c + 0.5, oy + bh); }
    for (let y = 1; y < VISIBLE_ROWS; y++) { ctx.moveTo(ox, oy + y * c + 0.5); ctx.lineTo(ox + bw, oy + y * c + 0.5); }
    ctx.stroke();

    if (game) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, bw, bh);
      ctx.clip();
      this.drawLocked(game);
      this.drawFlash(game);
      this.drawGhost(game);
      this.drawActive(game);
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(255, 214, 170, 0.22)';
    ctx.lineWidth = Math.max(1, c * 0.05);
    ctx.strokeRect(ox - ctx.lineWidth / 2, oy - ctx.lineWidth / 2, bw + ctx.lineWidth, bh + ctx.lineWidth);
  }

  private drawLocked(game: Game): void {
    const { ctx, cell: c, ox, oy } = this;
    for (let y = HIDDEN_ROWS; y < TOTAL_ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const cell = game.grid[y][x];
        if (!cell) continue;
        const sprite = this.sprites.get(cell.piece, cell.rot, c);
        ctx.drawImage(sprite, cell.lx * c, cell.ly * c, c, c, ox + x * c, oy + (y - HIDDEN_ROWS) * c, c, c);
      }
    }
  }

  private drawFlash(game: Game): void {
    const lc = game.lastClear;
    if (!lc) return;
    const t = (game.elapsed - lc.at) / FLASH_MS;
    if (t >= 1) return;
    const { ctx, cell: c, ox, oy } = this;
    ctx.fillStyle = `rgba(255, 214, 150, ${0.45 * (1 - t)})`;
    for (const row of lc.rows) {
      if (row >= HIDDEN_ROWS) ctx.fillRect(ox, oy + (row - HIDDEN_ROWS) * c, c * COLS, c);
    }
  }

  private drawGhost(game: Game): void {
    const a = game.active;
    const gy = game.ghostY();
    if (!a || gy === null || gy === a.y || game.over) return;
    const { ctx, cell: c, ox, oy } = this;
    const lw = Math.max(1, c * 0.06);
    ctx.lineWidth = lw;
    ctx.strokeStyle = 'rgba(255, 207, 135, 0.45)';
    ctx.fillStyle = 'rgba(255, 207, 135, 0.07)';
    for (const [cx, cy] of game.shapeOf(a).cells) {
      const px = ox + (a.x + cx) * c, py = oy + (gy + cy - HIDDEN_ROWS) * c;
      ctx.fillRect(px, py, c, c);
      ctx.strokeRect(px + lw / 2 + 1, py + lw / 2 + 1, c - lw - 2, c - lw - 2);
    }
  }

  private drawActive(game: Game): void {
    const a = game.active;
    if (!a) return;
    const { ctx, cell: c, ox, oy } = this;
    const sprite = this.sprites.get(a.piece, a.rot, c);
    ctx.drawImage(sprite, ox + a.x * c, oy + (a.y - HIDDEN_ROWS) * c);
  }
}

/** Draws one piece centred in a small preview canvas (hold / next queue). */
export function drawPreview(canvas: HTMLCanvasElement, sprites: SpriteCache, pieces: readonly PieceDef[],
                            footprints: { w: number; h: number }[], piece: number | null, dim = false): void {
  const { w, h } = fitCanvas(canvas);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (piece === null || !pieces[piece]) return;
  const fp = footprints[piece];
  const c = Math.max(4, Math.floor(Math.min(w / (fp.w + 0.6), h / (fp.h + 0.6))));
  const sprite = sprites.get(piece, 0, c);
  ctx.globalAlpha = dim ? 0.35 : 1;
  ctx.drawImage(sprite, Math.round((w - sprite.width) / 2), Math.round((h - sprite.height) / 2));
  ctx.globalAlpha = 1;
}
