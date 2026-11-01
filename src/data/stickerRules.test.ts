import { describe, expect, it } from 'vitest';
import {
  MISSING_WEIGHT,
  SHINY_CHANCE,
  STICKER_SAVE_VERSION,
  addCopy,
  addOwnedAccessory,
  canBuyAccessory,
  capsulesToday,
  copyCount,
  drawFromShelf,
  dropChance,
  emptyStickerSave,
  grantOnce,
  isSceneComplete,
  ownedIds,
  parseStickerSave,
  placeAccessory,
  placeScenePiece,
  removeAccessory,
  rollCapsule,
  townHasItems,
  type AwardPools,
  type Rng,
  type StickerSave,
} from './stickerRules';

const pools: AwardPools = {
  stickers: { numbers: ['n1', 'n2', 'n3'], language: ['l1'] },
  scenePieces: { numbers: ['p1'] },
  moods: { numbers: ['m1'] },
};
const DAY = '2026-10-31';

/** Plays back fixed rolls, then repeats the last one. */
const seq = (...values: number[]): Rng => {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
};

/** Small seeded PRNG (mulberry32) for the rate tests. */
function seeded(seed: number): Rng {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const own = (...ids: string[]): StickerSave => ids.reduce((s, id) => addCopy(s, id, false).save, emptyStickerSave());

describe('drop curve', () => {
  it('is 1 / (2^(k+1) - 1): 100 %, 1/3, 1/7, 1/15, with no floor or cap', () => {
    expect([0, 1, 2, 3].map(dropChance)).toEqual([1, 1 / 3, 1 / 7, 1 / 15]);
    expect(dropChance(20)).toBeGreaterThan(0);
  });

  it('always drops the first capsule of the day and counts k up', () => {
    const r = rollCapsule(emptyStickerSave(), 'numbers', DAY, pools, seq(0.999999, 0, 0.5));
    expect(r.copy).not.toBeNull();
    expect(r.save.daily).toEqual({ date: DAY, k: 1 });
  });

  it('rolls against 1/3 for the second capsule, then 1/7', () => {
    const one = rollCapsule(emptyStickerSave(), 'numbers', DAY, pools, seq(0, 0, 0.5)).save;
    expect(rollCapsule(one, 'numbers', DAY, pools, seq(0.34)).copy).toBeNull();
    const two = rollCapsule(one, 'numbers', DAY, pools, seq(0.33, 0, 0.5));
    expect(two.copy).not.toBeNull();
    expect(two.save.daily.k).toBe(2);
    expect(rollCapsule(two.save, 'numbers', DAY, pools, seq(1 / 7 + 0.001)).copy).toBeNull();
    expect(rollCapsule(two.save, 'numbers', DAY, pools, seq(1 / 7 - 0.001, 0, 0.5)).copy).not.toBeNull();
  });

  it('a miss changes nothing', () => {
    const one = rollCapsule(emptyStickerSave(), 'numbers', DAY, pools, seq(0, 0, 0.5)).save;
    const miss = rollCapsule(one, 'numbers', DAY, pools, seq(0.9));
    expect(miss.save).toBe(one);
  });

  it('resets k on a new local day', () => {
    let save = emptyStickerSave();
    for (let i = 0; i < 4; i++) save = rollCapsule(save, 'numbers', DAY, pools, seq(0, 0, 0.5)).save;
    expect(capsulesToday(save, DAY)).toBe(4);
    expect(capsulesToday(save, '2026-11-01')).toBe(0);
    const next = rollCapsule(save, 'numbers', '2026-11-01', pools, seq(0.999999, 0, 0.5));
    expect(next.copy).not.toBeNull();
    expect(next.save.daily).toEqual({ date: '2026-11-01', k: 1 });
  });

  it('only draws from the shelf of the game that was played, and nothing from an empty shelf', () => {
    const r = rollCapsule(emptyStickerSave(), 'language', DAY, pools, seq(0, 0.9, 0.5));
    expect(r.copy?.id).toBe('l1');
    const empty = rollCapsule(emptyStickerSave(), 'logic', DAY, pools, seq(0));
    expect(empty.copy).toBeNull();
    expect(empty.save.daily.k).toBe(0);
  });

  it('matches the curve over many rounds (k = 1 hits about 1/3 of the time)', () => {
    const rng = seeded(7);
    const one = rollCapsule(emptyStickerSave(), 'numbers', DAY, pools, seq(0, 0, 0.5)).save;
    let hits = 0;
    const N = 30_000;
    for (let i = 0; i < N; i++) if (rollCapsule(one, 'numbers', DAY, pools, rng).copy) hits++;
    expect(hits / N).toBeCloseTo(1 / 3, 1);
  });
});

describe('drawing from a shelf', () => {
  it('weights 70 % to stickers the kid does not own yet', () => {
    const save = own('n1', 'n2');
    const rng = seeded(11);
    let missing = 0;
    const N = 20_000;
    for (let i = 0; i < N; i++) {
      const id = drawFromShelf(save, 'numbers', pools, rng)!;
      if (!['n1', 'n2'].includes(id)) missing++;
    }
    expect(missing / N).toBeCloseTo(MISSING_WEIGHT, 1);
  });

  it('picks the missing group below 0.7 and the owned group above', () => {
    const save = own('n1');
    expect(drawFromShelf(save, 'numbers', pools, seq(0.69, 0))).toBe('n2');
    expect(drawFromShelf(save, 'numbers', pools, seq(0.71, 0.99))).toBe('n1');
  });

  it('is uniform when nothing or everything is owned', () => {
    const all = ['n1', 'n2', 'n3', 'p1', 'm1'];
    expect(drawFromShelf(emptyStickerSave(), 'numbers', pools, seq(0))).toBe('n1');
    expect(drawFromShelf(emptyStickerSave(), 'numbers', pools, seq(0.99))).toBe('m1');
    expect(drawFromShelf(own(...all), 'numbers', pools, seq(0.5))).toBe('n3');
  });

  it('keeps duplicates as separate copies with counts', () => {
    let save = own('l1');
    save = rollCapsule(save, 'language', DAY, pools, seq(0, 0, 0.5)).save;
    expect(copyCount(save, 'l1')).toBe(2);
    expect(ownedIds(save)).toEqual(['l1']);
    expect(new Set(save.copies.map((c) => c.uid)).size).toBe(2);
  });

  it('makes about 10 % of copies shiny, flagged per copy', () => {
    const rng = seeded(3);
    let shiny = 0;
    const N = 20_000;
    for (let i = 0; i < N; i++) if (rollCapsule(emptyStickerSave(), 'numbers', DAY, pools, rng).copy?.shiny) shiny++;
    expect(shiny / N).toBeCloseTo(SHINY_CHANCE, 1);
    expect(rollCapsule(emptyStickerSave(), 'numbers', DAY, pools, seq(0, 0, 0.05)).copy?.shiny).toBe(true);
    expect(rollCapsule(emptyStickerSave(), 'numbers', DAY, pools, seq(0, 0, 0.15)).copy?.shiny).toBe(false);
  });
});

describe('parseStickerSave', () => {
  it('starts a fresh book for missing, broken or other-version saves', () => {
    expect(parseStickerSave(null)).toEqual(emptyStickerSave());
    expect(parseStickerSave('{oops')).toEqual(emptyStickerSave());
    expect(parseStickerSave(JSON.stringify({ ...own('n1'), version: STICKER_SAVE_VERSION + 1 }))).toEqual(emptyStickerSave());
  });

  it('discards a v1 book (no migration, by design) and starts an empty v2 book', () => {
    const v1 = JSON.stringify({
      version: 1,
      earned: ['numbers_01', 'numbers_02', 'general_thank_you'],
      day: DAY,
      dayCount: 5,
      placedPieces: ['scene_numbers_engine'],
      ownedAccessories: ['crown'],
      placements: { numbers_01: [{ accessoryId: 'crown', x: 0.5, y: 0.2 }] },
      seenCount: 3,
    });
    const save = parseStickerSave(v1);
    expect(STICKER_SAVE_VERSION).toBe(2);
    expect(save).toEqual(emptyStickerSave());
    expect(save.version).toBe(2);
    expect(save.copies).toEqual([]);
  });

  it('round-trips a valid save', () => {
    let save = grantOnce(emptyStickerSave(), 'n1');
    save = addCopy(save, 'n1', true).save;
    save = rollCapsule(save, 'numbers', DAY, pools, seq(0, 0, 0.5)).save;
    save = addOwnedAccessory(save, 'acc_hat');
    save = placeAccessory(save, 'n1', 'acc_hat', 0.3, 0.2);
    expect(parseStickerSave(JSON.stringify(save))).toEqual(save);
  });
});

describe('accessories', () => {
  const base = addOwnedAccessory(grantOnce(grantOnce(emptyStickerSave(), 'n1'), 'n2'), 'acc_hat');

  it('are bought once and owned globally', () => {
    expect(canBuyAccessory(emptyStickerSave(), 'acc_hat', 10, 10)).toBe(true);
    expect(canBuyAccessory(emptyStickerSave(), 'acc_hat', 9, 10)).toBe(false);
    expect(canBuyAccessory(base, 'acc_hat', 99, 10)).toBe(false);
    expect(addOwnedAccessory(base, 'acc_hat')).toBe(base);
  });

  it('can sit on every earned sticker, one of each per sticker, clamped to the sticker box', () => {
    let save = placeAccessory(base, 'n1', 'acc_hat', 0.5, 0.5);
    save = placeAccessory(save, 'n2', 'acc_hat', 1.4, -0.2);
    save = placeAccessory(save, 'n1', 'acc_hat', 0.4, 0.1);
    expect(save.placements).toEqual({
      n1: [{ accessoryId: 'acc_hat', x: 0.4, y: 0.1 }],
      n2: [{ accessoryId: 'acc_hat', x: 1, y: 0 }],
    });
    expect(save.ownedAccessories).toEqual(['acc_hat']);
  });

  it('needs an earned sticker and an owned accessory', () => {
    expect(placeAccessory(base, 'n9', 'acc_hat', 0.5, 0.5)).toBe(base);
    expect(placeAccessory(base, 'n1', 'acc_bow', 0.5, 0.5)).toBe(base);
  });

  it('can be taken off again', () => {
    const save = removeAccessory(placeAccessory(base, 'n1', 'acc_hat', 0.5, 0.5), 'n1', 'acc_hat');
    expect(save.placements).toEqual({});
    expect(save.ownedAccessories).toEqual(['acc_hat']);
  });
});

describe('scenes and the thank-you grant', () => {
  it('only places earned pieces and completes when all are on their outline', () => {
    let save = placeScenePiece(emptyStickerSave(), 'p1');
    expect(save.placedPieces).toEqual([]);
    save = placeScenePiece(grantOnce(grantOnce(save, 'p1'), 'p2'), 'p1');
    expect(isSceneComplete(save, ['p1', 'p2'])).toBe(false);
    save = placeScenePiece(save, 'p2');
    expect(isSceneComplete(save, ['p1', 'p2'])).toBe(true);
    expect(isSceneComplete(save, [])).toBe(false);
  });

  it('detects an old town with items', () => {
    expect(townHasItems(null)).toBe(false);
    expect(townHasItems('[[null,null],[null,null]]')).toBe(false);
    expect(townHasItems('[[null,{"id":"house","emoji":"🏠"}]]')).toBe(true);
    expect(townHasItems('nope')).toBe(false);
  });

  it('grants once', () => {
    const once = grantOnce(emptyStickerSave(), 'general_thank_you');
    expect(grantOnce(once, 'general_thank_you')).toBe(once);
    expect(once.daily.k).toBe(0);
    expect(once.copies).toEqual([{ uid: 'c1', id: 'general_thank_you', shiny: false }]);
  });
});
