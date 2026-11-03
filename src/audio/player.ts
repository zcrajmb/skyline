import type { GameEvent } from '../core/game';
import type { PieceDef } from '../pieces';
import { load, save } from '../ui/storage';
import {
  gameOver, hardDropThud, holdWhoosh, levelUp, lineClear, rotateClick, type SoundFn,
} from './sounds';
import { Synth } from './synth';

const MUTE_KEY = 'skyline:muted';

/** Owns the audio context and turns game events into sounds. */
export class SoundPlayer {
  muted = load<boolean>(MUTE_KEY, false) === true;
  private synth: Synth | null = null;

  constructor(private readonly pieces: readonly PieceDef[]) {}

  /** Call from a user gesture: browsers only allow audio to start after one. */
  unlock(): void {
    if (!this.synth) {
      try {
        this.synth = new Synth();
        this.synth.setMuted(this.muted);
      } catch {
        return; // no Web Audio — play silently
      }
    }
    this.synth.resume();
  }

  toggle(): boolean {
    this.muted = !this.muted;
    save(MUTE_KEY, this.muted);
    this.synth?.setMuted(this.muted);
    return this.muted;
  }

  play(fn: SoundFn): void {
    if (this.muted || !this.synth) return;
    try {
      fn(this.synth);
    } catch {
      // A failed sound should never break the game.
    }
  }

  handle(events: GameEvent[]): void {
    for (const e of events) {
      switch (e.type) {
        case 'lock':
          if (e.hard) this.play(hardDropThud);
          this.play(this.pieces[e.piece].sound);
          break;
        case 'clear': this.play(lineClear(e.lines)); break;
        case 'levelUp': this.play(levelUp); break;
        case 'rotate': this.play(rotateClick); break;
        case 'hold': this.play(holdWhoosh); break;
        case 'gameOver': this.play(gameOver); break;
      }
    }
  }
}
