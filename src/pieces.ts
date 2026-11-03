/**
 * The piece set. Everything about a piece lives here: its name, the footprint the
 * game uses for collision, when it may appear, and the art drawn over it.
 * Game logic only reads `footprint` and `minLevel`, so pieces can be added,
 * removed or re-skinned without touching anything else.
 *
 * Art functions draw the piece in its authored (unrotated) orientation, in cell
 * units (1 = one grid cell), already clipped to the footprint. The renderer
 * draws the `lot` backing for each cell first and handles rotation.
 */
import {
  bands, hgrad, line, noise, poly, rect, windows, WINDOW_LIT, type Ctx,
} from './render/artkit';
import {
  busBell, leaningBell, liftDing, musette, oudHijaz, taxiHorn, tubeChime, westminsterChime, type SoundFn,
} from './audio/sounds';

export interface PieceDef {
  /** Stable key, used in saved data and tests. */
  id: string;
  /** Display name. */
  name: string;
  /** Rows top-to-bottom; X = filled, . = empty. */
  footprint: string[];
  /** First level this piece can be dealt at (default 1). */
  minLevel?: number;
  /** Colour of the cell backing ("plot") under the building. */
  lot: string;
  /** Main tone, used for small previews and the ghost tint. */
  tone: string;
  /** Where the building is; shown beside its name. */
  city: string;
  /** Plays when the building lands (recipes live in src/audio/sounds.ts). */
  sound: SoundFn;
  draw: (ctx: Ctx) => void;
}

// Muted steel / glass / stone palette.
const STEEL_HI = '#aab4c0';
const STEEL = '#7d8896';
const STEEL_LO = '#545e6c';
const GLASS_HI = '#9fbccb';
const GLASS = '#6c8fa3';
const GLASS_LO = '#47667a';
const STONE_HI = '#cdbfa6';
const STONE = '#a8987d';
const STONE_LO = '#7d6f5a';
const MARBLE_HI = '#e6dfd2';
const MARBLE = '#c9bfae';
const IRON_HI = '#9a8670';
const IRON = '#76634f';
const IRON_LO = '#54463a';
const TEAL_HI = '#7fa298';
const TEAL = '#55786f';
const TEAL_LO = '#3a564f';
const SAGE_HI = '#94ad9f';
const SAGE = '#6a8577';
const SAGE_LO = '#4c6357';

export const PIECES: PieceDef[] = [
  {
    id: 'tower',
    name: 'Tower Block',
    city: 'Anytown',
    sound: liftDing,
    footprint: ['X', 'X', 'X', 'X'],
    lot: '#2b3140',
    tone: STEEL,
    draw(ctx) {
      rect(ctx, 0.1, 0.12, 0.8, 3.88, hgrad(ctx, 0.1, 0.9, STEEL_HI, STEEL_LO));
      // Rooftop plant room and parapet.
      rect(ctx, 0.3, 0.02, 0.4, 0.12, STEEL_LO);
      rect(ctx, 0.06, 0.12, 0.88, 0.07, STEEL_LO);
      windows(ctx, 0.16, 0.26, 0.68, 3.6, 3, 14, { seed: 11, lit: 0.4 });
      // Entrance.
      rect(ctx, 0.36, 3.84, 0.28, 0.16, WINDOW_LIT);
    },
  },
  {
    id: 'shard',
    name: 'The Shard',
    city: 'London',
    sound: westminsterChime,
    footprint: ['.X.', 'XXX'],
    lot: '#28303f',
    tone: GLASS,
    draw(ctx) {
      // Tapering glass pyramid; the footprint clips its shoulders into setbacks.
      const body = [0.06, 2, 2.94, 2, 1.62, 0.02, 1.38, 0.02];
      poly(ctx, body, hgrad(ctx, 0.2, 2.8, GLASS_HI, GLASS_LO));
      // Facet ridges converging on the tip.
      line(ctx, 1.5, 0.04, 1.5, 2, 'rgba(255,255,255,0.35)', 0.03);
      line(ctx, 1.46, 0.1, 0.7, 2, 'rgba(255,255,255,0.18)', 0.025);
      line(ctx, 1.54, 0.1, 2.3, 2, 'rgba(20,30,45,0.35)', 0.025);
      // Floor glints, lit more towards the base.
      for (let j = 0; j < 9; j++) {
        const y = 0.35 + j * 0.18;
        const half = (1.44 * (y - 0.02)) / 1.98;
        for (let x = 1.5 - half + 0.12; x < 1.5 + half - 0.12; x += 0.17) {
          ctx.fillStyle = noise(Math.round(x * 10), j, 22) < 0.3 ? WINDOW_LIT : 'rgba(15,25,40,0.35)';
          ctx.fillRect(x, y, 0.07, 0.05);
        }
      }
      // Broken shards at the top.
      line(ctx, 1.42, 0.02, 1.36, -0.1, GLASS_HI, 0.02);
      line(ctx, 1.58, 0.02, 1.66, -0.08, GLASS_HI, 0.02);
    },
  },
  {
    id: 'burj',
    name: 'Burj Khalifa',
    city: 'Dubai',
    sound: oudHijaz,
    footprint: ['.X.', '.X.', 'XXX'],
    lot: '#2a303d',
    tone: STEEL_HI,
    draw(ctx) {
      const fill = hgrad(ctx, 0.6, 2.4, '#c7d0d9', STEEL_LO);
      // Wide podium wings stepping into the tower.
      rect(ctx, 0.08, 2.62, 2.84, 0.38, fill);
      rect(ctx, 0.32, 2.3, 2.36, 0.32, fill);
      rect(ctx, 0.62, 2.0, 1.76, 0.3, fill);
      // Stacked setbacks rising to the spire.
      rect(ctx, 1.08, 1.35, 0.84, 0.75, fill);
      rect(ctx, 1.18, 0.82, 0.64, 0.55, fill);
      rect(ctx, 1.28, 0.4, 0.44, 0.44, fill);
      rect(ctx, 1.38, 0.18, 0.24, 0.24, fill);
      poly(ctx, [1.44, 0.2, 1.56, 0.2, 1.5, 0.0], '#dfe5ea');
      // Vertical glazing strips.
      for (const x of [1.24, 1.5, 1.76]) line(ctx, x, 0.9, x, 2.6, 'rgba(25,35,50,0.35)', 0.03);
      windows(ctx, 0.2, 2.68, 2.6, 0.26, 12, 1, { seed: 31, lit: 0.55 });
      windows(ctx, 0.45, 2.34, 2.1, 0.24, 9, 1, { seed: 32, lit: 0.45 });
      windows(ctx, 1.14, 1.42, 0.72, 0.6, 3, 4, { seed: 33, lit: 0.3 });
    },
  },
  {
    id: 'walkie',
    name: 'Walkie Talkie',
    city: 'London',
    sound: busBell,
    footprint: ['XXX', '.X.'],
    lot: '#273239',
    tone: SAGE,
    draw(ctx) {
      // Flares outward as it rises — top-heavy, the Shard's natural partner.
      ctx.beginPath();
      ctx.moveTo(1.12, 2);
      ctx.quadraticCurveTo(0.95, 1.05, 0.06, 0.16);
      ctx.quadraticCurveTo(1.5, 0.04, 2.94, 0.16);
      ctx.quadraticCurveTo(2.05, 1.05, 1.88, 2);
      ctx.closePath();
      ctx.fillStyle = hgrad(ctx, 0.2, 2.8, SAGE_HI, SAGE_LO);
      ctx.fill();
      ctx.save();
      ctx.clip();
      bands(ctx, 0, 0.16, 3, 1.84, 11, 'rgba(20,32,30,0.35)', 0.025);
      for (let j = 0; j < 10; j++) {
        for (let i = 0; i < 16; i++) {
          if (noise(i, j, 41) < 0.22) rect(ctx, 0.1 + i * 0.18, 0.24 + j * 0.168, 0.1, 0.08, WINDOW_LIT);
        }
      }
      ctx.restore();
      // Sky garden crown.
      rect(ctx, 0.12, 0.08, 2.76, 0.1, '#7fa37a');
      rect(ctx, 0.12, 0.06, 2.76, 0.03, 'rgba(255,255,255,0.35)');
    },
  },
  {
    id: 'empire',
    name: 'Empire State',
    city: 'New York',
    sound: taxiHorn,
    footprint: ['X.', 'XX', 'XX'],
    lot: '#2f2c2a',
    tone: STONE,
    draw(ctx) {
      const fill = hgrad(ctx, 0, 2, STONE_HI, STONE_LO);
      // Broad base, then setbacks stepping up to the tower and mast.
      rect(ctx, 0.08, 1.3, 1.84, 1.7, fill);
      rect(ctx, 0.16, 1.1, 1.68, 0.2, fill);
      rect(ctx, 0.14, 0.62, 0.72, 0.5, fill);
      rect(ctx, 0.24, 0.42, 0.52, 0.2, fill);
      rect(ctx, 0.36, 0.26, 0.28, 0.16, fill);
      poly(ctx, [0.42, 0.27, 0.58, 0.27, 0.5, 0.0], STONE_HI);
      // Art-deco piers between window columns.
      windows(ctx, 0.14, 1.38, 1.72, 1.56, 8, 9, { seed: 51, lit: 0.38, fill: [0.42, 0.5] });
      windows(ctx, 0.2, 0.68, 0.6, 0.4, 3, 3, { seed: 52, lit: 0.45, fill: [0.42, 0.5] });
      for (const y of [1.3, 1.1, 0.62, 0.42]) line(ctx, 0.1, y, 1.9, y, 'rgba(255,240,215,0.25)', 0.02);
    },
  },
  {
    id: 'gherkin',
    name: 'The Gherkin',
    city: 'London',
    sound: tubeChime,
    footprint: ['.X.', 'XXX', '.X.'],
    lot: '#25302f',
    tone: TEAL,
    draw(ctx) {
      // Rounded bullet body; the plus-shaped footprint trims it.
      ctx.beginPath();
      ctx.ellipse(1.5, 1.55, 1.42, 1.48, 0, 0, Math.PI * 2);
      ctx.fillStyle = hgrad(ctx, 0.2, 2.8, TEAL_HI, TEAL_LO);
      ctx.fill();
      ctx.save();
      ctx.clip();
      // Spiral diagrid: dark bands crossing one way, fine lines the other.
      for (let k = -3; k < 6; k += 0.5) {
        line(ctx, k, 3.1, k + 2.2, -0.1, 'rgba(18,30,30,0.5)', 0.08);
      }
      for (let k = -3; k < 6; k += 0.25) {
        line(ctx, k, -0.1, k + 2.2, 3.1, 'rgba(220,240,235,0.16)', 0.02);
      }
      // Lit glass at the top.
      ctx.beginPath();
      ctx.ellipse(1.5, 0.25, 0.32, 0.2, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,207,135,0.75)';
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: 'pisa',
    name: 'Leaning Tower of Pisa',
    city: 'Pisa',
    sound: leaningBell,
    footprint: ['X.', 'XX', '.X'],
    lot: '#302d2a',
    tone: MARBLE,
    draw(ctx) {
      // Draw upright, sheared so the top sits over the left column.
      ctx.save();
      ctx.transform(1, 0, 1 / 3, 1, 0.05, 0);
      const fill = hgrad(ctx, 0, 0.9, MARBLE_HI, '#9d9384');
      rect(ctx, 0, 0.42, 0.9, 2.58, fill);
      rect(ctx, 0.12, 0.08, 0.66, 0.36, fill);
      rect(ctx, -0.03, 0.4, 0.96, 0.05, '#efe9df');
      // Six arcaded galleries.
      const tiers = 6;
      const th = 2.5 / tiers;
      for (let t = 0; t < tiers; t++) {
        const y = 0.46 + t * th;
        line(ctx, -0.02, y, 0.92, y, 'rgba(255,255,255,0.5)', 0.035);
        for (let a = 0; a < 4; a++) {
          const ax = 0.08 + a * 0.2;
          ctx.beginPath();
          ctx.moveTo(ax, y + th - 0.06);
          ctx.lineTo(ax, y + 0.16);
          ctx.arc(ax + 0.07, y + 0.16, 0.07, Math.PI, 0);
          ctx.lineTo(ax + 0.14, y + th - 0.06);
          ctx.closePath();
          ctx.fillStyle = noise(a, t, 71) < 0.25 ? 'rgba(255,207,135,0.8)' : 'rgba(60,52,44,0.45)';
          ctx.fill();
        }
      }
      // Belfry arches.
      for (let a = 0; a < 3; a++) rect(ctx, 0.2 + a * 0.18, 0.16, 0.1, 0.2, 'rgba(60,52,44,0.5)');
      ctx.restore();
    },
  },
  {
    id: 'eiffel',
    name: 'Eiffel Tower',
    city: 'Paris',
    sound: musette,
    footprint: ['.X.', 'XXX', 'X.X'],
    minLevel: 5,
    lot: '#2c2a2e',
    tone: IRON,
    draw(ctx) {
      // Silhouette: spire, upper body, first platform, two legs around the open arch.
      const fill = hgrad(ctx, 0, 3, IRON_HI, IRON_LO);
      ctx.beginPath();
      ctx.moveTo(1.47, 0.02);
      ctx.lineTo(1.53, 0.02);
      ctx.lineTo(1.6, 0.3);
      ctx.lineTo(1.86, 1.0);
      ctx.lineTo(2.3, 1.62);
      ctx.lineTo(2.95, 3);
      ctx.lineTo(2.3, 3);
      ctx.quadraticCurveTo(2.15, 2.15, 1.5, 2.05);
      ctx.quadraticCurveTo(0.85, 2.15, 0.7, 3);
      ctx.lineTo(0.05, 3);
      ctx.lineTo(0.7, 1.62);
      ctx.lineTo(1.14, 1.0);
      ctx.lineTo(1.4, 0.3);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.save();
      ctx.clip();
      // Lattice.
      for (let k = -3; k < 6; k += 0.16) {
        line(ctx, k, 3, k + 3, 0, 'rgba(25,20,18,0.45)', 0.025);
        line(ctx, k, 0, k + 3, 3, 'rgba(25,20,18,0.45)', 0.025);
      }
      ctx.restore();
      // Platforms, with warm lights along the first.
      rect(ctx, 0.48, 1.58, 2.04, 0.12, IRON_LO);
      rect(ctx, 0.5, 1.6, 2.0, 0.04, 'rgba(255,207,135,0.8)');
      rect(ctx, 1.06, 0.96, 0.88, 0.08, IRON_LO);
      rect(ctx, 1.36, 0.28, 0.28, 0.06, IRON_LO);
      // Beacon.
      rect(ctx, 1.48, 0.0, 0.04, 0.06, WINDOW_LIT);
    },
  },
];
