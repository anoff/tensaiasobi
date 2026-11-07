import { describe, expect, it } from 'vitest';
import {
  MAX_PAGES,
  MAX_STORED_PAGES,
  MISSING_WEIGHT,
  SHINY_CHANCE,
  STICKER_SAVE_VERSION,
  addCopy,
  addOwnedAccessory,
  addPage,
  canAddPage,
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
import { LEGACY_SCENE_PAGES } from './legacyScenePages';
import { de } from '../locales/de';
import { en } from '../locales/en';
import { fr } from '../locales/fr';
import { ja } from '../locales/ja';
import { ko } from '../locales/ko';

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

  it('re-rolls only empty themed pages, including after the last sticker is removed', () => {
    let save = addPage(owned, { theme: 'park', seed: 5 });
    save = setPageSeed(save, 'p1', 99);
    expect(save.pages[0]).toEqual({ id: 'p1', background: { theme: 'park', seed: 99 }, stickers: [] });
    expect(setPageSeed(save, 'p1', 99)).toBe(save);
    expect(setPageSeed(save, 'p1', 0)).toBe(save);
    expect(setPageSeed(withPage, 'p1', 3)).toBe(withPage);
    expect(setPageSeed(save, 'missing', 3)).toBe(save);
    save = placeOnPage(save, 'p1', 'n1', 0.3, 0.6);
    save = placeOnPage(save, 'p1', 'n1', 0.7, 0.4);
    expect(setPageSeed(save, 'p1', 100)).toBe(save);
    save = removeFromPage(save, 'p1', 'c1');
    expect(setPageSeed(save, 'p1', 100)).toBe(save);
    save = removeFromPage(save, 'p1', 'c2');
    save = setPageSeed(save, 'p1', 100);
    expect(save.pages[0]).toEqual({ id: 'p1', background: { theme: 'park', seed: 100 }, stickers: [] });
    expect(save.copies).toEqual(owned.copies);
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
    expect(loaded.pages).toHaveLength(MAX_STORED_PAGES);
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

  // Old v2 books: `placedPieces` lists the scene pieces snapped onto the retired per-shelf outline pages.
  const ALL_PIECES = LEGACY_SCENE_PAGES.flat();
  const oldBook = (save: StickerSave, placedPieces: string[]) =>
    JSON.stringify({ ...JSON.parse(JSON.stringify(save)), placedPieces });
  const placementCount = (save: StickerSave) => save.pages.reduce((n, p) => n + p.stickers.length, 0);
  const idOf = (save: StickerSave, uid: string) => save.copies.find((c) => c.uid === uid)?.id;

  it('puts every snapped piece on its outline page\'s new blank page at its old slot centre', () => {
    let save = emptyStickerSave();
    for (const p of ALL_PIECES) save = addCopy(save, p.id, false).save;
    const loaded = parseStickerSave(oldBook(save, ALL_PIECES.map((p) => p.id)));
    expect(loaded).not.toHaveProperty('placedPieces');
    // One blank page per old outline page, in shelf order.
    expect(loaded.pages.map((p) => [p.id, p.background])).toEqual([
      ['p1', 'blank'],
      ['p2', 'blank'],
      ['p3', 'blank'],
      ['p4', 'blank'],
    ]);
    LEGACY_SCENE_PAGES.forEach((set, i) => {
      expect(loaded.pages[i].stickers.map((s) => ({ id: idOf(loaded, s.uid), x: s.x, y: s.y, size: s.size }))).toEqual(
        set.map((p) => ({ id: p.id, x: p.x, y: p.y, size: p.size }))
      );
      expect(loaded.pages[i].stickers.every((s) => s.rotation === 0)).toBe(true);
    });
    // Slot centres are 0..1 page coordinates.
    for (const p of ALL_PIECES) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1);
    }
    // Deterministic until the next save drops placedPieces; a converted book loads as is.
    expect(parseStickerSave(oldBook(save, ALL_PIECES.map((p) => p.id)))).toEqual(loaded);
    expect(parseStickerSave(JSON.stringify(loaded))).toEqual(loaded);
  });

  it('keeps a piece that was both on a My page and snapped on its outline: both stay placed', () => {
    let save = addCopy(emptyStickerSave(), 'scene_numbers_engine', true).save;
    save = addCopy(save, 'numbers_01', false).save;
    save = placeOnPage(addPage(save, 'blank'), 'p1', 'scene_numbers_engine', 0.5, 0.5);
    save = { ...save, seenCount: 2 };
    expect(freeCopies(save, 'scene_numbers_engine')).toHaveLength(0);
    const loaded = parseStickerSave(oldBook(save, ['scene_numbers_engine']));
    // The original copy (shiny) stays on its My page, untouched.
    expect(loaded.pages[0]).toEqual(save.pages[0]);
    expect(loaded.copies.slice(0, 2)).toEqual(save.copies);
    // The snapped one is a new plain copy on the converted page, counted as seen.
    expect(loaded.copies[2]).toEqual({ uid: 'c3', id: 'scene_numbers_engine', shiny: false });
    expect(loaded.pages[1]).toEqual({
      id: 'p2',
      background: 'blank',
      stickers: [{ uid: 'c3', x: 0.427, y: 0.704, size: 1, rotation: 0 }],
    });
    expect(copyCount(loaded, 'scene_numbers_engine')).toBe(2);
    expect(loaded.seenCount).toBe(3);
    // A free copy in the tray stays in the tray too.
    const withFree = addCopy(save, 'scene_numbers_engine', false).save;
    const loaded2 = parseStickerSave(oldBook(withFree, ['scene_numbers_engine']));
    expect(freeCopies(loaded2, 'scene_numbers_engine').map((c) => c.uid)).toEqual(['c3']);
    expect(loaded2.pages[1].stickers.map((s) => s.uid)).toEqual(['c4']);
  });

  it('converts past 20 pages instead of dropping pieces; New page comes back only under 20', () => {
    let save = emptyStickerSave();
    for (const p of ALL_PIECES) save = addCopy(save, p.id, false).save;
    for (let i = 0; i < MAX_PAGES; i++) save = addPage(save, 'blank');
    expect(canAddPage(save)).toBe(false);
    const loaded = parseStickerSave(oldBook(save, ALL_PIECES.map((p) => p.id)));
    expect(loaded.pages).toHaveLength(MAX_PAGES + LEGACY_SCENE_PAGES.length);
    expect(MAX_STORED_PAGES).toBe(24);
    expect(loaded.pages.slice(MAX_PAGES).map((p) => p.id)).toEqual(['p21', 'p22', 'p23', 'p24']);
    expect(placementCount(loaded)).toBe(ALL_PIECES.length);
    // Every original copy is still free in the tray.
    for (const p of ALL_PIECES) expect(freeCopies(loaded, p.id)).toHaveLength(1);
    // The saved book keeps all 24 pages on the next load.
    expect(parseStickerSave(JSON.stringify(loaded))).toEqual(loaded);
    // Full: no New page and addPage does nothing.
    expect(canAddPage(loaded)).toBe(false);
    expect(addPage(loaded, 'blank')).toBe(loaded);
    expect(canAddPage({ ...loaded, pages: loaded.pages.slice(0, MAX_PAGES) })).toBe(false);
    const under = { ...loaded, pages: loaded.pages.slice(0, MAX_PAGES - 1) };
    expect(canAddPage(under)).toBe(true);
    expect(addPage(under, 'blank').pages).toHaveLength(MAX_PAGES);
  });

  it('says the book is full without a page number (true at 20 to 24 pages)', () => {
    for (const t of [de, en, fr, ja, ko]) expect(t.stickerBook.pagesFull).not.toMatch(/[0-9０-９]/);
    expect(en.stickerBook.pagesFull).toBe('Your book is full');
  });

  it('loses nothing: tray copies plus placed pieces (pages and outlines) match before and after', () => {
    // A mixed book: duplicates, a shiny, pieces on My pages, free pieces, snapped pieces, unowned junk ids.
    let save = emptyStickerSave();
    for (const id of ['scene_numbers_engine', 'scene_numbers_engine', 'scene_logic_tortoise', 'scene_fun_slide', 'numbers_01'])
      save = addCopy(save, id, id === 'scene_fun_slide').save;
    save = addPage(addPage(save, 'blank'), { theme: 'park', seed: 7 });
    save = placeOnPage(save, 'p1', 'scene_numbers_engine', 0.3, 0.3);
    save = placeOnPage(save, 'p2', 'scene_fun_slide', 0.6, 0.6);
    save = placeOnPage(save, 'p2', 'numbers_01', 0.1, 0.9);
    const snapped = ['scene_numbers_engine', 'scene_logic_tortoise', 'scene_fun_slide', 'scene_language_lamp'];
    const loaded = parseStickerSave(oldBook(save, [...snapped, 'not_a_piece']));

    const free = (b: StickerSave) => {
      const placed = new Set(b.pages.flatMap((p) => p.stickers.map((s) => s.uid)));
      return b.copies.filter((c) => !placed.has(c.uid)).length;
    };
    expect(free(loaded) + placementCount(loaded)).toBe(free(save) + placementCount(save) + snapped.length);
    expect(free(loaded)).toBe(free(save));
    expect(placementCount(loaded)).toBe(placementCount(save) + snapped.length);
    // Owned copies only grow: every old copy is still there, unchanged.
    expect(loaded.copies.slice(0, save.copies.length)).toEqual(save.copies);
    expect(loaded.copies).toHaveLength(save.copies.length + snapped.length);
    // Every old page and placement is unchanged (park keeps its theme).
    expect(loaded.pages.slice(0, save.pages.length)).toEqual(save.pages);
    // Each snapped piece (owned or not) sits once on the converted pages.
    const converted = loaded.pages.slice(save.pages.length).flatMap((p) => p.stickers.map((s) => idOf(loaded, s.uid)));
    expect(converted.sort()).toEqual([...snapped].sort());
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
