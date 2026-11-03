import { describe, expect, it } from 'vitest';
import { allRotations, isConnected, isTight, parseFootprint } from '../src/core/shapes';
import { PIECES } from '../src/pieces';

describe('piece config', () => {
  it('has unique ids and names', () => {
    expect(new Set(PIECES.map(p => p.id)).size).toBe(PIECES.length);
    expect(new Set(PIECES.map(p => p.name)).size).toBe(PIECES.length);
  });

  for (const p of PIECES) {
    describe(p.name, () => {
      const shape = parseFootprint(p.footprint);

      it('parses to the right cells and size', () => {
        const xCount = p.footprint.join('').split('').filter(c => c === 'X').length;
        expect(shape.cells).toHaveLength(xCount);
        expect(shape.w).toBe(p.footprint[0].length);
        expect(shape.h).toBe(p.footprint.length);
        for (const [x, y] of shape.cells) expect(p.footprint[y][x]).toBe('X');
      });

      it('is a single connected, tightly bounded group', () => {
        expect(isConnected(shape.cells)).toBe(true);
        expect(isTight(shape)).toBe(true);
      });

      it('keeps its cell count and connectivity through every rotation', () => {
        for (const r of allRotations(shape)) {
          expect(r.cells).toHaveLength(shape.cells.length);
          expect(isConnected(r.cells)).toBe(true);
          expect(isTight(r)).toBe(true);
        }
      });
    });
  }

  it('matches the specified footprints', () => {
    const byId = Object.fromEntries(PIECES.map(p => [p.id, p.footprint.join('/')]));
    expect(byId).toEqual({
      tower: 'X/X/X/X',
      shard: '.X./XXX',
      burj: '.X./.X./XXX',
      walkie: 'XXX/.X.',
      empire: 'X./XX/XX',
      gherkin: '.X./XXX/.X.',
      pisa: 'X./XX/.X',
      eiffel: '.X./XXX/X.X',
    });
  });

  it('rejects malformed footprints', () => {
    expect(() => parseFootprint([])).toThrow();
    expect(() => parseFootprint(['X.', 'X'])).toThrow();
    expect(() => parseFootprint(['X?'])).toThrow();
    expect(() => parseFootprint(['..'])).toThrow();
    expect(() => parseFootprint(['X.', '..'])).toThrow();
  });

  it('detects disconnected shapes', () => {
    expect(isConnected(parseFootprint(['X.X']).cells)).toBe(false);
  });
});
