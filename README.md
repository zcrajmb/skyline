# Skyline

A falling-block puzzle game where every piece is a landmark building. It's built with Vite, TypeScript and Canvas 2D, with no game or UI framework.

## Run

```bash
npm install
npm run dev        # dev server with hot reload
npm run build      # type-check + production build into dist/
npm run preview    # serve the built dist/ locally
```

The build uses relative asset paths, so `dist/` works from any static host or sub-path.

## Play

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | ← → (hold to repeat) | swipe left / right |
| Rotate | ↑ or X (Z = back) | tap |
| Soft drop | ↓ | swipe down |
| Hard drop | Space | fast flick down |
| Hold | C or Shift | Hold button |
| Pause | P or Esc | ❚❚ button |

On touch screens, on-screen buttons are shown as a fallback.

**Rotation modes** (chosen on the start menu)
- **Classic**: rotation with simple wall kicks, tried in the order (0,0), (−1,0), (+1,0), (−2,0), (+2,0), (0,−1).
- **Upright**: no rotation. Buildings always stand up.

**Game types**
- **Daily challenge**: the piece sequence is seeded from today's UTC date, so everyone gets the same pieces. You get one attempt per day. It's tracked in `localStorage` and saved as you play, so reloading mid-game still uses up the attempt. On game over, **Copy result** copies a spoiler-free summary:
  ```
  🌆 Skyline Daily 2026-11-03
  Classic · 12,400 pts · 23 lines
  🟩🟩🟧
  ```
  Each square is one level reached, shaded by the lines cleared at that level: 🟩 10+, 🟨 5–9, 🟧 1–4, ⬛ 0.
- **Free play**: a random seed each game, with no limit on attempts.

If storage is unavailable (private mode, blocked), the game still works. Daily attempts just aren't limited.

**Rules**: 10×20 visible board plus 2 hidden spawn rows. There's a ghost piece, hold (once per piece) and a 3-piece next queue. Clearing 1 / 2 / 3 / 4+ lines scores 100 / 300 / 500 / 800 × level. Soft drop scores 1 per row and hard drop 2 per row. You level up every 10 lines, and gravity speeds up each level. Lock delay is 500 ms, reset by successful moves and rotations up to 15 times per piece, and refreshed whenever the piece reaches a new lowest row.

## Test

```bash
npm test           # run once
npm run test:watch
```

The tests cover:
- every footprint parsing correctly, being connected and tightly bounded, and staying valid through all rotations
- collision and line clearing
- hold rules
- Upright mode blocking rotation
- wall kicks, scoring, level-ups, lock delay and game over
- the same seed giving the same piece sequence
- the Eiffel Tower being excluded below level 5
- daily seeding and the share text

## Balance

```bash
npm run balance
npm run balance -- --mode upright --games 1000 --max-pieces 2000 --seed 7
npm run balance -- --start-level 5      # include level-gated pieces from the start
```

This simulates games with a greedy bot. For each piece it tries every usable rotation and column, drops it straight down, and keeps the placement with the lowest cost. The default cost is "fewest holes, then lowest total height". The report shows:
- averages per game: lines, pieces, final level, score, and how many games topped out vs. hit the piece cap
- per piece: how often it was dealt, lines cleared per placement, net holes per placement, and how often it created a new hole

To tune it:
- **Bot**: edit `WEIGHTS` in [`scripts/bot.ts`](scripts/bot.ts). You can also weight bumpiness, max height or lines cleared.
- **Pieces**: edit [`src/pieces.ts`](src/pieces.ts). The game, tests and bot all read from it.

## Pieces

Each entry in [`src/pieces.ts`](src/pieces.ts) has:
- `id`, `name`
- `footprint`: rows of `X` / `.`, used for collision
- `minLevel`: optional; the Eiffel Tower is `5`
- `lot` and `tone`: colours
- `draw(ctx)`

`draw` paints the building in its authored orientation, in cell units, already clipped to the footprint. The renderer handles rotation, caches each rotation as a sprite, and slices it correctly when line clears cut through a building. The game logic only reads `footprint` and `minLevel`, so you can rename, re-shape, re-skin, add or remove pieces without touching anything else. The tests check that each footprint is still valid.

| Piece | Footprint |
| --- | --- |
| Tower Block | `X / X / X / X` |
| The Shard | `.X. / XXX` |
| Burj Khalifa | `.X. / .X. / XXX` |
| Walkie Talkie | `XXX / .X.` |
| Empire State | `X. / XX / XX` |
| The Gherkin | `.X. / XXX / .X.` |
| Leaning Tower of Pisa | `X. / XX / .X` |
| Eiffel Tower (level 5+) | `.X. / XXX / X.X` |

## Project layout

```
src/
  main.ts            app wiring: menus, overlays, game loop, HUD
  pieces.ts          piece config (names, footprints, level gates, colours, art)
  style.css
  core/              pure game logic, no DOM; shared by the game, tests and bot
    rng.ts           mulberry32 PRNG, string hash, shuffle
    shapes.ts        footprint parsing, rotation, connectivity
    board.ts         grid, collision, drop, line clearing
    bag.ts           bag randomiser with level gating
    game.ts          game state: movement, kicks, gravity, lock delay, hold, scoring
  render/
    artkit.ts        drawing helpers for piece art
    sprites.ts       per-rotation sprite cache
    renderer.ts      board, ghost, previews
    background.ts    dusk sky and skyline silhouette
  ui/
    input.ts         keyboard (with auto-repeat), swipes, on-screen buttons
    daily.ts         UTC date seed and attempt tracking
    share.ts         result text and clipboard
    storage.ts       localStorage wrappers that never throw
tests/               Vitest unit tests
scripts/             balance report and greedy bot
```

All randomness in game logic goes through the seeded PRNG in `core/rng.ts`. Free play draws its seed from `crypto.getRandomValues`.
