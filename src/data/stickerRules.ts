/**
 * Pure Sticker Book rules: what a finished round earns, the daily cap,
 * accessories (bought once, placed per sticker) and the town thank-you grant.
 * No React and no art imports, so every rule is unit-testable.
 */
import type { GameCategory } from '../games/catalog';

export type Shelf = GameCategory;

export const STICKER_STORAGE_KEY = 'gamification_stickers';
/** Bump to reset every saved book (no migration by design). */
export const STICKER_SAVE_VERSION = 1;
export const DAILY_STICKER_CAP = 5;

/** One accessory on one sticker; x/y is the accessory centre as a 0–1 fraction of the sticker box. */
export interface AccessoryPlacement {
  accessoryId: string;
  x: number;
  y: number;
}

export interface StickerSave {
  version: number;
  /** Earned collectible ids in earn order (shelf stickers, scene pieces, moods, general). */
  earned: string[];
  /** Local day (YYYY-MM-DD) that `dayCount` belongs to. */
  day: string;
  dayCount: number;
  /** Scene pieces the kid has dragged onto their outline. */
  placedPieces: string[];
  /** Accessories bought with stars; global, usable on every sticker. */
  ownedAccessories: string[];
  /** stickerId → accessories placed on it. */
  placements: Record<string, AccessoryPlacement[]>;
  /** How many earned ids the kid has already seen in the book (for the home badge). */
  seenCount: number;
}

/** Earnable ids per shelf, in page order. Built from the manifests at runtime. */
export interface AwardPools {
  stickers: Partial<Record<Shelf, readonly string[]>>;
  scenePieces: Partial<Record<Shelf, readonly string[]>>;
  moods: Partial<Record<Shelf, readonly string[]>>;
}

export function emptyStickerSave(): StickerSave {
  return {
    version: STICKER_SAVE_VERSION,
    earned: [],
    day: '',
    dayCount: 0,
    placedPieces: [],
    ownedAccessories: [],
    placements: {},
    seenCount: 0,
  };
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');

/** Reads a stored book. Anything unreadable or from another save version starts a fresh book. */
export function parseStickerSave(raw: string | null): StickerSave {
  if (!raw) return emptyStickerSave();
  try {
    const v = JSON.parse(raw) as Partial<StickerSave>;
    if (!v || v.version !== STICKER_SAVE_VERSION) return emptyStickerSave();
    if (!isStringArray(v.earned) || !isStringArray(v.placedPieces) || !isStringArray(v.ownedAccessories)) {
      return emptyStickerSave();
    }
    const placements: Record<string, AccessoryPlacement[]> = {};
    for (const [id, list] of Object.entries(v.placements ?? {})) {
      if (!Array.isArray(list)) continue;
      placements[id] = list.filter(
        (p): p is AccessoryPlacement =>
          !!p && typeof p.accessoryId === 'string' && typeof p.x === 'number' && typeof p.y === 'number',
      );
    }
    return {
      version: STICKER_SAVE_VERSION,
      earned: [...new Set(v.earned)],
      day: typeof v.day === 'string' ? v.day : '',
      dayCount: typeof v.dayCount === 'number' ? v.dayCount : 0,
      placedPieces: [...new Set(v.placedPieces)],
      ownedAccessories: [...new Set(v.ownedAccessories)],
      placements,
      seenCount: typeof v.seenCount === 'number' ? v.seenCount : 0,
    };
  } catch {
    return emptyStickerSave();
  }
}

export function localDay(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

export function stickersLeftToday(save: StickerSave, today: string): number {
  return save.day === today ? Math.max(0, DAILY_STICKER_CAP - save.dayCount) : DAILY_STICKER_CAP;
}

/**
 * The shelf page fills in a fixed rhythm so scenes and moods arrive early:
 * sticker, scene piece, sticker, mood, … An empty pool is skipped.
 */
const RHYTHM = ['stickers', 'scenePieces', 'stickers', 'moods'] as const;

/** The next missing collectible on a shelf page, ignoring the daily cap; null when the page is full. */
export function nextMissing(save: StickerSave, shelf: Shelf, pools: AwardPools): string | null {
  const earned = new Set(save.earned);
  const missing = (kind: keyof AwardPools) => (pools[kind][shelf] ?? []).find((id) => !earned.has(id)) ?? null;
  const onShelf = (Object.keys(pools) as (keyof AwardPools)[])
    .flatMap((k) => pools[k][shelf] ?? [])
    .filter((id) => earned.has(id)).length;
  for (let i = 0; i < RHYTHM.length; i++) {
    const id = missing(RHYTHM[(onShelf + i) % RHYTHM.length]);
    if (id) return id;
  }
  return null;
}

/** A finished round on `shelf`: earns the next missing collectible unless today's cap is used up. */
export function awardRound(
  save: StickerSave,
  shelf: Shelf,
  today: string,
  pools: AwardPools,
): { save: StickerSave; awarded: string | null } {
  if (stickersLeftToday(save, today) <= 0) return { save, awarded: null };
  const id = nextMissing(save, shelf, pools);
  if (!id) return { save, awarded: null };
  const dayCount = save.day === today ? save.dayCount + 1 : 1;
  return { save: { ...save, earned: [...save.earned, id], day: today, dayCount }, awarded: id };
}

/** Grants a general sticker (thank-you) once. Does not count toward the daily cap. */
export function grantOnce(save: StickerSave, id: string): StickerSave {
  return save.earned.includes(id) ? save : { ...save, earned: [...save.earned, id] };
}

export function canBuyAccessory(save: StickerSave, accessoryId: string, stars: number, price: number): boolean {
  return !save.ownedAccessories.includes(accessoryId) && stars >= price;
}

export function addOwnedAccessory(save: StickerSave, accessoryId: string): StickerSave {
  if (save.ownedAccessories.includes(accessoryId)) return save;
  return { ...save, ownedAccessories: [...save.ownedAccessories, accessoryId] };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Puts (or moves) an owned accessory on an earned sticker. One of each accessory per sticker. */
export function placeAccessory(
  save: StickerSave,
  stickerId: string,
  accessoryId: string,
  x: number,
  y: number,
): StickerSave {
  if (!save.earned.includes(stickerId) || !save.ownedAccessories.includes(accessoryId)) return save;
  const others = (save.placements[stickerId] ?? []).filter((p) => p.accessoryId !== accessoryId);
  return {
    ...save,
    placements: { ...save.placements, [stickerId]: [...others, { accessoryId, x: clamp01(x), y: clamp01(y) }] },
  };
}

export function removeAccessory(save: StickerSave, stickerId: string, accessoryId: string): StickerSave {
  const list = save.placements[stickerId];
  if (!list) return save;
  const next = list.filter((p) => p.accessoryId !== accessoryId);
  const placements = { ...save.placements };
  if (next.length) placements[stickerId] = next;
  else delete placements[stickerId];
  return { ...save, placements };
}

/** Snaps an earned scene piece onto its outline. */
export function placeScenePiece(save: StickerSave, pieceId: string): StickerSave {
  if (!save.earned.includes(pieceId) || save.placedPieces.includes(pieceId)) return save;
  return { ...save, placedPieces: [...save.placedPieces, pieceId] };
}

/** True when every piece of a scene sits on its outline (the reward star pops). */
export function isSceneComplete(save: StickerSave, pieceIds: readonly string[]): boolean {
  return pieceIds.length > 0 && pieceIds.every((id) => save.placedPieces.includes(id));
}

/** True when an old My Town save has at least one placed item. */
export function townHasItems(raw: string | null): boolean {
  if (!raw) return false;
  try {
    const grid = JSON.parse(raw) as unknown;
    return Array.isArray(grid) && grid.some((row) => Array.isArray(row) && row.some((cell) => cell != null));
  } catch {
    return false;
  }
}
