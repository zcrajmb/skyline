/**
 * Public-domain tunes, one phrase played per landing. Each time a building
 * lands it plays the next phrase of its song, wrapping round at the end, so
 * a song unfolds across a game. A new phrase cuts off the previous one.
 *
 * Phrase format: space-separated "note/beats", e.g. "G4/1 F#4/1.5 r/.5"
 * (r = rest). Only use melodies that are out of copyright.
 */
import type { SoundFn } from './sounds';
import { note, type Synth } from './synth';

/** Plays one note: frequency in Hz, start offset and length in seconds. */
export type Voice = (s: Synth, freq: number, at: number, dur: number) => void;

export interface Song {
  title: string;
  /** Where it comes from and why it's public domain. */
  origin: string;
  bpm: number;
  voice: Voice;
  phrases: string[];
}

export interface ParsedNote {
  freq: number | null;
  beats: number;
}

export function parsePhrase(phrase: string): ParsedNote[] {
  return phrase.trim().split(/\s+/).map(tok => {
    const [n, b] = tok.split('/');
    const beats = Number(b);
    if (!(beats > 0)) throw new Error(`Bad beat length in "${tok}"`);
    return { freq: n === 'r' ? null : note(n), beats };
  });
}

/** Seconds a phrase lasts at the song's tempo. */
export function phraseSeconds(song: Song, phrase: string): number {
  return parsePhrase(phrase).reduce((t, n) => t + n.beats, 0) * (60 / song.bpm);
}

/** A sound that plays the song's next phrase each time it's triggered. */
export type SongSound = SoundFn & { title: string };

export function songSound(song: Song): SongSound {
  const parsed = song.phrases.map(parsePhrase);
  const beat = 60 / song.bpm;
  let next = 0;
  const fn = ((s: Synth) => {
    const phrase = parsed[next];
    next = (next + 1) % parsed.length;
    s.solo('song', () => {
      let t = 0;
      for (const n of phrase) {
        if (n.freq) song.voice(s, n.freq, t, n.beats * beat);
        t += n.beats * beat;
      }
    });
  }) as SongSound;
  fn.title = song.title;
  return fn;
}

// ---- Instruments ----

/** Church/clock-tower bells. */
const bells: Voice = (s, f, at, dur) => s.bell(f, at, Math.max(0.9, dur * 1.6), 0.12);

/** Music box: bright, quick-decaying tines. */
const musicBox: Voice = (s, f, at, dur) => {
  s.tone({ freq: f * 2, at, dur: dur + 0.35, gain: 0.22, type: 'triangle', attack: 0.002 });
  s.tone({ freq: f * 4, at, dur: 0.25, gain: 0.05, attack: 0.002 });
};

/** Recorder: soft, breathy, slow attack. */
const recorder: Voice = (s, f, at, dur) => {
  s.tone({ freq: f, at, dur: dur * 0.95, gain: 0.26, attack: 0.04 });
  s.tone({ freq: f * 2, at, dur: dur * 0.9, gain: 0.04, type: 'triangle', attack: 0.05 });
  s.noise(at, 0.06, 0.04, f * 3, 2);
};

/** Fife and snare drum. */
const fifeAndDrum: Voice = (s, f, at, dur) => {
  s.tone({ freq: f * 2, at, dur: dur * 0.85, gain: 0.07, type: 'square', lowpass: 3200, attack: 0.01 });
  s.tone({ freq: f * 2, at, dur: dur * 0.85, gain: 0.12, attack: 0.01 });
  s.noise(at, 0.07, 0.18, 2600, 1.2);
};

/** Mandolin: rapid tremolo picking. */
const mandolin: Voice = (s, f, at, dur) => {
  for (let t = 0; t < Math.max(0.07, dur * 0.9); t += 0.065) s.pluck(f * 2, at + t, 0.3, 0.16, 0.8);
};

/** Musette accordion: three slightly detuned reeds. */
const accordion: Voice = (s, f, at, dur) => {
  for (const detune of [-14, 0, 14]) {
    s.tone({ freq: f, at, dur: dur * 0.95, gain: 0.12, type: 'sawtooth', detune, lowpass: 2200, attack: 0.02 });
  }
};

// ---- Songs ----

export const GOD_SAVE_THE_KING: Song = {
  title: 'God Save the King',
  origin: 'British national anthem, traditional, first published 1744',
  bpm: 120,
  voice: bells,
  phrases: [
    'G4/1 G4/1 A4/1 F#4/1.5 G4/.5 A4/1',
    'B4/1 B4/1 C5/1 B4/1.5 A4/.5 G4/1',
    'A4/1 G4/1 F#4/1 G4/3',
    'D5/1 D5/1 D5/1 D5/1.5 C5/.5 B4/1',
    'C5/1 C5/1 C5/1 C5/1.5 B4/.5 A4/1',
    'B4/1 C5/.5 B4/.5 A4/.5 G4/.5 B4/1.5 C5/.5 D5/1',
    'E5/.5 C5/.5 B4/1 A4/1 G4/3',
  ],
};

export const LONDON_BRIDGE: Song = {
  title: 'London Bridge Is Falling Down',
  origin: 'English nursery rhyme, traditional',
  bpm: 150,
  voice: musicBox,
  phrases: [
    'G4/1.5 A4/.5 G4/1 F4/1 E4/1 F4/1 G4/2',
    'D4/1 E4/1 F4/2 E4/1 F4/1 G4/2',
    'G4/1.5 A4/.5 G4/1 F4/1 E4/1 F4/1 G4/2',
    'D4/2 G4/2 E4/1 C4/3',
  ],
};

export const GREENSLEEVES: Song = {
  title: 'Greensleeves',
  origin: 'English folk song, 16th century',
  bpm: 270,
  voice: recorder,
  phrases: [
    'A4/1 C5/2 D5/1 E5/1.5 F5/.5 E5/1',
    'D5/2 B4/1 G4/1.5 A4/.5 B4/1',
    'C5/2 A4/1 A4/1.5 G#4/.5 A4/1',
    'B4/2 G#4/1 E4/3',
  ],
};

export const YANKEE_DOODLE: Song = {
  title: 'Yankee Doodle',
  origin: 'American folk song, 18th century',
  bpm: 230,
  voice: fifeAndDrum,
  phrases: [
    'C4/1 C4/1 D4/1 E4/1 C4/1 E4/1 D4/1 G3/1',
    'C4/1 C4/1 D4/1 E4/1 C4/2 B3/2',
    'C4/1 C4/1 D4/1 E4/1 F4/1 E4/1 D4/1 C4/1',
    'B3/1 G3/1 A3/1 B3/1 C4/2 C4/2',
  ],
};

export const LA_DONNA_E_MOBILE: Song = {
  title: 'La donna è mobile',
  origin: 'Verdi, Rigoletto, 1851',
  bpm: 180,
  voice: mandolin,
  phrases: [
    'G4/1 G4/1 G4/1 Bb4/1.5 A4/.5 F4/2',
    'F4/1 F4/1 F4/1 A4/1.5 G4/.5 E4/2',
  ],
};

export const LA_MARSEILLAISE: Song = {
  title: 'La Marseillaise',
  origin: 'French national anthem, Rouget de Lisle, 1792',
  bpm: 132,
  voice: accordion,
  phrases: [
    'D4/.75 D4/.25 G4/1 G4/1 A4/1 A4/1 D5/1.5 B4/.75 G4/.25',
  ],
};
