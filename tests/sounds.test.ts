import { describe, expect, it } from 'vitest';
import { note } from '../src/audio/synth';
import { PIECES } from '../src/pieces';

describe('sounds', () => {
  it('converts note names to frequencies', () => {
    expect(note('A4')).toBeCloseTo(440);
    expect(note('A5')).toBeCloseTo(880);
    expect(note('C4')).toBeCloseTo(261.63, 1);
    expect(note('F#3')).toBeCloseTo(185.0, 1);
    expect(note('Eb4')).toBeCloseTo(311.13, 1);
    expect(() => note('H2')).toThrow();
  });

  it('gives every piece a city and a landing sound', () => {
    for (const p of PIECES) {
      expect(p.city.length).toBeGreaterThan(0);
      expect(typeof p.sound).toBe('function');
    }
  });

  it('matches each landmark to its city', () => {
    expect(Object.fromEntries(PIECES.map(p => [p.id, p.city]))).toEqual({
      tower: 'Anytown',
      shard: 'London',
      burj: 'Dubai',
      walkie: 'London',
      empire: 'New York',
      gherkin: 'London',
      pisa: 'Pisa',
      eiffel: 'Paris',
    });
  });
});
