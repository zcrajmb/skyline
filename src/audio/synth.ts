/**
 * A tiny Web Audio synth: every sound is generated, so there are no audio files.
 * Times are in seconds relative to "now" unless noted.
 */

export interface ToneOpts {
  freq: number;
  /** Glide to this frequency over the note. */
  freqEnd?: number;
  type?: OscillatorType;
  at?: number;
  dur: number;
  gain?: number;
  attack?: number;
  /** Cents of detune. */
  detune?: number;
  /** Optional low-pass cutoff in Hz. */
  lowpass?: number;
}

export class Synth {
  readonly ctx: AudioContext;
  private master: GainNode;
  private plucks = new Map<string, AudioBuffer>();

  constructor(volume = 0.5) {
    this.ctx = new AudioContext();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    this.master = this.ctx.createGain();
    this.master.gain.value = volume;
    this.master.connect(comp).connect(this.ctx.destination);
  }

  /** Browsers start audio suspended until a user gesture. */
  resume(): void {
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(muted: boolean): void {
    this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.02);
  }

  private t(at = 0): number {
    return this.ctx.currentTime + 0.005 + at;
  }

  /** Gain envelope node: quick attack, exponential decay to silence. */
  private env(start: number, dur: number, peak: number, attack = 0.005): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    g.connect(this.master);
    return g;
  }

  tone(o: ToneOpts): void {
    const start = this.t(o.at);
    const osc = this.ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.freq, start);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, start + o.dur);
    if (o.detune) osc.detune.value = o.detune;
    const out = this.env(start, o.dur, o.gain ?? 0.3, o.attack);
    if (o.lowpass) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lowpass;
      osc.connect(f).connect(out);
    } else {
      osc.connect(out);
    }
    osc.start(start);
    osc.stop(start + o.dur + 0.05);
  }

  /** Struck bell: inharmonic partials that decay at different rates. */
  bell(freq: number, at = 0, dur = 1.2, gain = 0.25, freqEnd?: number): void {
    const partials: [number, number, number][] = [
      // ratio, relative gain, relative length
      [0.5, 0.35, 1.0], [1, 1, 0.9], [2.0, 0.5, 0.6], [2.76, 0.35, 0.45], [5.4, 0.18, 0.25], [8.9, 0.08, 0.15],
    ];
    for (const [ratio, g, len] of partials) {
      this.tone({
        freq: freq * ratio, freqEnd: freqEnd ? freqEnd * ratio : undefined,
        at, dur: dur * len, gain: gain * g, attack: 0.002,
      });
    }
  }

  /** Plucked string (Karplus–Strong), cached per pitch and length. */
  pluck(freq: number, at = 0, dur = 0.8, gain = 0.35, brightness = 0.5): void {
    const key = `${freq.toFixed(1)}:${dur}:${brightness}`;
    let buf = this.plucks.get(key);
    if (!buf) {
      const sr = this.ctx.sampleRate;
      buf = this.ctx.createBuffer(1, Math.ceil(sr * dur), sr);
      const data = buf.getChannelData(0);
      const period = Math.max(2, Math.round(sr / freq));
      const ring = new Float32Array(period);
      // Deterministic noise burst, so the timbre never varies.
      let seed = 12345;
      for (let i = 0; i < period; i++) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        ring[i] = (seed / 4294967296) * 2 - 1;
      }
      // Averaging neighbours low-passes the loop; decay < 1 keeps it stable.
      const decay = 0.992 + Math.min(1, Math.max(0, brightness)) * 0.006;
      for (let i = 0; i < data.length; i++) {
        const j = i % period;
        const next = ring[(j + 1) % period];
        data[i] = ring[j];
        ring[j] = 0.5 * (ring[j] + next) * decay;
      }
      this.plucks.set(key, buf);
    }
    const start = this.t(at);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.master);
    src.start(start);
  }

  /** Filtered noise burst — for whooshes and thuds. */
  noise(at: number, dur: number, gain: number, freq: number, q = 1, type: BiquadFilterType = 'bandpass'): void {
    const start = this.t(at);
    const sr = this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, Math.ceil(sr * dur), sr);
    const data = buf.getChannelData(0);
    let seed = 987654;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = (seed / 4294967296) * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    src.connect(f).connect(this.env(start, dur, gain, 0.01));
    src.start(start);
  }
}

/** Note name to frequency, e.g. "A4" = 440, "F#3", "Eb5". */
export function note(name: string): number {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note ${name}`);
  const base = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1] as 'A'];
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const semis = base + acc + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
}
