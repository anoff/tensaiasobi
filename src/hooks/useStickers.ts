import { useCallback, useState } from 'react';
import {
  STICKER_STORAGE_KEY,
  addOwnedAccessory,
  copyCount,
  grantOnce,
  localDay,
  parseStickerSave,
  placeAccessory,
  placeScenePiece,
  removeAccessory,
  rollCapsule,
  townHasItems,
  type Shelf,
  type StickerCopy,
  type StickerSave,
} from '../data/stickerRules';
import { AWARD_POOLS, THANK_YOU_STICKER_ID } from '../data/stickers';

/** The old My Town save. Read once: a non-empty town becomes the thank-you sticker, then the key is removed. */
export const LEGACY_TOWN_KEY = 'gamification_town';

function persist(save: StickerSave) {
  try {
    localStorage.setItem(STICKER_STORAGE_KEY, JSON.stringify(save));
  } catch (e) {
    console.error('Error saving stickers', e);
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
  placeAccessory: (stickerId: string, accessoryId: string, x: number, y: number) => void;
  removeAccessory: (stickerId: string, accessoryId: string) => void;
  placeScenePiece: (pieceId: string) => void;
  markSeen: () => void;
  resetStickers: () => void;
}

export function useStickers(): UseStickersReturn {
  const [book, setBook] = useState<StickerSave>(loadStickers);

  const update = useCallback((fn: (s: StickerSave) => StickerSave) => {
    setBook((prev) => {
      const next = fn(prev);
      if (next !== prev) persist(next);
      return next;
    });
  }, []);

  const completeRound = useCallback((shelf: Shelf) => {
    // Read the latest save synchronously so the caller learns what was earned right away.
    const current = parseStickerSave(localStorage.getItem(STICKER_STORAGE_KEY));
    const { save, copy } = rollCapsule(current, shelf, localDay(new Date()), AWARD_POOLS);
    if (!copy) return null;
    persist(save);
    setBook(save);
    return { copy, count: copyCount(save, copy.id) };
  }, []);

  return {
    book,
    completeRound,
    buyAccessory: useCallback((id: string) => update((s) => addOwnedAccessory(s, id)), [update]),
    placeAccessory: useCallback(
      (stickerId: string, accessoryId: string, x: number, y: number) =>
        update((s) => placeAccessory(s, stickerId, accessoryId, x, y)),
      [update],
    ),
    removeAccessory: useCallback(
      (stickerId: string, accessoryId: string) => update((s) => removeAccessory(s, stickerId, accessoryId)),
      [update],
    ),
    placeScenePiece: useCallback((pieceId: string) => update((s) => placeScenePiece(s, pieceId)), [update]),
    markSeen: useCallback(
      () => update((s) => (s.seenCount === s.copies.length ? s : { ...s, seenCount: s.copies.length })),
      [update],
    ),
    resetStickers: useCallback(() => {
      const fresh = parseStickerSave(null);
      persist(fresh);
      setBook(fresh);
    }, []),
  };
}
