import { describe, expect, it } from 'vitest';
import { clearLines, collides, COLS, createGrid, dropY, place, TOTAL_ROWS } from '../src/core/board';
import { parseFootprint } from '../src/core/shapes';

const tee = parseFootprint(['.X.', 'XXX']);
const bar = parseFootprint(['X', 'X', 'X', 'X']);
const BOTTOM = TOTAL_ROWS - 1;

function fillRow(grid: (number | null)[][], y: number, except: number[] = []): void {
  for (let x = 0; x < COLS; x++) grid[y][x] = except.includes(x) ? null : 9;
}

describe('collision', () => {
  it('allows placement in open space', () => {
    expect(collides(createGrid(), tee, 3, 5)).toBe(false);
  });

  it('blocks the side walls', () => {
    const g = createGrid();
    expect(collides(g, tee, -1, 5)).toBe(true);
    expect(collides(g, tee, COLS - 3, 5)).toBe(false);
    expect(collides(g, tee, COLS - 2, 5)).toBe(true);
  });

  it('blocks the floor and the top', () => {
    const g = createGrid();
    expect(collides(g, bar, 0, TOTAL_ROWS - 4)).toBe(false);
    expect(collides(g, bar, 0, TOTAL_ROWS - 3)).toBe(true);
    expect(collides(g, bar, 0, -1)).toBe(true);
  });

  it('blocks filled cells but not the empty parts of a footprint', () => {
    const g = createGrid<number>();
    g[10][4] = 1;
    expect(collides(g, tee, 3, 9)).toBe(true); // bottom row of tee hits (4,10)
    expect(collides(g, tee, 3, 10)).toBe(true); // top cell of tee hits (4,10)
    g[10][4] = null;
    g[10][3] = 1;
    expect(collides(g, tee, 3, 10)).toBe(false); // (3,10) sits in the tee's empty corner
  });

  it('drops to the stack surface', () => {
    const g = createGrid<number>();
    fillRow(g, BOTTOM);
    expect(dropY(g, tee, 0, 0)).toBe(BOTTOM - 2);
  });
});

describe('line clearing', () => {
  it('clears a full row and drops everything above', () => {
    const g = createGrid<number>();
    fillRow(g, BOTTOM);
    g[BOTTOM - 1][2] = 7;
    const cleared = clearLines(g);
    expect(cleared).toEqual([BOTTOM]);
    expect(g[BOTTOM][2]).toBe(7);
    expect(g[BOTTOM].filter(c => c !== null)).toHaveLength(1);
    expect(g).toHaveLength(TOTAL_ROWS);
  });

  it('leaves incomplete rows alone', () => {
    const g = createGrid<number>();
    fillRow(g, BOTTOM, [5]);
    expect(clearLines(g)).toEqual([]);
    expect(g[BOTTOM].filter(c => c !== null)).toHaveLength(COLS - 1);
  });

  it('clears non-adjacent rows and keeps the row between them', () => {
    const g = createGrid<number>();
    fillRow(g, BOTTOM);
    fillRow(g, BOTTOM - 1, [0]);
    fillRow(g, BOTTOM - 2);
    g[BOTTOM - 3][9] = 3;
    expect(clearLines(g)).toHaveLength(2);
    expect(g[BOTTOM][0]).toBeNull();
    expect(g[BOTTOM][1]).toBe(9);
    expect(g[BOTTOM - 1][9]).toBe(3);
    expect(g[BOTTOM - 2].every(c => c === null)).toBe(true);
  });

  it('place writes values via the factory', () => {
    const g = createGrid<string>();
    place(g, tee, 0, 0, (x, y) => `${x},${y}`);
    expect(g[0][1]).toBe('1,0');
    expect(g[1][0]).toBe('0,1');
    expect(g[0][0]).toBeNull();
  });
});
