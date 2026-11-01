import { describe, expect, it } from 'vitest';
import {
  MAX_PAGES,
  MISSING_WEIGHT,
  SHINY_CHANCE,
  STICKER_SAVE_VERSION,
  addCopy,
  addOwnedAccessory,
  addPage,
  canBuyAccessory,
  capsulesToday,
  copyCount,
  drawFromShelf,
  dropChance,
  emptyStickerSave,
  freeCopies,
  grantOnce,
  ownedIds,
  parseStickerSave,
  placeAccessory,
  placeOnPage,
  removeAccessory,
  removeFromPage,
  setPageSeed,
  rollCapsule,
  townHasItems,
  updatePlacement,
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
    expect(parseStickerSave(JSON.stringify({ ...own('n1'), version: STICKER_SAVE_VERSION + 1 }))).toEqual(
      emptyStickerSave()
    );
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
    save = placeAccessory(save, 'c1', 'acc_hat', 0.3, 0.2);
    save = placeOnPage(addPage(save, 'blank'), 'p1', 'n1', 0.5, 0.5);
    expect(parseStickerSave(JSON.stringify(save))).toEqual(save);
  });
});

describe('accessories', () => {
  // Two copies of n1 (uids c1, c2) and one n2 (c3).
  const base = addOwnedAccessory(
    addCopy(addCopy(grantOnce(emptyStickerSave(), 'n1'), 'n1', false).save, 'n2', false).save,
    'acc_hat'
  );

  it('are bought once and owned globally', () => {
    expect(canBuyAccessory(emptyStickerSave(), 'acc_hat', 10, 10)).toBe(true);
    expect(canBuyAccessory(emptyStickerSave(), 'acc_hat', 9, 10)).toBe(false);
    expect(canBuyAccessory(base, 'acc_hat', 99, 10)).toBe(false);
    expect(addOwnedAccessory(base, 'acc_hat')).toBe(base);
  });

  it('attach per copy (two copies of one sticker dress apart), one of each per copy, clamped to the box', () => {
    let save = placeAccessory(base, 'c1', 'acc_hat', 0.5, 0.5);
    save = placeAccessory(save, 'c3', 'acc_hat', 1.4, -0.2);
    save = placeAccessory(save, 'c1', 'acc_hat', 0.4, 0.1);
    expect(save.placements).toEqual({
      c1: [{ accessoryId: 'acc_hat', x: 0.4, y: 0.1 }],
      c3: [{ accessoryId: 'acc_hat', x: 1, y: 0 }],
    });
    expect(save.placements.c2).toBeUndefined();
    expect(save.ownedAccessories).toEqual(['acc_hat']);
  });

  it('needs an owned copy and an owned accessory', () => {
    expect(placeAccessory(base, 'c9', 'acc_hat', 0.5, 0.5)).toBe(base);
    expect(placeAccessory(base, 'n1', 'acc_hat', 0.5, 0.5)).toBe(base);
    expect(placeAccessory(base, 'c1', 'acc_bow', 0.5, 0.5)).toBe(base);
  });

  it('can be taken off again', () => {
    const save = removeAccessory(placeAccessory(base, 'c1', 'acc_hat', 0.5, 0.5), 'c1', 'acc_hat');
    expect(save.placements).toEqual({});
    expect(save.ownedAccessories).toEqual(['acc_hat']);
  });
});

describe('my pages', () => {
  // n1 ×3 (c1..c3), n2 ×1 (c4).
  let owned = grantOnce(emptyStickerSave(), 'n1');
  owned = addCopy(addCopy(owned, 'n1', false).save, 'n1', true).save;
  owned = addCopy(owned, 'n2', false).save;
  const withPage = addPage(owned, 'blank');

  it('adds blank or scene-theme pages, up to 20', () => {
    let save = emptyStickerSave();
    for (let i = 0; i < 25; i++) save = addPage(save, i % 2 ? { theme: 'beach', seed: i } : 'blank');
    expect(MAX_PAGES).toBe(20);
    expect(save.pages).toHaveLength(20);
    expect(new Set(save.pages.map((p) => p.id)).size).toBe(20);
    expect(save.pages[1]).toEqual({ id: 'p2', background: { theme: 'beach', seed: 1 }, stickers: [] });
    expect(addPage(save, 'blank')).toBe(save);
  });

  it('re-rolls a themed page with a new seed; its stickers keep their positions', () => {
    let save = placeOnPage(addPage(owned, { theme: 'park', seed: 5 }), 'p1', 'n1', 0.3, 0.6);
    const before = save.pages[0].stickers;
    save = setPageSeed(save, 'p1', 99);
    expect(save.pages[0]).toEqual({ id: 'p1', background: { theme: 'park', seed: 99 }, stickers: before });
    expect(setPageSeed(save, 'p1', 99)).toBe(save);
    expect(setPageSeed(save, 'p1', 0)).toBe(save);
    expect(setPageSeed(withPage, 'p1', 3)).toBe(withPage);
    expect(parseStickerSave(JSON.stringify(save))).toEqual(save);
  });

  it('places each copy once: a sticker owned ×3 allows exactly 3 placements, across pages', () => {
    let save = addPage(withPage, { theme: 'space', seed: 1 });
    save = placeOnPage(save, 'p1', 'n1', 0.2, 0.2);
    save = placeOnPage(save, 'p2', 'n1', 0.5, 0.5);
    save = placeOnPage(save, 'p1', 'n1', 0.8, 0.8);
    expect(freeCopies(save, 'n1')).toEqual([]);
    expect(placeOnPage(save, 'p1', 'n1', 0.5, 0.5)).toBe(save);
    expect(save.pages[0].stickers.map((s) => s.uid)).toEqual(['c1', 'c3']);
    expect(save.pages[1].stickers.map((s) => s.uid)).toEqual(['c2']);
    // Unowned stickers and unknown pages are no-ops.
    expect(placeOnPage(save, 'p1', 'n9', 0.5, 0.5)).toBe(save);
    expect(placeOnPage(owned, 'p1', 'n2', 0.5, 0.5)).toBe(owned);
    // Peeling one back to the tray frees that copy again.
    save = removeFromPage(save, 'p1', 'c1');
    expect(freeCopies(save, 'n1').map((c) => c.uid)).toEqual(['c1']);
  });

  it('moves, resizes (3 steps) and turns a placed copy, clamped to the page', () => {
    let save = placeOnPage(withPage, 'p1', 'n2', 0.5, 0.5);
    expect(save.pages[0].stickers[0]).toEqual({ uid: 'c4', x: 0.5, y: 0.5, size: 1, rotation: 0 });
    save = updatePlacement(save, 'p1', 'c4', { x: 1.3, y: -1, size: 2, rotation: 370 });
    expect(save.pages[0].stickers[0]).toEqual({ uid: 'c4', x: 1, y: 0, size: 2, rotation: 10 });
    expect(updatePlacement(save, 'p1', 'c9', { x: 0 })).toBe(save);
  });

  it('autosaves: a decorated page survives a save/load round trip as v2, and bad data is dropped', () => {
    let save = placeOnPage(addPage(withPage, { theme: 'castle', seed: 42 }), 'p1', 'n1', 0.3, 0.4);
    save = updatePlacement(save, 'p1', 'c1', { rotation: -30, size: 0 });
    save = placeOnPage(save, 'p2', 'n1', 0.5, 0.5);
    save = placeAccessory(addOwnedAccessory(save, 'acc_hat'), 'c1', 'acc_hat', 0.5, 0.2);
    const stored = JSON.parse(JSON.stringify(save)) as StickerSave;
    expect(stored.version).toBe(2);
    expect(parseStickerSave(JSON.stringify(stored))).toEqual(save);

    const tampered = {
      ...stored,
      pages: [
        {
          ...stored.pages[0],
          stickers: [...stored.pages[0].stickers, { uid: 'c1', x: 0, y: 0, size: 1, rotation: 0 }],
        },
        { id: 'px', background: { theme: 'moon', seed: 1 }, stickers: [] },
        ...Array.from({ length: 30 }, (_, i) => ({
          id: `q${i}`,
          background: 'blank',
          stickers: [{ uid: 'zz', x: 0, y: 0, size: 1, rotation: 0 }],
        })),
      ],
    };
    const loaded = parseStickerSave(JSON.stringify(tampered));
    expect(loaded.pages).toHaveLength(MAX_PAGES);
    expect(loaded.pages[0].stickers.map((s) => s.uid)).toEqual(['c1']);
    // An unknown theme falls back to a blank page instead of losing the page.
    expect(loaded.pages[1]).toEqual({ id: 'px', background: 'blank', stickers: [] });
    expect(loaded.pages[2].stickers).toEqual([]);
  });

  it('turns pages from before the scene themes into blank pages, stickers where they were', () => {
    const old = {
      ...JSON.parse(JSON.stringify(owned)),
      pages: [
        { id: 'p1', background: 'paper', stickers: [{ uid: 'c1', x: 0.2, y: 0.3, size: 2, rotation: 12 }] },
        { id: 'p2', background: 'numbers', stickers: [{ uid: 'c2', x: 0.7, y: 0.8, size: 0, rotation: 0 }] },
        { id: 'p3', background: { theme: 'park', seed: 1.5 }, stickers: [] },
      ],
    };
    const loaded = parseStickerSave(JSON.stringify(old));
    expect(loaded.version).toBe(STICKER_SAVE_VERSION);
    expect(loaded.pages).toEqual([
      { id: 'p1', background: 'blank', stickers: [{ uid: 'c1', x: 0.2, y: 0.3, size: 2, rotation: 12 }] },
      { id: 'p2', background: 'blank', stickers: [{ uid: 'c2', x: 0.7, y: 0.8, size: 0, rotation: 0 }] },
      { id: 'p3', background: 'blank', stickers: [] },
    ]);
  });

  it('turns scene pieces snapped onto the old outline pages into a blank page with the pieces where they sat', () => {
    let save = emptyStickerSave();
    for (const id of ['scene_numbers_engine', 'scene_numbers_car_balls', 'scene_logic_tortoise', 'scene_logic_tortoise'])
      save = addCopy(save, id, false).save;
    // The tortoise's first copy is already on a My page; the second copy goes on the converted page.
    save = placeOnPage(addPage(save, 'blank'), 'p1', 'scene_logic_tortoise', 0.5, 0.5);
    const old = {
      ...JSON.parse(JSON.stringify(save)),
      placedPieces: ['scene_numbers_engine', 'scene_numbers_car_balls', 'scene_logic_tortoise', 'scene_fun_slide'],
    };
    const loaded = parseStickerSave(JSON.stringify(old));
    expect(loaded).not.toHaveProperty('placedPieces');
    expect(loaded.copies).toEqual(save.copies);
    expect(loaded.pages.map((p) => [p.id, p.background])).toEqual([
      ['p1', 'blank'],
      ['p2', 'blank'],
      ['p3', 'blank'],
    ]);
    expect(loaded.pages[1].stickers).toEqual([
      { uid: 'c1', x: 0.427, y: 0.704, size: 1, rotation: 0 },
      { uid: 'c2', x: 0.627, y: 0.726, size: 0, rotation: 0 },
    ]);
    expect(loaded.pages[2].stickers).toEqual([{ uid: 'c4', x: 0.367, y: 0.741, size: 0, rotation: 0 }]);
    // Loading again gives the same book (the conversion is deterministic until the next save drops placedPieces).
    expect(parseStickerSave(JSON.stringify(old))).toEqual(loaded);
    expect(parseStickerSave(JSON.stringify(loaded))).toEqual(loaded);
  });

  it('never converts past 20 pages: pieces that do not fit stay in the tray', () => {
    let save = addCopy(emptyStickerSave(), 'scene_fun_slide', false).save;
    for (let i = 0; i < MAX_PAGES; i++) save = addPage(save, 'blank');
    const loaded = parseStickerSave(JSON.stringify({ ...save, placedPieces: ['scene_fun_slide'] }));
    expect(loaded.pages).toHaveLength(MAX_PAGES);
    expect(freeCopies(loaded, 'scene_fun_slide')).toHaveLength(1);
  });
});

describe('the thank-you grant', () => {
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
