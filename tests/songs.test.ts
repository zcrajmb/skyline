import { describe, expect, it } from 'vitest';
import * as songs from '../src/audio/songs';
import { parsePhrase, phraseSeconds, songSound, type Song, type SongSound } from '../src/audio/songs';
import type { Synth } from '../src/audio/synth';
import { PIECES } from '../src/pieces';

const SONGS = Object.values(songs).filter(
  (v): v is Song => typeof v === 'object' && v !== null && 'phrases' in v,
);

/** A fake synth that records which frequencies were played, and when. */
function recorder() {
  const notes: number[] = [];
  const fake = {
    solo: (_: string, fn: () => void) => fn(),
    tone: (o: { freq: number }) => notes.push(o.freq),
    bell: (f: number) => notes.push(f),
    pluck: (f: number) => notes.push(f),
    noise: () => {},
  } as unknown as Synth;
  return { fake, notes };
}

describe('songs', () => {
  it('finds all seven songs', () => {
    expect(SONGS.map(s => s.title).sort()).toEqual([
      'God Save the King', 'Greensleeves', 'La Marseillaise', 'La donna è mobile',
      'London Bridge Is Falling Down', "Tala' al-Badru 'Alayna", 'Yankee Doodle',
    ]);
  });

  for (const song of SONGS) {
    describe(song.title, () => {
      it('has phrases that parse', () => {
        expect(song.phrases.length).toBeGreaterThan(0);
        for (const p of song.phrases) expect(parsePhrase(p).length).toBeGreaterThan(0);
      });

      it('keeps every phrase short enough to fit between landings', () => {
        for (const p of song.phrases) {
          const secs = phraseSeconds(song, p);
          expect(secs).toBeGreaterThan(0.5);
          expect(secs).toBeLessThan(3.5);
        }
      });

      it('says where it comes from', () => {
        expect(song.origin.length).toBeGreaterThan(0);
      });
    });
  }

  it('parses notes, lengths and rests', () => {
    expect(parsePhrase('A4/1 r/.5 A5/2')).toEqual([
      { freq: 440, beats: 1 }, { freq: null, beats: 0.5 }, { freq: 880, beats: 2 },
    ]);
    expect(() => parsePhrase('A4/0')).toThrow();
    expect(() => parsePhrase('Q4/1')).toThrow();
  });

  it('plays the next phrase on each landing and wraps round', () => {
    const song: Song = {
      title: 'Test', origin: 'test', bpm: 120,
      voice: (s, f) => s.tone({ freq: f, dur: 0.1 }),
      phrases: ['A4/1', 'A5/1'],
    };
    const play = songSound(song);
    const { fake, notes } = recorder();
    play(fake); play(fake); play(fake);
    expect(notes.map(Math.round)).toEqual([440, 880, 440]);
    expect(play.title).toBe('Test');
  });

  it('gives each landmark the song from its country', () => {
    const tunes = Object.fromEntries(PIECES.map(p => [p.id, (p.sound as Partial<SongSound>).title ?? null]));
    expect(tunes).toEqual({
      tower: null,
      shard: 'God Save the King',
      burj: "Tala' al-Badru 'Alayna",
      walkie: 'London Bridge Is Falling Down',
      empire: 'Yankee Doodle',
      gherkin: 'Greensleeves',
      pisa: 'La donna è mobile',
      eiffel: 'La Marseillaise',
    });
  });
});
