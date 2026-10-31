import { describe, expect, it } from 'vitest';
import {
  ACCESSORIES,
  AWARD_POOLS,
  CHARACTERS,
  HOST_CHARACTER,
  MOODS,
  SHELF_SLOTS,
  SHELF_STICKERS,
  SHELVES,
  THANK_YOU_STICKER_ID,
  characterForShelf,
  collectibleById,
  stickerTilt,
} from './stickers';
import { GAME_CATEGORIES } from '../games/catalog';
import albumManifest from '../assets/stickers/album/manifest.json';

describe('sticker catalog (manifest driven)', () => {
  it('has one shelf per game category with at most 12 stickers each', () => {
    expect([...SHELVES].sort()).toEqual([...GAME_CATEGORIES].sort());
    for (const shelf of SHELVES) expect(SHELF_STICKERS[shelf].length).toBeLessThanOrEqual(SHELF_SLOTS);
  });

  it('wires every album manifest entry by id, shelf and file', () => {
    for (const entry of albumManifest.stickers) {
      expect(entry.file).toBe(`${entry.id}.png`);
      // File names use the shelf's art name (the play shelf is "fun").
      expect(entry.id).toMatch(new RegExp(`^${entry.shelf === 'play' ? 'fun' : entry.shelf}_\\d\\d$`));
      const c = collectibleById(entry.id);
      expect(c?.shelf).toBe(entry.shelf);
      expect(c?.src).toBeTruthy();
    }
  });

  it('casts one character per shelf with Panda as host', () => {
    expect(characterForShelf('numbers')?.id).toBe('owl');
    expect(characterForShelf('language')?.id).toBe('fox');
    expect(characterForShelf('logic')?.id).toBe('tortoise');
    expect(characterForShelf('play')?.id).toBe('panda');
    expect(HOST_CHARACTER).toBe('panda');
    expect(CHARACTERS).toHaveLength(4);
  });

  it('has 16 moods, 4 per character, all with art', () => {
    expect(MOODS).toHaveLength(16);
    for (const m of MOODS) expect(m.src, m.id).toBeTruthy();
    for (const shelf of SHELVES) expect(MOODS.filter((m) => m.shelf === shelf)).toHaveLength(4);
  });

  it('only awards collectibles whose art exists', () => {
    for (const kind of ['stickers', 'scenePieces', 'moods'] as const) {
      for (const ids of Object.values(AWARD_POOLS[kind])) {
        for (const id of ids ?? []) expect(collectibleById(id)?.src, id).toBeTruthy();
      }
    }
    for (const shelf of SHELVES) {
      expect(AWARD_POOLS.stickers[shelf], shelf).toHaveLength(SHELF_SLOTS);
      expect(AWARD_POOLS.moods[shelf], shelf).toHaveLength(4);
    }
  });

  it('sells 12 accessories and keeps the thank-you sticker', () => {
    expect(ACCESSORIES).toHaveLength(12);
    for (const a of ACCESSORIES) {
      expect(a.price).toBeGreaterThan(0);
      expect(a.src).toBeTruthy();
    }
    expect(collectibleById(THANK_YOU_STICKER_ID)).toBeTruthy();
  });

  it('tilts stickers between -8 and +8 degrees, stable per id', () => {
    for (const s of SHELF_STICKERS.numbers) {
      const tilt = stickerTilt(s.id);
      expect(tilt).toBeGreaterThanOrEqual(-8);
      expect(tilt).toBeLessThanOrEqual(8);
      expect(stickerTilt(s.id)).toBe(tilt);
    }
  });
});
