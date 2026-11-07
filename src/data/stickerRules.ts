/**
 * Pure Sticker Book rules: capsule drops after a round, the duplicate/shiny copies they hold,
 * My pages (placing copies, at most MAX_PAGES), accessories (bought once, placed per copy) and the
 * town thank-you grant.
 * No React and no art imports, so every rule is unit-testable.
 */
import type { GameCategory } from '../games/catalog';
import { LEGACY_SCENE_PAGES } from './legacyScenePages';
import { isSceneThemeId, type SceneThemeId } from './sceneThemes';

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

/** Most My pages a book can hold. */
export const MAX_PAGES = 20;
/**
 * Most pages a stored book can hold: MAX_PAGES plus one per retired scene outline page. Old books convert
 * every outline page with snapped pieces into a blank page even past MAX_PAGES, so nothing placed is lost;
 * such a book simply cannot add pages until it is back under MAX_PAGES.
 */
export const MAX_STORED_PAGES = MAX_PAGES + LEGACY_SCENE_PAGES.length;
/** Sticker size steps on a page, as a share of the page width (the size handle cycles them). */
/** My page shape, width / height: 9:16 portrait (343x610 at 375x812). Placements are 0..1 of it. */
export const PAGE_ASPECT = 9 / 16;

export const PAGE_SIZE_STEPS = [0.22, 0.3, 0.4] as const;
export type SizeStep = 0 | 1 | 2;

/** One owned copy stuck on a page. x/y is its centre as a 0–1 fraction of the page. */
export interface PagePlacement {
  uid: string;
  x: number;
  y: number;
  size: SizeStep;
  /** The kid's rotation in degrees, on top of the sticker's own −8…+8° tilt. */
  rotation: number;
}

/** A My pages page: blank paper or a scene theme drawn from its seed. */
export interface BookPage {
  id: string;
  background: PageBackground;
  stickers: PagePlacement[];
}
/** 'blank' paper, or a scene theme whose layers the seed picks (same seed = same page, on screen and in print). */
export type PageBackground = 'blank' | { theme: SceneThemeId; seed: number };

export interface StickerSave {
  version: number;
  /** Every owned copy in earn order (shelf stickers, scene pieces, moods, general). */
  copies: StickerCopy[];
  /** Capsules earned on `daily.date` (local YYYY-MM-DD); drives the drop curve. */
  daily: { date: string; k: number };
  /** My pages: new ones only under MAX_PAGES (converted old books may hold up to MAX_STORED_PAGES). Autosaved with the rest of the book. */
  pages: BookPage[];
  /** Accessories bought with stars; global, usable on every sticker. */
  ownedAccessories: string[];
  /** Copy uid → accessories on that copy (each copy is placed at most once, so this is per placement). */
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

const isSeed = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n) && n > 0 && n < 2 ** 31;

/**
 * A stored background. Pages from before the scene themes ('paper', or a shelf's scene card) and anything
 * unknown become blank pages, so their stickers stay where the kid put them.
 */
function parseBackground(raw: unknown): PageBackground {
  if (raw && typeof raw === 'object') {
    const { theme, seed } = raw as { theme?: unknown; seed?: unknown };
    if (isSceneThemeId(theme) && isSeed(seed)) return { theme, seed };
  }
  return 'blank';
}
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Keeps well-formed pages (up to MAX_STORED_PAGES) and drops placements of unknown or already placed copies. */
function parsePages(raw: unknown, uids: ReadonlySet<string>): BookPage[] {
  if (!Array.isArray(raw)) return [];
  const used = new Set<string>();
  const pages: BookPage[] = [];
  for (const p of raw as Partial<BookPage>[]) {
    if (pages.length >= MAX_STORED_PAGES) break;
    if (!p || typeof p.id !== 'string' || !Array.isArray(p.stickers)) continue;
    const stickers: PagePlacement[] = [];
    for (const st of p.stickers as Partial<PagePlacement>[]) {
      if (!st || typeof st.uid !== 'string' || !uids.has(st.uid) || used.has(st.uid)) continue;
      if (typeof st.x !== 'number' || typeof st.y !== 'number' || typeof st.rotation !== 'number') continue;
      used.add(st.uid);
      const size = ([0, 1, 2] as const).includes(st.size as SizeStep) ? (st.size as SizeStep) : 1;
      stickers.push({ uid: st.uid, x: clamp01(st.x), y: clamp01(st.y), size, rotation: st.rotation });
    }
    pages.push({ id: p.id, background: parseBackground(p.background), stickers });
  }
  return pages;
}

/**
 * Old v2 books (before the scene themes) kept scene pieces snapped onto per-shelf outline pages in
 * `placedPieces`. A snap only recorded the piece id and never used up a copy: the copy stayed in the My pages
 * tray (or on a My page) at the same time. So each snapped piece is granted as one new plain copy, placed at
 * its old slot centre on a blank page made from its outline page (past MAX_PAGES if need be). Existing copies
 * and placements are untouched, and the grants count as seen (no "new" badge). Nothing is removed.
 */
function pagesFromPlacedPieces(save: StickerSave, placedPieces: readonly string[]): StickerSave {
  const snapped = new Set(placedPieces);
  let next = save;
  for (const set of LEGACY_SCENE_PAGES) {
    const pieces = set.filter((p) => snapped.has(p.id));
    if (!pieces.length) continue;
    const stickers: PagePlacement[] = [];
    for (const p of pieces) {
      const added = addCopy(next, p.id, false);
      next = { ...added.save, seenCount: added.save.seenCount + 1 };
      stickers.push({ uid: added.copy.uid, x: p.x, y: p.y, size: p.size, rotation: 0 });
    }
    next = { ...next, pages: [...next.pages, { id: nextPageId(next.pages), background: 'blank', stickers }] };
  }
  return next;
}

/** Reads a stored book. Anything unreadable or from another save version (v1 too) starts a fresh book. */
export function parseStickerSave(raw: string | null): StickerSave {
  if (!raw) return emptyStickerSave();
  try {
    const v = JSON.parse(raw) as Partial<StickerSave>;
    if (!v || v.version !== STICKER_SAVE_VERSION) return emptyStickerSave();
    const legacy = v as { placedPieces?: unknown };
    if (!Array.isArray(v.copies) || !isStringArray(v.ownedAccessories)) {
      return emptyStickerSave();
    }
    const placements: Record<string, AccessoryPlacement[]> = {};
    for (const [id, list] of Object.entries(v.placements ?? {})) {
      if (!Array.isArray(list)) continue;
      placements[id] = list.filter(
        (p): p is AccessoryPlacement =>
          !!p && typeof p.accessoryId === 'string' && typeof p.x === 'number' && typeof p.y === 'number'
      );
    }
    const daily =
      v.daily && typeof v.daily.date === 'string' && typeof v.daily.k === 'number' ? v.daily : { date: '', k: 0 };
    const book: StickerSave = {
      version: STICKER_SAVE_VERSION,
      copies: v.copies.filter(isCopy),
      daily: { date: daily.date, k: daily.k },
      pages: parsePages(v.pages, new Set(v.copies.filter(isCopy).map((c) => c.uid))),
      ownedAccessories: [...new Set(v.ownedAccessories)],
      placements,
      seenCount: typeof v.seenCount === 'number' ? v.seenCount : 0,
    };
    return isStringArray(legacy.placedPieces) ? pagesFromPlacedPieces(book, legacy.placedPieces) : book;
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
  const taken = new Set(save.copies.map((c) => c.uid));
  let n = save.copies.length + 1;
  while (taken.has(`c${n}`)) n++;
  const copy: StickerCopy = { uid: `c${n}`, id, shiny };
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
  rng: Rng = Math.random
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

/** Puts (or moves) an owned accessory on one copy. One of each accessory per copy. */
export function placeAccessory(save: StickerSave, uid: string, accessoryId: string, x: number, y: number): StickerSave {
  if (!save.copies.some((c) => c.uid === uid) || !save.ownedAccessories.includes(accessoryId)) return save;
  const others = (save.placements[uid] ?? []).filter((p) => p.accessoryId !== accessoryId);
  return {
    ...save,
    placements: {
      ...save.placements,
      [uid]: [...others, { accessoryId, x: clamp01(x), y: clamp01(y) }],
    },
  };
}

export function removeAccessory(save: StickerSave, uid: string, accessoryId: string): StickerSave {
  const list = save.placements[uid];
  if (!list) return save;
  const next = list.filter((p) => p.accessoryId !== accessoryId);
  const placements = { ...save.placements };
  if (next.length) placements[uid] = next;
  else delete placements[uid];
  return { ...save, placements };
}

const nextPageId = (pages: readonly BookPage[]) =>
  `p${Math.max(0, ...pages.map((p) => Number(p.id.slice(1)) || 0)) + 1}`;

/** True while the book has room for a new page (under MAX_PAGES); the New page option shows only then. */
export const canAddPage = (save: StickerSave) => save.pages.length < MAX_PAGES;

/** Adds an empty page (no-op at MAX_PAGES or more). */
export function addPage(save: StickerSave, background: PageBackground): StickerSave {
  if (!canAddPage(save)) return save;
  return {
    ...save,
    pages: [...save.pages, { id: nextPageId(save.pages), background, stickers: [] }],
  };
}

/** Removing placements frees their existing copies; ownership and per-copy accessories never change. */
export function deletePage(save: StickerSave, pageId: string): StickerSave {
  if (!save.pages.some((page) => page.id === pageId)) return save;
  return { ...save, pages: save.pages.filter((page) => page.id !== pageId) };
}

/** A new seed for an empty themed page (the dice). Populated or blank pages are unchanged. */
export function setPageSeed(save: StickerSave, pageId: string, seed: number): StickerSave {
  const page = save.pages.find((p) => p.id === pageId);
  if (!page || page.stickers.length > 0 || page.background === 'blank' || !isSeed(seed) || page.background.seed === seed) return save;
  const background = { theme: page.background.theme, seed };
  return { ...save, pages: save.pages.map((p) => (p === page ? { ...p, background } : p)) };
}

/** Copy uids already stuck on some page. */
export const placedUids = (save: StickerSave) => new Set(save.pages.flatMap((p) => p.stickers.map((s) => s.uid)));

/** Copies of `id` not on any page yet: a sticker owned ×3 can be placed 3 times. */
export const freeCopies = (save: StickerSave, id: string): StickerCopy[] => {
  const placed = placedUids(save);
  return save.copies.filter((c) => c.id === id && !placed.has(c.uid));
};

const editPage = (save: StickerSave, pageId: string, fn: (s: PagePlacement[]) => PagePlacement[]): StickerSave => {
  const page = save.pages.find((p) => p.id === pageId);
  if (!page) return save;
  const stickers = fn(page.stickers);
  if (stickers === page.stickers) return save;
  return {
    ...save,
    pages: save.pages.map((p) => (p === page ? { ...p, stickers } : p)),
  };
};

/** Sticks the next free copy of `id` onto a page. No-op when every copy is already placed. */
export function placeOnPage(save: StickerSave, pageId: string, id: string, x: number, y: number): StickerSave {
  const copy = freeCopies(save, id)[0];
  if (!copy) return save;
  return editPage(save, pageId, (list) => [
    ...list,
    { uid: copy.uid, x: clamp01(x), y: clamp01(y), size: 1, rotation: 0 },
  ]);
}

/** Moves, resizes or turns a placed copy. */
export function updatePlacement(
  save: StickerSave,
  pageId: string,
  uid: string,
  patch: Partial<Pick<PagePlacement, 'x' | 'y' | 'size' | 'rotation'>>
): StickerSave {
  return editPage(save, pageId, (list) =>
    list.some((s) => s.uid === uid)
      ? list.map((s) =>
          s.uid === uid
            ? {
                ...s,
                ...patch,
                x: clamp01(patch.x ?? s.x),
                y: clamp01(patch.y ?? s.y),
                rotation: Math.round(((((patch.rotation ?? s.rotation) % 360) + 540) % 360) - 180),
              }
            : s
        )
      : list
  );
}

/** Peels a copy off its page (back to the tray). Its accessories stay on the copy. */
export function removeFromPage(save: StickerSave, pageId: string, uid: string): StickerSave {
  return editPage(save, pageId, (list) => (list.some((s) => s.uid === uid) ? list.filter((s) => s.uid !== uid) : list));
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
