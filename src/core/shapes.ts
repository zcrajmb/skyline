/** A cell offset within a shape's bounding box: [x, y], y grows downwards. */
export type Cell = readonly [number, number];

export interface Shape {
  cells: Cell[];
  w: number;
  h: number;
}

/**
 * Parse a footprint like [".X.", "XXX"] into a shape.
 * Throws on malformed input so bad config fails loudly.
 */
export function parseFootprint(rows: readonly string[]): Shape {
  if (rows.length === 0) throw new Error('Footprint has no rows');
  const w = rows[0].length;
  const cells: Cell[] = [];
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`Footprint row ${y} is ${row.length} wide, expected ${w}`);
    [...row].forEach((ch, x) => {
      if (ch === 'X') cells.push([x, y]);
      else if (ch !== '.') throw new Error(`Footprint has invalid character "${ch}"`);
    });
  });
  if (cells.length === 0) throw new Error('Footprint has no filled cells');
  const shape: Shape = { cells, w, h: rows.length };
  if (!isTight(shape)) throw new Error('Footprint has an empty edge row or column');
  return shape;
}

/** True when every edge row/column of the bounding box has a filled cell. */
export function isTight(s: Shape): boolean {
  const xs = s.cells.map(c => c[0]);
  const ys = s.cells.map(c => c[1]);
  return Math.min(...xs) === 0 && Math.max(...xs) === s.w - 1 &&
         Math.min(...ys) === 0 && Math.max(...ys) === s.h - 1;
}

/** True when all cells form one 4-connected group. */
export function isConnected(cells: readonly Cell[]): boolean {
  if (cells.length === 0) return false;
  const key = (x: number, y: number) => `${x},${y}`;
  const all = new Set(cells.map(([x, y]) => key(x, y)));
  const seen = new Set<string>();
  const stack: Cell[] = [cells[0]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    const k = key(x, y);
    if (seen.has(k) || !all.has(k)) continue;
    seen.add(k);
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen.size === all.size;
}

/** Rotate 90° clockwise: (x, y) in a w×h box -> (h-1-y, x) in an h×w box. */
export function rotateCW(s: Shape): Shape {
  return {
    cells: s.cells.map(([x, y]) => [s.h - 1 - y, x] as const),
    w: s.h,
    h: s.w,
  };
}

/** The four rotation states, index 0 = as authored. */
export function allRotations(s: Shape): Shape[] {
  const out = [s];
  for (let i = 1; i < 4; i++) out.push(rotateCW(out[i - 1]));
  return out;
}

/** Canonical string for a set of cells, used to de-duplicate symmetric rotations. */
export function shapeKey(s: Shape): string {
  return s.cells.map(c => c.join(',')).sort().join(';') + `|${s.w}x${s.h}`;
}
