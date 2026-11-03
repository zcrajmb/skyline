import { describe, expect, it } from 'vitest';
import { Bag } from '../src/core/bag';
import { Game } from '../src/core/game';
import { hashString, mulberry32 } from '../src/core/rng';
import { PIECES } from '../src/pieces';
import { dailySeed, utcDateKey } from '../src/ui/daily';
import { levelBar, shareText } from '../src/ui/share';

const EIFFEL = PIECES.findIndex(p => p.id === 'eiffel');

function draws(seed: number, n: number, level = 1): number[] {
  const bag = new Bag(mulberry32(seed), PIECES);
  return Array.from({ length: n }, () => bag.next(level));
}

describe('seeded randomiser', () => {
  it('gives an identical piece sequence for the same seed', () => {
    expect(draws(2024, 300)).toEqual(draws(2024, 300));
    const a = new Game({ seed: 77, mode: 'classic', pieces: PIECES });
    const b = new Game({ seed: 77, mode: 'classic', pieces: PIECES });
    expect([a.active!.piece, ...a.queue]).toEqual([b.active!.piece, ...b.queue]);
    a.hardDrop(); b.hardDrop();
    expect([a.active!.piece, ...a.queue]).toEqual([b.active!.piece, ...b.queue]);
  });

  it('gives a different sequence for a different seed', () => {
    expect(draws(1, 50)).not.toEqual(draws(2, 50));
  });

  it('deals every eligible piece exactly once per bag', () => {
    const seq = draws(5, 7 * 4);
    for (let i = 0; i < seq.length; i += 7) {
      expect([...seq.slice(i, i + 7)].sort()).toEqual([0, 1, 2, 3, 4, 5, 6].filter(p => p !== EIFFEL).sort());
    }
  });

  it('excludes the Eiffel Tower below level 5', () => {
    for (let level = 1; level <= 4; level++) expect(draws(9, 700, level)).not.toContain(EIFFEL);
  });

  it('includes the Eiffel Tower from level 5', () => {
    const seq = draws(9, 80, 5);
    expect(seq).toContain(EIFFEL);
    expect(seq.filter(p => p === EIFFEL)).toHaveLength(10); // once per bag of 8
  });
});

describe('daily challenge', () => {
  it('uses the UTC date', () => {
    expect(utcDateKey(new Date('2026-03-05T23:30:00-05:00'))).toBe('2026-03-06');
  });

  it('seeds from a hash of the date', () => {
    expect(dailySeed('2026-11-03')).toBe(hashString('2026-11-03'));
    expect(dailySeed('2026-11-03')).not.toBe(dailySeed('2026-11-04'));
  });

  it('builds a spoiler-free share text', () => {
    const text = shareText({
      date: '2026-11-03', mode: 'upright', score: 12400, lines: 23, level: 3, linesByLevel: [10, 10, 3],
    });
    expect(text).toContain('Skyline Daily 2026-11-03');
    expect(text).toContain('Upright');
    expect(text).toContain('12,400 pts');
    expect(text).toContain('23 lines');
    expect(text).toContain('🟩🟩🟧');
    expect(text).not.toMatch(/https?:/);
  });

  it('marks levels with no clears', () => {
    expect(levelBar([4, 0, 6], 3)).toBe('🟧⬛🟨');
  });
});
