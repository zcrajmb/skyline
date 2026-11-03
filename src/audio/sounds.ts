/**
 * One-off sound recipes: landing sounds for pieces without a song, and general
 * game effects. Each recipe takes the synth and schedules its notes.
 * Songs (one phrase per landing) live in songs.ts.
 */
import { note, type Synth } from './synth';

export type SoundFn = (s: Synth) => void;

// ---- Landing sounds for pieces without a song ----

/** Generic city: a lift arriving at the floor. */
export const liftDing: SoundFn = s => {
  s.bell(note('E6'), 0, 0.6, 0.12);
  s.bell(note('C6'), 0.12, 0.8, 0.12);
};

// ---- Game effects ----

export const rotateClick: SoundFn = s => {
  s.tone({ freq: 1400, freqEnd: 900, dur: 0.05, gain: 0.12, type: 'triangle' });
};

export const holdWhoosh: SoundFn = s => {
  s.noise(0, 0.2, 0.5, 1800, 0.8);
};

export const hardDropThud: SoundFn = s => {
  s.tone({ freq: 110, freqEnd: 45, dur: 0.2, gain: 0.6 });
  s.noise(0, 0.08, 0.3, 400, 0.7, 'lowpass');
};

/** Rising arpeggio that climbs higher the more lines cleared, with a shimmer on four. */
export function lineClear(lines: number): SoundFn {
  const notes = ['C5', 'E5', 'G5', 'C6'].slice(0, Math.min(4, Math.max(1, lines) + 1));
  return s => {
    notes.forEach((n, i) => s.tone({ freq: note(n), at: i * 0.06, dur: 0.45, gain: 0.32, type: 'triangle' }));
    if (lines >= 4) s.noise(0.2, 0.6, 0.05, 6000, 0.5);
  };
}

export const levelUp: SoundFn = s => {
  ['G4', 'C5', 'E5', 'G5'].forEach((n, i) => s.tone({
    freq: note(n), at: 0.25 + i * 0.09, dur: 0.4, gain: 0.1, type: 'square', lowpass: 2600,
  }));
};

export const gameOver: SoundFn = s => {
  ['E4', 'C4', 'A3', 'F3'].forEach((n, i) => s.tone({
    freq: note(n), at: i * 0.22, dur: 0.5, gain: 0.12, type: 'triangle',
  }));
};
