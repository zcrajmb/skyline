import type { RotationMode } from '../core/game';
import { hashString } from '../core/rng';
import { load, save } from './storage';

const KEY = 'skyline:daily';

/** Today's date in UTC as YYYY-MM-DD, so every timezone shares one puzzle. */
export function utcDateKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function dailySeed(dateKey: string): number {
  return hashString(dateKey);
}

export interface DailyRecord {
  date: string;
  mode: RotationMode;
  score: number;
  lines: number;
  level: number;
  linesByLevel: number[];
  finished: boolean;
}

/** Today's attempt, if one has been started. */
export function getDailyRecord(date: string): DailyRecord | null {
  const rec = load<DailyRecord | null>(KEY, null);
  return rec && rec.date === date ? rec : null;
}

/**
 * Saves progress. Called when the attempt starts and as it goes, so reloading
 * mid-game still uses up the day's attempt and keeps the score so far.
 */
export function saveDailyRecord(rec: DailyRecord): void {
  save(KEY, rec);
}
