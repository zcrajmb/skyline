import type { RotationMode } from '../core/game';

export const GAME_NAME = 'Skyline';

export interface ShareResult {
  date: string;
  mode: RotationMode;
  score: number;
  lines: number;
  level: number;
  linesByLevel: number[];
}

const MAX_BAR = 15;

/** One square per level reached, shaded by how many lines were cleared at that level. */
export function levelBar(linesByLevel: number[], level: number): string {
  const squares: string[] = [];
  for (let i = 0; i < Math.min(level, MAX_BAR); i++) {
    const n = linesByLevel[i] ?? 0;
    squares.push(n >= 10 ? '🟩' : n >= 5 ? '🟨' : n >= 1 ? '🟧' : '⬛');
  }
  return squares.join('') + (level > MAX_BAR ? '…' : '');
}

/** Spoiler-free result text: no board, no piece order. */
export function shareText(r: ShareResult): string {
  const mode = r.mode === 'upright' ? 'Upright' : 'Classic';
  return [
    `🌆 ${GAME_NAME} Daily ${r.date}`,
    `${mode} · ${r.score.toLocaleString('en-US')} pts · ${r.lines} lines`,
    levelBar(r.linesByLevel, r.level),
  ].join('\n');
}

/** Copies text to the clipboard, falling back to execCommand. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
