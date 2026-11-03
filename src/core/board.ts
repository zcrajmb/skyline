import type { Shape } from './shapes';

export const COLS = 10;
export const VISIBLE_ROWS = 20;
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = VISIBLE_ROWS + HIDDEN_ROWS;

/** Row 0 is the top hidden row; rows HIDDEN_ROWS.. are visible. */
export type Grid<T> = (T | null)[][];

export function createGrid<T>(): Grid<T> {
  return Array.from({ length: TOTAL_ROWS }, () => Array<T | null>(COLS).fill(null));
}

export function emptyRow<T>(): (T | null)[] {
  return Array<T | null>(COLS).fill(null);
}

/** True if the shape at (x, y) would leave the board or overlap a filled cell. */
export function collides<T>(grid: Grid<T>, shape: Shape, x: number, y: number): boolean {
  for (const [cx, cy] of shape.cells) {
    const gx = x + cx;
    const gy = y + cy;
    if (gx < 0 || gx >= COLS || gy < 0 || gy >= grid.length) return true;
    if (grid[gy][gx] !== null) return true;
  }
  return false;
}

/** Lowest y the shape can drop to from (x, y). */
export function dropY<T>(grid: Grid<T>, shape: Shape, x: number, y: number): number {
  while (!collides(grid, shape, x, y + 1)) y++;
  return y;
}

/** Write a shape into the grid. `make` builds the stored value for each cell. */
export function place<T>(
  grid: Grid<T>, shape: Shape, x: number, y: number,
  make: (localX: number, localY: number) => T,
): void {
  for (const [cx, cy] of shape.cells) grid[y + cy][x + cx] = make(cx, cy);
}

/** Remove full rows (mutating), shifting everything above down. Returns cleared row indexes. */
export function clearLines<T>(grid: Grid<T>): number[] {
  const cleared: number[] = [];
  for (let y = 0; y < grid.length; y++) {
    if (grid[y].every(c => c !== null)) cleared.push(y);
  }
  for (const y of cleared) {
    grid.splice(y, 1);
    grid.unshift(emptyRow<T>());
  }
  return cleared;
}
