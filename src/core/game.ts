import { Bag } from './bag';
import {
  clearLines, collides, COLS, createGrid, dropY, HIDDEN_ROWS, place, type Grid,
} from './board';
import { mulberry32 } from './rng';
import { allRotations, parseFootprint, type Shape } from './shapes';

/** The parts of a piece definition the rules care about (no art). */
export interface PieceSpec {
  id: string;
  name: string;
  footprint: readonly string[];
  minLevel?: number;
}

export type RotationMode = 'classic' | 'upright';

export interface GameOptions {
  seed: number;
  mode: RotationMode;
  pieces: readonly PieceSpec[];
  startLevel?: number;
}

/** What a locked board cell remembers: which building, and which part of it. */
export interface LockedCell {
  piece: number;
  rot: number;
  /** This cell's position inside the piece's (rotated) bounding box. */
  lx: number;
  ly: number;
}

export interface Active {
  piece: number;
  rot: number;
  x: number;
  y: number;
}

export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const LINES_PER_LEVEL = 10;
export const QUEUE_SIZE = 3;
/** Points for 0/1/2/3/4+ lines, multiplied by level. */
export const LINE_SCORES = [0, 100, 300, 500, 800];
/** Wall kicks tried in order after a rotation. */
export const KICKS: readonly (readonly [number, number])[] = [
  [0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1],
];

/** Milliseconds per gravity step at a level. */
export function gravityMs(level: number): number {
  return Math.max(50, 900 * Math.pow(0.85, level - 1));
}

export function scoreForLines(n: number, level: number): number {
  return LINE_SCORES[Math.min(n, 4)] * level;
}

/** Things that happened, for sound and effects. Drained by the UI each frame. */
export type GameEvent =
  | { type: 'lock'; piece: number; hard: boolean }
  | { type: 'clear'; lines: number }
  | { type: 'levelUp'; level: number }
  | { type: 'rotate' }
  | { type: 'hold' }
  | { type: 'gameOver' };

/** Pre-computes the four rotations of every piece's footprint. */
export function compileRotations(pieces: readonly PieceSpec[]): Shape[][] {
  return pieces.map(p => allRotations(parseFootprint(p.footprint)));
}

export class Game {
  readonly mode: RotationMode;
  readonly seed: number;
  readonly pieces: readonly PieceSpec[];
  readonly rotations: Shape[][];
  readonly startLevel: number;

  grid: Grid<LockedCell> = createGrid<LockedCell>();
  active: Active | null = null;
  hold: number | null = null;
  holdUsed = false;
  queue: number[] = [];
  score = 0;
  lines = 0;
  level: number;
  /** Lines cleared while at each level; index 0 = level 1. */
  linesByLevel: number[] = [];
  piecesPlaced = 0;
  over = false;
  /** Game-clock time in ms (advances only through update). */
  elapsed = 0;
  /** Most recent line clear, for the renderer's flash. */
  lastClear: { rows: number[]; at: number } | null = null;

  private events: GameEvent[] = [];
  private bag: Bag;
  private gravityAcc = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private lowestY = 0;

  constructor(opts: GameOptions) {
    this.mode = opts.mode;
    this.seed = opts.seed;
    this.pieces = opts.pieces;
    this.rotations = compileRotations(opts.pieces);
    this.startLevel = opts.startLevel ?? 1;
    this.level = this.startLevel;
    this.bag = new Bag(mulberry32(opts.seed), opts.pieces);
    for (let i = 0; i < QUEUE_SIZE; i++) this.queue.push(this.bag.next(this.level));
    this.spawn(this.takeFromQueue());
  }

  shapeOf(a: Active): Shape {
    return this.rotations[a.piece][a.rot];
  }

  get activeShape(): Shape | null {
    return this.active ? this.shapeOf(this.active) : null;
  }

  /** Returns and clears the events since the last call. */
  drainEvents(): GameEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  // ---- player actions; each returns true if it did something ----

  move(dx: number): boolean {
    const a = this.active;
    if (!a || this.over) return false;
    if (collides(this.grid, this.shapeOf(a), a.x + dx, a.y)) return false;
    a.x += dx;
    this.onManipulated();
    return true;
  }

  rotate(dir: 1 | -1): boolean {
    const a = this.active;
    if (!a || this.over || this.mode === 'upright') return false;
    const from = this.shapeOf(a);
    const rot = (a.rot + dir + 4) % 4;
    const to = this.rotations[a.piece][rot];
    // Keep the piece roughly centred on its old box; trunc avoids drift over a full turn.
    const bx = a.x + Math.trunc((from.w - to.w) / 2);
    const by = a.y + Math.trunc((from.h - to.h) / 2);
    for (const [kx, ky] of KICKS) {
      if (!collides(this.grid, to, bx + kx, by + ky)) {
        a.rot = rot;
        a.x = bx + kx;
        a.y = by + ky;
        this.onManipulated();
        this.events.push({ type: 'rotate' });
        return true;
      }
    }
    return false;
  }

  softDrop(): boolean {
    const a = this.active;
    if (!a || this.over || this.isGrounded()) return false;
    a.y++;
    this.score += 1;
    this.gravityAcc = 0;
    this.onDescended();
    return true;
  }

  hardDrop(): void {
    const a = this.active;
    if (!a || this.over) return;
    const y = dropY(this.grid, this.shapeOf(a), a.x, a.y);
    this.score += (y - a.y) * 2;
    a.y = y;
    this.lock(true);
  }

  holdPiece(): boolean {
    const a = this.active;
    if (!a || this.over || this.holdUsed) return false;
    const current = a.piece;
    this.spawn(this.hold ?? this.takeFromQueue());
    this.hold = current;
    this.holdUsed = true;
    this.events.push({ type: 'hold' });
    return true;
  }

  // ---- time ----

  update(dt: number): void {
    const a = this.active;
    if (!a || this.over) return;
    this.elapsed += dt;
    if (this.isGrounded()) {
      this.lockTimer += dt;
      if (this.lockTimer >= LOCK_DELAY_MS) this.lock();
      return;
    }
    this.gravityAcc += dt;
    const step = gravityMs(this.level);
    while (this.gravityAcc >= step && !this.isGrounded()) {
      this.gravityAcc -= step;
      a.y++;
      this.onDescended();
    }
    if (this.isGrounded()) this.gravityAcc = 0;
  }

  ghostY(): number | null {
    const a = this.active;
    return a ? dropY(this.grid, this.shapeOf(a), a.x, a.y) : null;
  }

  isGrounded(): boolean {
    const a = this.active;
    return !!a && collides(this.grid, this.shapeOf(a), a.x, a.y + 1);
  }

  // ---- internals ----

  /** Successful move/rotate while on the ground buys more lock time, up to the cap. */
  private onManipulated(): void {
    if ((this.isGrounded() || this.lockTimer > 0) && this.lockResets < MAX_LOCK_RESETS) {
      this.lockTimer = 0;
      this.lockResets++;
    }
    this.onDescended();
  }

  /** Reaching a new lowest row refreshes lock delay and its reset budget. */
  private onDescended(): void {
    const a = this.active!;
    if (a.y > this.lowestY) {
      this.lowestY = a.y;
      this.lockTimer = 0;
      this.lockResets = 0;
    }
  }

  private takeFromQueue(): number {
    const p = this.queue.shift()!;
    this.queue.push(this.bag.next(this.level));
    return p;
  }

  private spawn(piece: number): void {
    const shape = this.rotations[piece][0];
    const x = Math.floor((COLS - shape.w) / 2);
    let y = Math.max(0, HIDDEN_ROWS - shape.h);
    this.active = { piece, rot: 0, x, y };
    this.gravityAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    if (collides(this.grid, shape, x, y)) {
      this.endGame(); // block out
      return;
    }
    // Drop one row straight away so the piece is visible immediately.
    if (!collides(this.grid, shape, x, y + 1)) y++;
    this.active.y = y;
    this.lowestY = y;
  }

  private endGame(): void {
    this.over = true;
    this.events.push({ type: 'gameOver' });
  }

  private lock(hard = false): void {
    const a = this.active!;
    const shape = this.shapeOf(a);
    place(this.grid, shape, a.x, a.y, (lx, ly) => ({ piece: a.piece, rot: a.rot, lx, ly }));
    this.piecesPlaced++;
    this.events.push({ type: 'lock', piece: a.piece, hard });
    // Lock out: the whole piece came to rest above the visible field.
    if (shape.cells.every(([, cy]) => a.y + cy < HIDDEN_ROWS)) {
      this.endGame();
      return;
    }
    const rows = clearLines(this.grid);
    if (rows.length) {
      const before = this.level;
      this.score += scoreForLines(rows.length, this.level);
      this.linesByLevel[this.level - 1] = (this.linesByLevel[this.level - 1] ?? 0) + rows.length;
      this.lines += rows.length;
      this.level = Math.max(this.startLevel, Math.floor(this.lines / LINES_PER_LEVEL) + 1);
      this.lastClear = { rows, at: this.elapsed };
      this.events.push({ type: 'clear', lines: rows.length });
      if (this.level > before) this.events.push({ type: 'levelUp', level: this.level });
    }
    this.holdUsed = false;
    this.spawn(this.takeFromQueue());
  }
}
