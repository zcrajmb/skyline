/**
 * A simple greedy bot for balance testing. For each piece it tries every rotation
 * and column, drops it straight down, and keeps the placement with the lowest cost.
 * Tune WEIGHTS to change its play style.
 */
import { clearLines, collides, COLS, dropY, HIDDEN_ROWS, place, type Grid } from '../src/core/board';
import type { RotationMode } from '../src/core/game';
import { shapeKey, type Shape } from '../src/core/shapes';

export interface Weights {
  /** Per covered empty cell. Large by default: "minimise holes first". */
  holes: number;
  /** Per cell of summed column height: "then height". */
  aggregateHeight: number;
  /** Per cell of the tallest column. */
  maxHeight: number;
  /** Per cell of height difference between neighbouring columns. */
  bumpiness: number;
  /** Per line cleared by the move (negative = reward). */
  linesCleared: number;
}

export const WEIGHTS: Weights = {
  holes: 1000,
  aggregateHeight: 1,
  maxHeight: 0,
  bumpiness: 0,
  linesCleared: 0,
};

export interface BoardStats {
  holes: number;
  aggregateHeight: number;
  maxHeight: number;
  bumpiness: number;
}

export function boardStats(grid: Grid<unknown>): BoardStats {
  const rows = grid.length;
  const heights: number[] = [];
  let holes = 0;
  for (let x = 0; x < COLS; x++) {
    let top = rows;
    for (let y = 0; y < rows; y++) {
      if (grid[y][x] !== null) { top = y; break; }
    }
    heights.push(rows - top);
    for (let y = top + 1; y < rows; y++) if (grid[y][x] === null) holes++;
  }
  let bumpiness = 0;
  for (let x = 1; x < COLS; x++) bumpiness += Math.abs(heights[x] - heights[x - 1]);
  return {
    holes,
    aggregateHeight: heights.reduce((a, b) => a + b, 0),
    maxHeight: Math.max(...heights),
    bumpiness,
  };
}

export interface Placement {
  rot: number;
  x: number;
  y: number;
  cost: number;
}

/** Rotation indexes the bot may use: all distinct ones in Classic, only upright in Upright. */
export function usableRotations(rotations: Shape[], mode: RotationMode): number[] {
  if (mode === 'upright') return [0];
  const seen = new Set<string>();
  const out: number[] = [];
  rotations.forEach((r, i) => {
    const k = shapeKey(r);
    if (!seen.has(k)) { seen.add(k); out.push(i); }
  });
  return out;
}

export function choosePlacement(grid: Grid<number>, rotations: Shape[], mode: RotationMode,
                                weights: Weights = WEIGHTS): Placement | null {
  let best: Placement | null = null;
  for (const rot of usableRotations(rotations, mode)) {
    const shape = rotations[rot];
    const spawnY = Math.max(0, HIDDEN_ROWS - shape.h);
    for (let x = 0; x <= COLS - shape.w; x++) {
      if (collides(grid, shape, x, spawnY)) continue;
      const y = dropY(grid, shape, x, spawnY);
      const trial = grid.map(row => row.slice());
      place(trial, shape, x, y, () => 1);
      const lines = clearLines(trial).length;
      const s = boardStats(trial);
      const cost = weights.holes * s.holes + weights.aggregateHeight * s.aggregateHeight +
        weights.maxHeight * s.maxHeight + weights.bumpiness * s.bumpiness + weights.linesCleared * lines;
      if (!best || cost < best.cost) best = { rot, x, y, cost };
    }
  }
  return best;
}
