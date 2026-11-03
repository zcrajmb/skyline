import { describe, expect, it } from 'vitest';
import { COLS, TOTAL_ROWS } from '../src/core/board';
import { Game, LOCK_DELAY_MS, type LockedCell, type RotationMode } from '../src/core/game';
import { PIECES } from '../src/pieces';

const idx = (id: string) => PIECES.findIndex(p => p.id === id);
const TOWER = idx('tower');
const SHARD = idx('shard');
const BOTTOM = TOTAL_ROWS - 1;
const junk: LockedCell = { piece: 0, rot: 0, lx: 0, ly: 0 };

function newGame(mode: RotationMode = 'classic', seed = 123): Game {
  return new Game({ seed, mode, pieces: PIECES });
}

describe('hold', () => {
  it('stores the current piece and brings in the next one', () => {
    const g = newGame();
    const first = g.active!.piece;
    const next = g.queue[0];
    expect(g.holdPiece()).toBe(true);
    expect(g.hold).toBe(first);
    expect(g.active!.piece).toBe(next);
  });

  it('can only be used once per piece', () => {
    const g = newGame();
    expect(g.holdPiece()).toBe(true);
    const held = g.hold;
    const active = g.active!.piece;
    expect(g.holdPiece()).toBe(false);
    expect(g.hold).toBe(held);
    expect(g.active!.piece).toBe(active);
  });

  it('is available again after a piece locks, and swaps with the held piece', () => {
    const g = newGame();
    const first = g.active!.piece;
    g.holdPiece();
    g.hardDrop();
    const current = g.active!.piece;
    expect(g.holdPiece()).toBe(true);
    expect(g.active!.piece).toBe(first);
    expect(g.active!.rot).toBe(0);
    expect(g.hold).toBe(current);
  });
});

describe('rotation modes', () => {
  it('Upright blocks rotation entirely', () => {
    const g = newGame('upright');
    g.active = { piece: SHARD, rot: 0, x: 4, y: 8 };
    expect(g.rotate(1)).toBe(false);
    expect(g.rotate(-1)).toBe(false);
    expect(g.active).toEqual({ piece: SHARD, rot: 0, x: 4, y: 8 });
  });

  it('Classic rotates, and four turns return to the start', () => {
    const g = newGame('classic');
    g.active = { piece: SHARD, rot: 0, x: 4, y: 8 };
    expect(g.rotate(1)).toBe(true);
    expect(g.active.rot).toBe(1);
    g.rotate(1); g.rotate(1); g.rotate(1);
    expect(g.active).toEqual({ piece: SHARD, rot: 0, x: 4, y: 8 });
  });

  it('Classic kicks off the wall', () => {
    const g = newGame('classic');
    // Vertical tower against the right wall: turning flat needs a kick left.
    g.active = { piece: TOWER, rot: 0, x: COLS - 1, y: 8 };
    expect(g.rotate(1)).toBe(true);
    const s = g.activeShape!;
    expect(g.active.x + s.w).toBeLessThanOrEqual(COLS);
  });
});

describe('line clears and scoring', () => {
  it('scores four lines with a tower block', () => {
    const g = newGame();
    for (let y = BOTTOM - 3; y <= BOTTOM; y++) {
      for (let x = 1; x < COLS; x++) g.grid[y][x] = junk;
    }
    g.active = { piece: TOWER, rot: 0, x: 0, y: 2 };
    g.hardDrop();
    expect(g.lines).toBe(4);
    // 800 × level 1, plus 2 per cell hard-dropped (from row 2 to row 18).
    expect(g.score).toBe(800 + (BOTTOM - 3 - 2) * 2);
    expect(g.grid.slice(BOTTOM - 3).every(row => row.every(c => c === null))).toBe(true);
    expect(g.linesByLevel[0]).toBe(4);
  });

  it('levels up every 10 lines', () => {
    const g = newGame();
    g.lines = 9;
    for (let x = 1; x < COLS; x++) g.grid[BOTTOM][x] = junk;
    g.active = { piece: TOWER, rot: 0, x: 0, y: 2 };
    g.hardDrop();
    expect(g.lines).toBe(10);
    expect(g.level).toBe(2);
  });
});

describe('lock delay', () => {
  function grounded(): Game {
    const g = newGame();
    g.active = { piece: TOWER, rot: 0, x: 4, y: BOTTOM - 3 };
    return g;
  }

  it('locks only after the delay', () => {
    const g = grounded();
    g.update(LOCK_DELAY_MS - 1);
    expect(g.piecesPlaced).toBe(0);
    g.update(2);
    expect(g.piecesPlaced).toBe(1);
  });

  it('resets on a successful move', () => {
    const g = grounded();
    g.update(LOCK_DELAY_MS - 100);
    expect(g.move(1)).toBe(true);
    g.update(LOCK_DELAY_MS - 100);
    expect(g.piecesPlaced).toBe(0);
  });

  it('stops resetting after the cap', () => {
    const g = grounded();
    for (let i = 0; i < 14; i++) {
      g.update(LOCK_DELAY_MS - 100);
      g.move(i % 2 ? 1 : -1);
    }
    expect(g.piecesPlaced).toBe(0);
    for (let i = 0; i < 6; i++) {
      g.update(LOCK_DELAY_MS - 100);
      g.move(i % 2 ? 1 : -1);
    }
    expect(g.piecesPlaced).toBe(1);
  });
});

describe('events', () => {
  it('reports the landed piece, line clears and level-ups', () => {
    const g = newGame();
    g.lines = 9;
    for (let x = 1; x < COLS; x++) g.grid[BOTTOM][x] = junk;
    g.active = { piece: TOWER, rot: 0, x: 0, y: 2 };
    g.drainEvents();
    g.hardDrop();
    expect(g.drainEvents()).toEqual([
      { type: 'lock', piece: TOWER, hard: true },
      { type: 'clear', lines: 1 },
      { type: 'levelUp', level: 2 },
    ]);
    expect(g.drainEvents()).toEqual([]);
  });

  it('reports rotate and hold only when they succeed', () => {
    const g = newGame('upright');
    g.rotate(1);
    g.holdPiece();
    g.holdPiece();
    expect(g.drainEvents()).toEqual([{ type: 'hold' }]);
  });

  it('reports a soft lock as not hard', () => {
    const g = newGame();
    g.active = { piece: TOWER, rot: 0, x: 4, y: BOTTOM - 3 };
    g.update(LOCK_DELAY_MS + 1);
    expect(g.drainEvents()[0]).toEqual({ type: 'lock', piece: TOWER, hard: false });
  });
});

describe('game over', () => {
  it('ends when a piece locks entirely above the visible field (lock out)', () => {
    const g = newGame();
    for (let y = 2; y <= BOTTOM; y++) {
      for (let x = 0; x < COLS - 1; x++) g.grid[y][x] = junk;
    }
    g.active = { piece: SHARD, rot: 0, x: 0, y: 0 };
    g.hardDrop();
    expect(g.over).toBe(true);
  });

  it('ends when the next piece cannot spawn (block out)', () => {
    const g = newGame();
    for (let y = 0; y <= BOTTOM; y++) {
      for (let x = 3; x <= 6; x++) g.grid[y][x] = junk;
    }
    g.active = { piece: TOWER, rot: 0, x: 0, y: BOTTOM - 3 };
    g.hardDrop();
    expect(g.over).toBe(true);
    expect(g.lines).toBe(0);
  });
});
