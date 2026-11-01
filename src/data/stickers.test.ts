import { describe, expect, it } from 'vitest';
import {
  SCENE_PIECES,
  ACCESSORIES,
  AWARD_POOLS,
  CHARACTERS,
  HOST_CHARACTER,
  MOODS,
  SHELF_SLOTS,
  SHELF_STICKERS,
  SHELVES,
  THANK_YOU_STICKER_ID,
  capsuleArt,
  characterForShelf,
  collectibleById,
  shelfTotal,
  stickerLook,
  stickerTilt,
} from './stickers';
import { GAME_CATEGORIES } from '../games/catalog';
import albumManifest from '../assets/stickers/album/manifest.json';

describe('sticker catalog (manifest driven)', () => {
  it('has one shelf per game category with at most SHELF_SLOTS stickers each', () => {
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

  it('fills every shelf with 18 drawn stickers _01.._18, each with a baked shiny variant', () => {
    for (const shelf of SHELVES) {
      const prefix = shelf === 'play' ? 'fun' : shelf;
      expect(SHELF_STICKERS[shelf].map((c) => c.id)).toEqual(
        Array.from({ length: SHELF_SLOTS }, (_, i) => `${prefix}_${String(i + 1).padStart(2, '0')}`),
      );
      for (const c of SHELF_STICKERS[shelf]) {
        expect(c.src).toBeTruthy();
        expect(stickerLook(c, true)).toEqual({ src: expect.stringContaining(`${c.id}_shiny`), sparkle: false });
      }
    }
  });

  it("gives each shelf its own capsule (closed, top, bottom); Just for fun uses the fun capsule", () => {
    const closed = SHELVES.map((s) => capsuleArt(s).closed);
    for (const s of SHELVES) expect(Object.values(capsuleArt(s)).every(Boolean)).toBe(true);
    expect(new Set(closed).size).toBe(4);
    expect(capsuleArt(null)).toEqual(capsuleArt('numbers'));
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

  it('keeps the 16 former scene pieces as normal stickers, 4 per shelf, each still earned from its shelf', () => {
    for (const shelf of SHELVES) {
      expect(SCENE_PIECES[shelf], shelf).toHaveLength(4);
      for (const p of SCENE_PIECES[shelf]) {
        expect(p.src, p.id).toBeTruthy();
        expect(p.src, p.id).not.toContain('outline');
        expect(collectibleById(p.id)).toBe(p);
      }
      // Same pool, same odds as before: only the outline page and its slots are gone.
      expect(AWARD_POOLS.scenePieces[shelf]).toEqual(SCENE_PIECES[shelf].map((p) => p.id));
      expect(shelfTotal(shelf)).toBe(SHELF_SLOTS + 4 + 4);
    }
    expect(SCENE_PIECES.numbers.map((p) => p.id)).toContain('scene_numbers_engine');
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
