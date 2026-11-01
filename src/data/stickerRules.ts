/**
 * Pure Sticker Book rules: capsule drops after a round, the duplicate/shiny copies they hold,
 * accessories (bought once, placed per sticker) and the town thank-you grant.
 * No React and no art imports, so every rule is unit-testable.
 */
import type { GameCategory } from '../games/catalog';

export type Shelf = GameCategory;

export const STICKER_STORAGE_KEY = 'gamification_stickers';
/**
 * Bump to reset every saved book (no migration by design). v2 (capsules) intentionally
 * discards v1 books per Andreas: kids start from an empty book.
 */
export const STICKER_SAVE_VERSION = 2;
/** Chance that a drawn copy is shiny (gold rim + sparkle). */
export const SHINY_CHANCE = 0.1;
/** Share of draws that go to stickers the kid does not own yet (when both kinds exist). */
export const MISSING_WEIGHT = 0.7;

/** Random source in [0, 1). Injected so tests can drive drops deterministically. */
export type Rng = () => number;

/** One accessory on one sticker; x/y is the accessory centre as a 0–1 fraction of the sticker box. */
export interface AccessoryPlacement {
  accessoryId: string;
  x: number;
  y: number;
}

/** One owned copy of a collectible. Duplicates are separate copies with the same `id`. */
export interface StickerCopy {
  /** Unique per copy (pages in M2 place copies by uid). */
  uid: string;
  id: string;
  shiny: boolean;
}

/** A "My pages" page (M2: blank paper or a scene background). Kept empty until the editor lands. */
export interface BookPage {
  id: string;
  background: string;
}

export interface StickerSave {
  version: number;
  /** Every owned copy in earn order (shelf stickers, scene pieces, moods, general). */
  copies: StickerCopy[];
  /** Capsules earned on `daily.date` (local YYYY-MM-DD); drives the drop curve. */
  daily: { date: string; k: number };
  /** My pages (M2). */
  pages: BookPage[];
  /** Scene pieces the kid has dragged onto their outline. */
  placedPieces: string[];
  /** Accessories bought with stars; global, usable on every sticker. */
  ownedAccessories: string[];
  /** stickerId → accessories placed on it. */
  placements: Record<string, AccessoryPlacement[]>;
  /** How many copies the kid has already seen in the book (for the home badge). */
  seenCount: number;
}

/** Earnable ids per shelf. Built from the manifests at runtime. */
export interface AwardPools {
  stickers: Partial<Record<Shelf, readonly string[]>>;
  scenePieces: Partial<Record<Shelf, readonly string[]>>;
  moods: Partial<Record<Shelf, readonly string[]>>;
}

export function emptyStickerSave(): StickerSave {
  return {
    version: STICKER_SAVE_VERSION,
    copies: [],
    daily: { date: '', k: 0 },
    pages: [],
    placedPieces: [],
    ownedAccessories: [],
    placements: {},
    seenCount: 0,
  };
}

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((s) => typeof s === 'string');
const isCopy = (c: unknown): c is StickerCopy =>
  !!c &&
  typeof (c as StickerCopy).uid === 'string' &&
  typeof (c as StickerCopy).id === 'string' &&
  typeof (c as StickerCopy).shiny === 'boolean';

/** Reads a stored book. Anything unreadable or from another save version (v1 too) starts a fresh book. */
export function parseStickerSave(raw: string | null): StickerSave {
  if (!raw) return emptyStickerSave();
  try {
    const v = JSON.parse(raw) as Partial<StickerSave>;
    if (!v || v.version !== STICKER_SAVE_VERSION) return emptyStickerSave();
    if (!Array.isArray(v.copies) || !isStringArray(v.placedPieces) || !isStringArray(v.ownedAccessories)) {
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
    const daily = v.daily && typeof v.daily.date === 'string' && typeof v.daily.k === 'number' ? v.daily : { date: '', k: 0 };
    return {
      version: STICKER_SAVE_VERSION,
      copies: v.copies.filter(isCopy),
      daily: { date: daily.date, k: daily.k },
      pages: Array.isArray(v.pages) ? v.pages : [],
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

/** Distinct owned ids in first-earn order. */
export function ownedIds(save: StickerSave): string[] {
  return [...new Set(save.copies.map((c) => c.id))];
}

export const owns = (save: StickerSave, id: string) => save.copies.some((c) => c.id === id);

/** How many copies of `id` the kid owns. */
export const copyCount = (save: StickerSave, id: string) => save.copies.filter((c) => c.id === id).length;

/** True when at least one owned copy of `id` is shiny. */
export const hasShiny = (save: StickerSave, id: string) => save.copies.some((c) => c.id === id && c.shiny);

/** Capsules already earned today (k); resets on a new local day. */
export const capsulesToday = (save: StickerSave, today: string) => (save.daily.date === today ? save.daily.k : 0);

/** Drop chance after a round: 1 / (2^(k+1) − 1) → 100 %, 1/3, 1/7, 1/15, … No pity, no cap. */
export const dropChance = (k: number) => 1 / (2 ** (k + 1) - 1);

/** All earnable ids on one shelf (stickers, scene pieces, moods). */
export const shelfPool = (shelf: Shelf, pools: AwardPools): string[] => [
  ...(pools.stickers[shelf] ?? []),
  ...(pools.scenePieces[shelf] ?? []),
  ...(pools.moods[shelf] ?? []),
];

const pick = <T>(list: readonly T[], rng: Rng): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

/**
 * Draws one id from the shelf: 70 % from ids the kid does not own yet, 30 % from owned ones.
 * When everything (or nothing) is owned it is a plain uniform draw. Null for an empty shelf.
 */
export function drawFromShelf(save: StickerSave, shelf: Shelf, pools: AwardPools, rng: Rng): string | null {
  const pool = shelfPool(shelf, pools);
  if (!pool.length) return null;
  const missing = pool.filter((id) => !owns(save, id));
  const owned = pool.filter((id) => owns(save, id));
  if (!missing.length || !owned.length) return pick(pool, rng);
  return pick(rng() < MISSING_WEIGHT ? missing : owned, rng);
}

/** Adds one copy (duplicates allowed). */
export function addCopy(save: StickerSave, id: string, shiny: boolean): { save: StickerSave; copy: StickerCopy } {
  const copy: StickerCopy = { uid: `c${save.copies.length + 1}`, id, shiny };
  return { save: { ...save, copies: [...save.copies, copy] }, copy };
}

/**
 * A finished round on `shelf`: rolls for a capsule with the daily curve; a hit draws one copy from
 * the played shelf (10 % shiny) and counts toward today's k. Pure chance, no pity, no cap.
 */
export function rollCapsule(
  save: StickerSave,
  shelf: Shelf,
  today: string,
  pools: AwardPools,
  rng: Rng = Math.random,
): { save: StickerSave; copy: StickerCopy | null } {
  const k = capsulesToday(save, today);
  if (rng() >= dropChance(k)) return { save, copy: null };
  const id = drawFromShelf(save, shelf, pools, rng);
  if (!id) return { save, copy: null };
  const shiny = rng() < SHINY_CHANCE;
  return addCopy({ ...save, daily: { date: today, k: k + 1 } }, id, shiny);
}

/** Grants a general sticker (thank-you) once. Does not count toward today's capsules. */
export function grantOnce(save: StickerSave, id: string): StickerSave {
  return owns(save, id) ? save : addCopy(save, id, false).save;
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
  if (!owns(save, stickerId) || !save.ownedAccessories.includes(accessoryId)) return save;
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
  if (!owns(save, pieceId) || save.placedPieces.includes(pieceId)) return save;
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
