import { shuffle, type Rng } from './rng';

export interface BagEntry {
  /** Piece is only dealt once the level reaches this (default 1). */
  minLevel?: number;
}

/**
 * Bag randomiser: every eligible piece once per bag, shuffled.
 * Eligibility is decided when the bag is refilled, using the level at that moment.
 */
export class Bag {
  private bag: number[] = [];

  constructor(private readonly rng: Rng, private readonly entries: readonly BagEntry[]) {}

  /** Indexes of entries that may appear at this level. */
  eligible(level: number): number[] {
    return this.entries
      .map((e, i) => ((e.minLevel ?? 1) <= level ? i : -1))
      .filter(i => i >= 0);
  }

  next(level: number): number {
    if (this.bag.length === 0) this.bag = shuffle(this.rng, this.eligible(level));
    return this.bag.pop()!;
  }
}
