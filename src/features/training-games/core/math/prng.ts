/**
 * Seeded Pseudo-Random Number Generator (Mulberry32)
 * Ensures reproducible math challenges and unit testing.
 */
export class PRNG {
  private s: number;

  constructor(seed?: number | string) {
    if (typeof seed === 'string') {
      let h = 2166136261 >>> 0;
      for (let i = 0; i < seed.length; i++) {
        h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
      }
      this.s = h >>> 0;
    } else if (typeof seed === 'number') {
      this.s = seed >>> 0;
    } else {
      this.s = Math.floor(Math.random() * 0xffffffff) >>> 0;
    }
    if (this.s === 0) this.s = 1;
  }

  /**
   * Returns a float in [0, 1)
   */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer in [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Randomly pick an item from an array
   */
  pick<T>(arr: T[]): T {
    if (arr.length === 0) throw new Error('Cannot pick from empty array');
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /**
   * Shuffles an array in place or returns a shuffled copy
   */
  shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
