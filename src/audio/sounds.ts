/**
 * Sound recipes. City signatures play when a building lands; the rest are
 * general game effects. Each recipe takes the synth and schedules its notes.
 */
import { note, type Synth } from './synth';

export type SoundFn = (s: Synth) => void;

// ---- City signatures ----

/** Generic city: a lift arriving at the floor. */
export const liftDing: SoundFn = s => {
  s.bell(note('E6'), 0, 0.6, 0.12);
  s.bell(note('C6'), 0.12, 0.8, 0.12);
};

/** London: the opening of the Westminster quarters (public-domain chime) on a big bell. */
export const westminsterChime: SoundFn = s => {
  ['G#4', 'F#4', 'E4', 'B3'].forEach((n, i) => s.bell(note(n), i * 0.17, 0.9, 0.16));
};

/** London: a double-decker bus bell, ding-ding. */
export const busBell: SoundFn = s => {
  s.bell(note('G6'), 0, 0.35, 0.13);
  s.bell(note('G6'), 0.13, 0.5, 0.13);
};

/** London: a two-tone Underground door chime. */
export const tubeChime: SoundFn = s => {
  s.tone({ freq: note('A5'), dur: 0.35, gain: 0.24, type: 'triangle' });
  s.tone({ freq: note('F#5'), at: 0.16, dur: 0.5, gain: 0.24, type: 'triangle' });
};

/** Dubai: a quick oud run in the Hijaz mode. */
export const oudHijaz: SoundFn = s => {
  ['D4', 'Eb4', 'F#4', 'G4'].forEach((n, i) => s.pluck(note(n), i * 0.075, 0.9, 0.2, 0.4));
  s.pluck(note('D3'), 0, 1.2, 0.1, 0.2);
};

/** New York: a yellow-cab horn, honk-honk. */
export const taxiHorn: SoundFn = s => {
  for (const at of [0, 0.17]) {
    for (const f of [note('F#4'), note('A#4')]) {
      s.tone({ freq: f, at, dur: 0.13, gain: 0.13, type: 'square', lowpass: 1500, attack: 0.008 });
    }
  }
};

/** Pisa: the campanile's deep bell, sagging slightly as it leans. */
export const leaningBell: SoundFn = s => {
  s.bell(note('G3'), 0, 1.6, 0.26, note('G3') * 0.97);
};

/** Paris: a few bars of musette accordion — three slightly detuned reeds. */
export const musette: SoundFn = s => {
  ['G4', 'B4', 'D5', 'B4'].forEach((n, i) => {
    for (const detune of [-14, 0, 14]) {
      s.tone({
        freq: note(n), at: i * 0.11, dur: i === 3 ? 0.32 : 0.14, gain: 0.09,
        type: 'sawtooth', detune, lowpass: 2200, attack: 0.015,
      });
    }
  });
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
