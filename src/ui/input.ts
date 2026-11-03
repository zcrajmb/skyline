export type Action =
  | 'left' | 'right' | 'rotateCW' | 'rotateCCW' | 'soft' | 'hard' | 'hold' | 'pause';

/** Delay before a held key starts repeating, and the repeat interval. */
const DAS_MS = 160;
const ARR_MS = 45;
const SOFT_MS = 40;
const REPEATS: Partial<Record<Action, { delay: number; every: number }>> = {
  left: { delay: DAS_MS, every: ARR_MS },
  right: { delay: DAS_MS, every: ARR_MS },
  soft: { delay: SOFT_MS, every: SOFT_MS },
};

const KEYMAP: Record<string, Action> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'soft', ArrowUp: 'rotateCW',
  KeyX: 'rotateCW', KeyZ: 'rotateCCW', Space: 'hard', KeyC: 'hold',
  ShiftLeft: 'hold', ShiftRight: 'hold', KeyP: 'pause', Escape: 'pause',
};

/** Swipe tuning (CSS px / ms). */
const AXIS_LOCK_PX = 10;
const TAP_MAX_MS = 280;
const FLICK_SPEED = 1.1;
const FLICK_MIN_PX = 40;

/**
 * Turns keyboard, touch swipes and on-screen buttons into game actions,
 * with auto-repeat for movement and soft drop.
 */
export class Input {
  private held = new Map<Action, { t: number; next: number }>();

  constructor(private readonly fire: (a: Action) => void) {}

  /** Start an action; repeating actions keep firing until release(). */
  press(a: Action): void {
    if (this.held.has(a)) return;
    // Latest direction wins.
    if (a === 'left') this.held.delete('right');
    if (a === 'right') this.held.delete('left');
    this.fire(a);
    const r = REPEATS[a];
    if (r) this.held.set(a, { t: 0, next: r.delay });
  }

  release(a: Action): void {
    this.held.delete(a);
  }

  releaseAll(): void {
    this.held.clear();
  }

  update(dt: number): void {
    for (const [a, h] of this.held) {
      const r = REPEATS[a]!;
      h.t += dt;
      while (h.t >= h.next) {
        this.fire(a);
        h.next += r.every;
      }
    }
  }

  bindKeyboard(target: Window): void {
    target.addEventListener('keydown', e => {
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!e.repeat) this.press(a);
    });
    target.addEventListener('keyup', e => {
      const a = KEYMAP[e.code];
      if (a) this.release(a);
    });
    target.addEventListener('blur', () => this.releaseAll());
  }

  /** tap = rotate, drag sideways = move, drag down = soft drop, fast flick down = hard drop. */
  bindTouch(el: HTMLElement, cellPx: () => number): void {
    let id: number | null = null;
    let sx = 0, sy = 0, st = 0;
    let axis: 'h' | 'v' | null = null;
    let cols = 0, rows = 0;
    let samples: { t: number; y: number }[] = [];

    el.addEventListener('pointerdown', e => {
      if (id !== null) return;
      id = e.pointerId;
      el.setPointerCapture(e.pointerId);
      sx = e.clientX; sy = e.clientY; st = e.timeStamp;
      axis = null; cols = 0; rows = 0;
      samples = [{ t: e.timeStamp, y: e.clientY }];
    });

    el.addEventListener('pointermove', e => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      samples.push({ t: e.timeStamp, y: e.clientY });
      if (samples.length > 8) samples.shift();
      if (!axis) {
        if (Math.hypot(dx, dy) < AXIS_LOCK_PX) return;
        axis = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
      }
      const c = Math.max(8, cellPx());
      if (axis === 'h') {
        const target = Math.trunc(dx / c);
        while (cols < target) { this.fire('right'); cols++; }
        while (cols > target) { this.fire('left'); cols--; }
      } else {
        const target = Math.trunc(dy / c);
        while (rows < target) { this.fire('soft'); rows++; }
      }
    });

    const end = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null;
      const dy = e.clientY - sy;
      if (!axis) {
        if (e.timeStamp - st < TAP_MAX_MS && e.type === 'pointerup') this.fire('rotateCW');
        return;
      }
      if (axis === 'v' && dy > FLICK_MIN_PX) {
        const first = samples.find(s => e.timeStamp - s.t < 100) ?? samples[0];
        const speed = (e.clientY - first.y) / Math.max(1, e.timeStamp - first.t);
        if (speed > FLICK_SPEED) this.fire('hard');
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  /** On-screen buttons: elements with data-action; movement buttons auto-repeat while held. */
  bindButtons(root: HTMLElement): void {
    root.querySelectorAll<HTMLElement>('[data-action]').forEach(btn => {
      const a = btn.dataset.action as Action;
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        btn.setPointerCapture(e.pointerId);
        this.press(a);
      });
      const up = () => this.release(a);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
    });
  }
}
