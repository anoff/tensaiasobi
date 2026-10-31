import { describe, expect, it } from 'vitest';
import {
  DAILY_STICKER_CAP,
  STICKER_SAVE_VERSION,
  addOwnedAccessory,
  awardRound,
  canBuyAccessory,
  emptyStickerSave,
  grantOnce,
  isSceneComplete,
  nextMissing,
  parseStickerSave,
  placeAccessory,
  placeScenePiece,
  removeAccessory,
  townHasItems,
  type AwardPools,
} from './stickerRules';

const pools: AwardPools = {
  stickers: { numbers: ['n1', 'n2', 'n3'], language: ['l1'] },
  scenePieces: { numbers: ['p1'] },
  moods: { numbers: ['m1'] },
};
const DAY = '2026-10-31';

function earnAll(shelf: 'numbers' | 'language', times: number) {
  let save = emptyStickerSave();
  const got: (string | null)[] = [];
  for (let i = 0; i < times; i++) {
    const r = awardRound({ ...save, dayCount: 0 }, shelf, DAY, pools);
    save = r.save;
    got.push(r.awarded);
  }
  return { save, got };
}

describe('awardRound', () => {
  it('fills a shelf page in the sticker, scene piece, sticker, mood rhythm', () => {
    expect(earnAll('numbers', 6).got).toEqual(['n1', 'p1', 'n2', 'm1', 'n3', null]);
  });

  it('only earns from the shelf of the game that was played', () => {
    const { got } = earnAll('language', 3);
    expect(got).toEqual(['l1', null, null]);
  });

  it('skips empty pools (a shelf without moods or scenes still fills its stickers)', () => {
    expect(nextMissing(emptyStickerSave(), 'logic', pools)).toBeNull();
    const only = { stickers: { logic: ['g1', 'g2'] }, scenePieces: {}, moods: {} };
    let save = emptyStickerSave();
    save = awardRound(save, 'logic', DAY, only).save;
    expect(awardRound(save, 'logic', DAY, only).awarded).toBe('g2');
  });

  it(`stops at ${DAILY_STICKER_CAP} a day and starts again the next day`, () => {
    const big: AwardPools = { stickers: { numbers: Array.from({ length: 12 }, (_, i) => `s${i}`) }, scenePieces: {}, moods: {} };
    let save = emptyStickerSave();
    for (let i = 0; i < DAILY_STICKER_CAP; i++) save = awardRound(save, 'numbers', DAY, big).save;
    expect(save.earned).toHaveLength(DAILY_STICKER_CAP);
    const capped = awardRound(save, 'numbers', DAY, big);
    expect(capped.awarded).toBeNull();
    expect(capped.save).toBe(save);
    const tomorrow = awardRound(save, 'numbers', '2026-11-01', big);
    expect(tomorrow.awarded).toBe(`s${DAILY_STICKER_CAP}`);
    expect(tomorrow.save.dayCount).toBe(1);
  });
});

describe('parseStickerSave', () => {
  it('starts a fresh book for missing, broken or other-version saves', () => {
    expect(parseStickerSave(null)).toEqual(emptyStickerSave());
    expect(parseStickerSave('{oops')).toEqual(emptyStickerSave());
    expect(parseStickerSave(JSON.stringify({ ...emptyStickerSave(), version: STICKER_SAVE_VERSION + 1, earned: ['n1'] }))).toEqual(
      emptyStickerSave(),
    );
  });

  it('round-trips a valid save', () => {
    let save = grantOnce(emptyStickerSave(), 'n1');
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
    expect(once.dayCount).toBe(0);
  });
});
