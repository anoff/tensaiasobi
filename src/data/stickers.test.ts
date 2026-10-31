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
      expect(entry.id.startsWith(`${entry.shelf}_`)).toBe(true);
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

  it('has 16 moods, 4 per character', () => {
    expect(MOODS).toHaveLength(16);
    for (const shelf of SHELVES) expect(MOODS.filter((m) => m.shelf === shelf)).toHaveLength(4);
  });

  it('only awards collectibles whose art exists', () => {
    for (const kind of ['stickers', 'scenePieces', 'moods'] as const) {
      for (const ids of Object.values(AWARD_POOLS[kind])) {
        for (const id of ids ?? []) expect(collectibleById(id)?.src, id).toBeTruthy();
      }
    }
    // Tortoise art has not landed yet: its moods are empty slots, not awards.
    expect(AWARD_POOLS.moods.logic ?? []).toEqual(
      MOODS.filter((m) => m.shelf === 'logic' && m.src).map((m) => m.id),
    );
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
