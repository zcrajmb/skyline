/**
 * Balance report: simulates games with the greedy bot and summarises how each piece behaves.
 *
 *   npm run balance -- --games 500 --mode upright --max-pieces 1000 --seed 1 --start-level 1
 *
 * Pieces with a minLevel only appear once the bot reaches that level; use
 * --start-level to include them from the first piece.
 */
import { Bag } from '../src/core/bag';
import { clearLines, createGrid, HIDDEN_ROWS, place } from '../src/core/board';
import { compileRotations, LINES_PER_LEVEL, scoreForLines, type RotationMode } from '../src/core/game';
import { mulberry32 } from '../src/core/rng';
import { PIECES } from '../src/pieces';
import { boardStats, choosePlacement, WEIGHTS } from './bot';

interface Options {
  games: number;
  mode: RotationMode;
  maxPieces: number;
  seed: number;
  startLevel: number;
}

function parseArgs(argv: string[]): Options {
  const opts: Options = { games: 500, mode: 'classic', maxPieces: 1000, seed: 1, startLevel: 1 };
  for (let i = 0; i < argv.length; i++) {
    const [flag, value] = [argv[i], argv[i + 1]];
    switch (flag) {
      case '--games': opts.games = Number(value); i++; break;
      case '--mode': opts.mode = value === 'upright' ? 'upright' : 'classic'; i++; break;
      case '--max-pieces': opts.maxPieces = Number(value); i++; break;
      case '--seed': opts.seed = Number(value); i++; break;
      case '--start-level': opts.startLevel = Number(value); i++; break;
      case '--help':
        console.log('Options: --games N  --mode classic|upright  --max-pieces N  --seed N  --start-level N');
        process.exit(0);
    }
  }
  return opts;
}

interface PieceStats {
  dealt: number;
  lines: number;
  holeDelta: number;
  madeHole: number;
}

interface GameResult {
  pieces: number;
  lines: number;
  score: number;
  level: number;
  toppedOut: boolean;
}

function simulate(seed: number, opts: Options, rotations: ReturnType<typeof compileRotations>,
                  stats: PieceStats[]): GameResult {
  const grid = createGrid<number>();
  const bag = new Bag(mulberry32(seed), PIECES);
  let level = opts.startLevel;
  let lines = 0, score = 0, pieces = 0;

  while (pieces < opts.maxPieces) {
    const piece = bag.next(level);
    const before = boardStats(grid).holes;
    const move = choosePlacement(grid, rotations[piece], opts.mode, WEIGHTS);
    if (!move) return { pieces, lines, score, level, toppedOut: true };
    const shape = rotations[piece][move.rot];
    place(grid, shape, move.x, move.y, () => piece);
    pieces++;
    if (shape.cells.every(([, cy]) => move.y + cy < HIDDEN_ROWS)) {
      return { pieces, lines, score, level, toppedOut: true };
    }
    const cleared = clearLines(grid).length;
    const after = boardStats(grid).holes;
    const s = stats[piece];
    s.dealt++;
    s.lines += cleared;
    s.holeDelta += after - before;
    if (after > before) s.madeHole++;
    if (cleared) {
      score += scoreForLines(cleared, level);
      lines += cleared;
      level = Math.max(opts.startLevel, Math.floor(lines / LINES_PER_LEVEL) + 1);
    }
  }
  return { pieces, lines, score, level, toppedOut: false };
}

function fmt(n: number, digits = 2): string {
  return n.toFixed(digits);
}

function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  const rotations = compileRotations(PIECES);
  const stats: PieceStats[] = PIECES.map(() => ({ dealt: 0, lines: 0, holeDelta: 0, madeHole: 0 }));
  const results: GameResult[] = [];
  const t0 = Date.now();
  for (let g = 0; g < opts.games; g++) results.push(simulate(opts.seed + g, opts, rotations, stats));
  const secs = (Date.now() - t0) / 1000;

  const avg = (f: (r: GameResult) => number) => results.reduce((a, r) => a + f(r), 0) / results.length;
  const totalDealt = stats.reduce((a, s) => a + s.dealt, 0);
  const totalHoleDelta = stats.reduce((a, s) => a + s.holeDelta, 0);

  console.log(`\nSkyline balance report`);
  console.log(`${opts.games} games · ${opts.mode} · max ${opts.maxPieces} pieces/game · seeds ${opts.seed}..${opts.seed + opts.games - 1} · ${fmt(secs, 1)}s`);
  console.log(`Bot weights: ${JSON.stringify(WEIGHTS)}\n`);
  console.log(`Avg lines cleared / game   ${fmt(avg(r => r.lines), 1)}`);
  console.log(`Avg pieces placed / game   ${fmt(avg(r => r.pieces), 1)}`);
  console.log(`Avg final level            ${fmt(avg(r => r.level), 1)}`);
  console.log(`Avg score                  ${Math.round(avg(r => r.score)).toLocaleString('en-US')}`);
  console.log(`Topped out                 ${fmt((100 * results.filter(r => r.toppedOut).length) / results.length, 0)}% (others hit the piece cap)`);
  console.log(`Avg holes / piece          ${fmt(totalHoleDelta / Math.max(1, totalDealt), 3)}  (net change in covered empty cells)\n`);

  const header = ['Piece', 'Dealt', 'Share', 'Lines/piece', 'Holes/piece', 'Makes hole'];
  const rows = PIECES.map((p, i) => {
    const s = stats[i];
    const d = Math.max(1, s.dealt);
    return [
      p.name + (p.minLevel && p.minLevel > 1 ? ` (L${p.minLevel}+)` : ''),
      String(s.dealt),
      `${fmt((100 * s.dealt) / Math.max(1, totalDealt), 1)}%`,
      s.dealt ? fmt(s.lines / d, 3) : '—',
      s.dealt ? fmt(s.holeDelta / d, 3) : '—',
      s.dealt ? `${fmt((100 * s.madeHole) / d, 1)}%` : '—',
    ];
  });
  const widths = header.map((h, c) => Math.max(h.length, ...rows.map(r => r[c].length)));
  const line = (cells: string[]) => cells.map((v, c) => (c === 0 ? v.padEnd(widths[c]) : v.padStart(widths[c]))).join('   ');
  console.log(line(header));
  console.log(widths.map(w => '-'.repeat(w)).join('   '));
  rows.forEach(r => console.log(line(r)));
  console.log('');
}

main();
