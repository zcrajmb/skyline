import './style.css';
import { compileRotations, Game, type RotationMode } from './core/game';
import { PIECES } from './pieces';
import { drawBackground } from './render/background';
import { BoardRenderer, drawPreview } from './render/renderer';
import { SpriteCache } from './render/sprites';
import { dailySeed, getDailyRecord, saveDailyRecord, utcDateKey, type DailyRecord } from './ui/daily';
import { Input, type Action } from './ui/input';
import { copyText, shareText } from './ui/share';
import { load, save } from './ui/storage';

type Kind = 'daily' | 'free';
type State = 'menu' | 'playing' | 'paused' | 'over';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

// ---- setup ----

const bgCanvas = $<HTMLCanvasElement>('bg');
const boardCanvas = $<HTMLCanvasElement>('board');
const holdCanvas = $<HTMLCanvasElement>('hold');
const nextCanvases = [...document.querySelectorAll<HTMLCanvasElement>('canvas.next')];
const nextNames = [...document.querySelectorAll<HTMLElement>('.next-name')];

const rotations = compileRotations(PIECES);
const footprints = rotations.map(r => r[0]);
const sprites = new SpriteCache(PIECES, rotations);
const renderer = new BoardRenderer(boardCanvas, sprites);

let state: State = 'menu';
let game: Game | null = null;
let kind: Kind = 'free';
let mode: RotationMode = load<RotationMode>('skyline:mode', 'classic') === 'upright' ? 'upright' : 'classic';
let dailyDate = utcDateKey();
let lastSavedPieces = -1;
const hud = { score: -1, lines: -1, level: -1, hold: -2, holdUsed: false, queue: '', active: -1 };

const screens = { menu: $('menu'), pause: $('pause'), gameover: $('gameover') };

function show(screen: keyof typeof screens | null): void {
  for (const [name, el] of Object.entries(screens)) el.classList.toggle('hidden', name !== screen);
}

// ---- menu ----

function renderMenu(): void {
  dailyDate = utcDateKey();
  document.querySelectorAll<HTMLButtonElement>('.segmented button').forEach(b => {
    b.setAttribute('aria-checked', String(b.dataset.mode === mode));
  });
  const rec = getDailyRecord(dailyDate);
  const btn = $<HTMLButtonElement>('btn-daily');
  const sub = $('daily-sub');
  btn.disabled = !!rec;
  btn.textContent = rec ? 'Daily challenge ✓' : 'Daily challenge';
  sub.textContent = rec
    ? `Played today: ${rec.score.toLocaleString('en-US')} pts, ${rec.lines} lines. New puzzle tomorrow (UTC).`
    : `${dailyDate} · same pieces for everyone · one attempt`;
  $('btn-daily-share').classList.toggle('hidden', !rec);
}

document.querySelectorAll<HTMLButtonElement>('.segmented button').forEach(b => {
  b.addEventListener('click', () => {
    mode = b.dataset.mode === 'upright' ? 'upright' : 'classic';
    save('skyline:mode', mode);
    renderMenu();
  });
});

$('btn-daily').addEventListener('click', () => start('daily'));
$('btn-free').addEventListener('click', () => start('free'));
$('btn-daily-share').addEventListener('click', async () => {
  const rec = getDailyRecord(dailyDate);
  if (!rec) return;
  const ok = await copyText(shareText(rec));
  $('btn-daily-share').textContent = ok ? 'Copied!' : 'Copy failed';
  setTimeout(() => ($('btn-daily-share').textContent = "Copy today's result"), 1600);
});

// ---- game lifecycle ----

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function start(k: Kind): void {
  kind = k;
  dailyDate = utcDateKey();
  if (k === 'daily' && getDailyRecord(dailyDate)) {
    renderMenu();
    return;
  }
  game = new Game({ seed: k === 'daily' ? dailySeed(dailyDate) : randomSeed(), mode, pieces: PIECES });
  lastSavedPieces = -1;
  if (k === 'daily') saveDaily(false);
  $('mode-tag').textContent = `${mode === 'upright' ? 'Upright' : 'Classic'} · ${k === 'daily' ? 'Daily' : 'Free play'}`;
  Object.assign(hud, { score: -1, lines: -1, level: -1, hold: -2, queue: '', active: -1 });
  input.releaseAll();
  state = 'playing';
  show(null);
}

function dailyRecord(finished: boolean): DailyRecord {
  const g = game!;
  return {
    date: dailyDate, mode: g.mode, score: g.score, lines: g.lines, level: g.level,
    linesByLevel: [...g.linesByLevel], finished,
  };
}

function saveDaily(finished: boolean): void {
  if (kind === 'daily' && game) saveDailyRecord(dailyRecord(finished));
}

function pause(): void {
  if (state !== 'playing') return;
  state = 'paused';
  input.releaseAll();
  show('pause');
}

function resume(): void {
  if (state !== 'paused') return;
  state = 'playing';
  show(null);
}

function toMenu(): void {
  saveDaily(game?.over ?? false);
  state = 'menu';
  game = null;
  renderMenu();
  show('menu');
}

function gameOver(): void {
  const g = game!;
  state = 'over';
  input.releaseAll();
  saveDaily(true);
  const daily = kind === 'daily';
  $('go-title').textContent = daily ? 'Daily complete' : 'Game over';
  $('go-score').textContent = g.score.toLocaleString('en-US');
  $('go-lines').textContent = String(g.lines);
  $('go-level').textContent = String(g.level);
  $('go-mode').textContent = `${g.mode === 'upright' ? 'Upright' : 'Classic'} · ${daily ? 'Daily' : 'Free'}`;
  const text = daily ? shareText(dailyRecord(true)) : '';
  $('go-share-text').textContent = text;
  $('go-share-text').classList.toggle('hidden', !daily);
  $('btn-share').classList.toggle('hidden', !daily);
  $('btn-again').classList.toggle('hidden', daily);
  $('share-status').textContent = '';
  show('gameover');
}

$('btn-resume').addEventListener('click', resume);
$('btn-quit').addEventListener('click', toMenu);
$('btn-menu').addEventListener('click', toMenu);
$('btn-again').addEventListener('click', () => start('free'));
$('btn-share').addEventListener('click', async () => {
  const ok = await copyText($('go-share-text').textContent ?? '');
  $('share-status').textContent = ok ? 'Copied to clipboard.' : 'Could not copy — select the text above instead.';
});

// ---- input ----

const input = new Input((a: Action) => {
  if (a === 'pause') {
    if (state === 'playing') pause();
    else if (state === 'paused') resume();
    return;
  }
  if (state !== 'playing' || !game) return;
  switch (a) {
    case 'left': game.move(-1); break;
    case 'right': game.move(1); break;
    case 'rotateCW': game.rotate(1); break;
    case 'rotateCCW': game.rotate(-1); break;
    case 'soft': game.softDrop(); break;
    case 'hard': game.hardDrop(); break;
    case 'hold': game.holdPiece(); break;
  }
});
input.bindKeyboard(window);
input.bindTouch(boardCanvas, () => renderer.cellCssPx());
input.bindButtons($('touch-controls'));

// Enter starts / resumes from overlays.
window.addEventListener('keydown', e => {
  if (e.code !== 'Enter') return;
  if (state === 'paused') resume();
  else if (state === 'over' && kind === 'free') start('free');
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    saveDaily(game?.over ?? false);
  }
});

// ---- HUD ----

function updateHud(g: Game): void {
  if (hud.score !== g.score) $('score').textContent = (hud.score = g.score).toLocaleString('en-US');
  if (hud.lines !== g.lines) $('lines').textContent = String((hud.lines = g.lines));
  if (hud.level !== g.level) $('level').textContent = String((hud.level = g.level));
  const hold = g.hold ?? -1;
  if (hud.hold !== hold || hud.holdUsed !== g.holdUsed) {
    hud.hold = hold;
    hud.holdUsed = g.holdUsed;
    drawPreview(holdCanvas, sprites, PIECES, footprints, g.hold, g.holdUsed);
  }
  const q = g.queue.join(',');
  if (hud.queue !== q) {
    hud.queue = q;
    g.queue.forEach((p, i) => {
      drawPreview(nextCanvases[i], sprites, PIECES, footprints, p);
      nextNames[i].textContent = PIECES[p].name;
    });
  }
  const act = g.active?.piece ?? -1;
  if (hud.active !== act) $('now-name').textContent = act >= 0 ? PIECES[(hud.active = act)].name : '—';
}

function redrawAll(): void {
  drawBackground(bgCanvas);
  renderer.resize();
  Object.assign(hud, { hold: -2, queue: '' });
}

// ---- main loop ----

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(50, now - last);
  last = now;
  if (state === 'playing' && game) {
    input.update(dt);
    game.update(dt);
    if (kind === 'daily' && game.piecesPlaced !== lastSavedPieces) {
      lastSavedPieces = game.piecesPlaced;
      saveDaily(false);
    }
    if (game.over) gameOver();
  }
  if (game) updateHud(game);
  renderer.draw(game);
  requestAnimationFrame(frame);
}

new ResizeObserver(redrawAll).observe(boardCanvas);
window.addEventListener('resize', redrawAll);
redrawAll();
renderMenu();
show('menu');
requestAnimationFrame(frame);
