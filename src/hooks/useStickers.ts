import { useCallback, useMemo, useRef, useState } from 'react';
import {
  STICKER_STORAGE_KEY,
  addOwnedAccessory,
  addPage,
  copyCount,
  deletePage,
  grantOnce,
  localDay,
  parseStickerSave,
  placeAccessory,
  placeOnPage,
  setPageSeed,
  removeAccessory,
  removeFromPage,
  updatePlacement,
  type PageBackground,
  type PagePlacement,
  rollCapsule,
  townHasItems,
  type Shelf,
  type StickerCopy,
  type StickerSave,
} from '../data/stickerRules';
import { AWARD_POOLS, THANK_YOU_STICKER_ID } from '../data/stickers';
import { newSeed } from '../data/sceneThemes';

/** The old My Town save. Read once: a non-empty town becomes the thank-you sticker, then the key is removed. */
export const LEGACY_TOWN_KEY = 'gamification_town';

function persist(save: StickerSave) {
  try {
    localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(save));
    return true;
  } catch (e) {
    console.error('Error saving stickers', e);
    return false;
  }
}

function loadStickers(): StickerSave {
  let save: StickerSave;
  try {
    save = parseStickerSave(localStorage.getItem(STICKER_STORAGE_KEY));
    const town = localStorage.getItem(LEGACY_TOWN_KEY);
    if (town !== null) {
      if (townHasItems(town)) save = grantOnce(save, THANK_YOU_STICKER_ID);
      localStorage.removeItem(LEGACY_TOWN_KEY);
      persist(save);
    }
  } catch {
    save = parseStickerSave(null);
  }
  return save;
}

/** A capsule won after a round: the drawn copy and how many copies of that sticker the kid now owns. */
export interface CapsuleAward {
  copy: StickerCopy;
  count: number;
}

export interface UseStickersReturn {
  book: StickerSave;
  /** A finished round on a shelf; rolls for a capsule. Returns the award, or null when the roll missed. */
  completeRound: (shelf: Shelf) => CapsuleAward | null;
  buyAccessory: (accessoryId: string) => void;
  /** Accessories go on one copy (by uid). */
  placeAccessory: (uid: string, accessoryId: string, x: number, y: number) => void;
  removeAccessory: (uid: string, accessoryId: string) => void;
  /** My pages edits; every change is saved straight away. */
  pages: {
    addPage: (background: PageBackground) => boolean;
    deletePage: (pageId: string) => boolean;
    place: (pageId: string, stickerId: string, x: number, y: number) => void;
    update: (pageId: string, uid: string, patch: Partial<Pick<PagePlacement, 'x' | 'y' | 'size' | 'rotation'>>) => void;
    remove: (pageId: string, uid: string) => void;
    /** The dice rerolls only empty themed pages; placed stickers lock the design. */
    reroll: (pageId: string) => void;
  };
  markSeen: () => void;
  resetStickers: () => void;
}

export function useStickers(): UseStickersReturn {
  const [book, setBook] = useState<StickerSave>(loadStickers);

  // Synchronous edits use the latest committed book, including multiple edits in one event.
  // Persist the whole transaction before publishing it; a failed write leaves both states intact.
  const currentBook = useRef(book);
  const update = useCallback((fn: (s: StickerSave) => StickerSave) => {
    const prev = currentBook.current;
    const next = fn(prev);
    if (next === prev) return false;
    if (!persist(next)) return false;
    currentBook.current = next;
    setBook(next);
    return true;
  }, []);

  const completeRound = useCallback((shelf: Shelf) => {
    // Read the latest save synchronously so the caller learns what was earned right away.
    const current = parseStickerSave(localStorage.getItem(STICKER_STORAGE_KEY));
    const { save, copy } = rollCapsule(current, shelf, localDay(new Date()), AWARD_POOLS);
    if (!copy) return null;
    if (!update(() => save)) return null;
    return { copy, count: copyCount(save, copy.id) };
  }, [update]);

  const pages = useMemo<UseStickersReturn['pages']>(
    () => ({
      addPage: (bg) => update((s) => addPage(s, bg)),
      deletePage: (pageId) => update((s) => deletePage(s, pageId)),
      place: (pageId, id, x, y) => update((s) => placeOnPage(s, pageId, id, x, y)),
      update: (pageId, uid, patch) => update((s) => updatePlacement(s, pageId, uid, patch)),
      remove: (pageId, uid) => update((s) => removeFromPage(s, pageId, uid)),
      reroll: (pageId) =>
        update((s) => {
          const bg = s.pages.find((p) => p.id === pageId)?.background;
          return bg && bg !== 'blank' ? setPageSeed(s, pageId, newSeed(Math.random, bg.seed)) : s;
        }),
    }),
    [update]
  );

  return {
    book,
    completeRound,
    pages,
    buyAccessory: useCallback((id: string) => update((s) => addOwnedAccessory(s, id)), [update]),
    placeAccessory: useCallback(
      (uid: string, accessoryId: string, x: number, y: number) =>
        update((s) => placeAccessory(s, uid, accessoryId, x, y)),
      [update]
    ),
    removeAccessory: useCallback(
      (uid: string, accessoryId: string) => update((s) => removeAccessory(s, uid, accessoryId)),
      [update]
    ),
    markSeen: useCallback(
      () => update((s) => (s.seenCount === s.copies.length ? s : { ...s, seenCount: s.copies.length })),
      [update]
    ),
    resetStickers: useCallback(() => {
      const fresh = parseStickerSave(null);
      update(() => fresh);
    }, [update]),
  };
}
