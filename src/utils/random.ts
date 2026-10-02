/** A source of numbers in [0, 1); generators take one so tests can seed them. */
export type Rand = () => number;

export function randomInt(min: number, max: number, rand: Rand = Math.random): number {
  return min + Math.floor(rand() * (max - min + 1));
}

export function pick<T>(items: readonly T[], rand: Rand = Math.random): T {
  return items[Math.floor(rand() * items.length)];
}

/** Small deterministic generator (mulberry32) for seeded tests. */
export function seededRand(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
