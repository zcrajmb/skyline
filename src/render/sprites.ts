import type { Shape } from '../core/shapes';
import type { PieceDef } from '../pieces';

/**
 * Renders each piece's art once per (rotation, cell size) into an offscreen canvas.
 * Board cells then copy just their own square out of the sprite, so a building
 * that has been sliced by line clears still shows the right fragment.
 */
export class SpriteCache {
  private cache = new Map<string, HTMLCanvasElement>();

  constructor(private readonly pieces: readonly PieceDef[], private readonly rotations: Shape[][]) {}

  get(piece: number, rot: number, cellPx: number): HTMLCanvasElement {
    const key = `${piece}:${rot}:${cellPx}`;
    let sprite = this.cache.get(key);
    if (!sprite) {
      sprite = this.build(piece, rot, cellPx);
      this.cache.set(key, sprite);
    }
    return sprite;
  }

  clear(): void {
    this.cache.clear();
  }

  private build(piece: number, rot: number, c: number): HTMLCanvasElement {
    const def = this.pieces[piece];
    const base = this.rotations[piece][0];
    const shape = this.rotations[piece][rot];
    const canvas = document.createElement('canvas');
    canvas.width = shape.w * c;
    canvas.height = shape.h * c;
    const ctx = canvas.getContext('2d')!;

    // Map the authored orientation onto the rotated box (clockwise turns).
    const W = base.w * c, H = base.h * c;
    if (rot === 1) { ctx.translate(H, 0); ctx.rotate(Math.PI / 2); }
    else if (rot === 2) { ctx.translate(W, H); ctx.rotate(Math.PI); }
    else if (rot === 3) { ctx.translate(0, W); ctx.rotate(-Math.PI / 2); }
    ctx.scale(c, c);

    // Clip everything to the footprint.
    ctx.beginPath();
    for (const [x, y] of base.cells) ctx.rect(x, y, 1, 1);
    ctx.clip();

    // Plot backing, one slightly inset square per cell so the footprint stays readable.
    for (const fill of [def.lot, 'rgba(255, 236, 210, 0.07)']) {
      ctx.fillStyle = fill;
      for (const [x, y] of base.cells) ctx.fillRect(x + 0.02, y + 0.02, 0.96, 0.96);
    }

    ctx.save();
    def.draw(ctx);
    ctx.restore();

    // Faint cell edges on top, so stacked buildings still read as a grid.
    ctx.strokeStyle = 'rgba(255, 236, 210, 0.07)';
    ctx.lineWidth = 0.03;
    for (const [x, y] of base.cells) ctx.strokeRect(x + 0.03, y + 0.03, 0.94, 0.94);
    return canvas;
  }
}
