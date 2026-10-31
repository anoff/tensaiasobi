/**
 * Sticker Book art catalog, built only from the manifests under src/assets.
 * New batches drop in by adding PNG/SVG files and manifest entries: an entry
 * whose PNG is missing is listed as an empty slot but is never awarded.
 */
import albumManifest from '../assets/stickers/album/manifest.json';
import moodManifest from '../assets/stickers/moods/manifest.json';
import accessoryManifest from '../assets/stickers/accessories/manifest.json';
import generalManifest from '../assets/stickers/general/manifest.json';
import characterManifest from '../assets/characters/manifest.json';
import type { AwardPools, Shelf, StickerSave } from './stickerRules';

const PNG = import.meta.glob<string>('../assets/{stickers,characters}/**/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
const artUrl = (folder: string, file: string): string | undefined => PNG[`../assets/${folder}/${file}`];

/** Same order as GAME_CATEGORIES (kept literal so games can import this file without a cycle). */
export const SHELVES: readonly Shelf[] = ['numbers', 'language', 'logic', 'play'];
/** Slots on one shelf page (Art Director: 12 drawn stickers per shelf). */
export const SHELF_SLOTS = 12;

export type CollectibleKind = 'sticker' | 'scene' | 'mood' | 'general';

export interface Collectible {
  id: string;
  kind: CollectibleKind;
  shelf: Shelf | null;
  /** PNG url, or undefined while the art has not landed yet. */
  src: string | undefined;
}

export type CharacterId = 'owl' | 'fox' | 'tortoise' | 'panda';
export type CharacterPose = 'idle' | 'cheer' | 'prop';

export interface CharacterInfo {
  id: CharacterId;
  shelf: Shelf;
  poses: Partial<Record<CharacterPose, string>>;
}

export interface Mood extends Collectible {
  kind: 'mood';
  character: CharacterId;
  mood: string;
}

/** A scene piece box in scene units (left/top/size of the 256 px sticker PNG). */
export interface ScenePiece extends Collectible {
  kind: 'scene';
  box: { x: number; y: number; size: number };
}

export interface SceneSet {
  id: string;
  shelf: Shelf;
  rewardId: string;
  ground: number;
  /** Ground line [min x, width] in scene units. */
  span: [number, number];
  pieces: ScenePiece[];
  /** The Art Director's faded outline page (paper card, ground line, dashed slots). */
  pageSrc: string;
  /** Area the board shows, in scene units: the whole outline page. */
  view: { x: number; y: number; w: number; h: number };
}

export interface Accessory {
  id: string;
  src: string | undefined;
  price: number;
}

const isShelf = (s: string): s is Shelf => (SHELVES as readonly string[]).includes(s);

/* Sticker PNG geometry (Art Director): 256 px canvas, art box 205 px at offset 22 px. */
const PNG_SIDE = 256;
const ART_BOX = 205;
const ART_OFFSET = 22;

export const SHELF_STICKERS: Record<Shelf, Collectible[]> = Object.fromEntries(
  SHELVES.map((shelf) => [
    shelf,
    albumManifest.stickers
      .filter((s) => s.shelf === shelf)
      .slice(0, SHELF_SLOTS)
      .map((s): Collectible => ({ id: s.id, kind: 'sticker', shelf, src: artUrl('stickers/album', s.file) })),
  ]),
) as Record<Shelf, Collectible[]>;

interface ScenePieceEntry {
  id: string;
  file: string;
  vb: number[];
  at: number[];
  scale?: number;
}
interface SceneEntry {
  shelf: string;
  page: { set: string; ground: number; span: number[]; file?: string };
  reward?: string;
  pieces: ScenePieceEntry[];
}

/* Outline page geometry (Art Director, alib.scene_page): 900 px card, 60 px side pad, +8/+9 px hard shadow. */
const PAGE_W = 900;
const PAGE_PAD = 60;

function buildScene(entry: SceneEntry): SceneSet | null {
  if (!isShelf(entry.shelf)) return null;
  const pieces = entry.pieces.map((p): ScenePiece => {
    const [x0, y0, side] = p.vb;
    const [ax, ay] = p.at;
    const k = p.scale ?? 1;
    const f = (k * side) / ART_BOX;
    return {
      id: p.id,
      kind: 'scene',
      shelf: entry.shelf as Shelf,
      src: artUrl('stickers/album', p.file),
      box: { x: ax + k * x0 - ART_OFFSET * f, y: ay + k * y0 - ART_OFFSET * f, size: PNG_SIDE * f },
    };
  });
  const { ground } = entry.page;
  const [spanX, spanW] = entry.page.span;
  // A scene is only playable on its outline page; one without a page waits for the art.
  if (!entry.page.file) return null;
  const pageSrc = artUrl('stickers/album', entry.page.file);
  if (!pageSrc) return null;
  // Same maths the page was drawn with, so pieces land exactly on their dashed slots.
  const s = (PAGE_W - 2 * PAGE_PAD) / spanW;
  const top = Math.min(...entry.pieces.map((p) => p.vb[1] + p.at[1]));
  const H = Math.round(s * (ground - top) + 150);
  const ox = PAGE_PAD - s * spanX;
  const oy = H - 70 - s * ground;
  const view = { x: -ox / s, y: -oy / s, w: (PAGE_W + 8) / s, h: (H + 9) / s };
  return {
    id: entry.page.set,
    shelf: entry.shelf,
    rewardId: entry.reward ?? 'general_star',
    ground,
    span: [spanX, spanW],
    pieces,
    pageSrc,
    view,
  };
}

/** One scene set per shelf; shelves without a scene in the manifest yet show a "coming soon" page. */
export const SCENES: SceneSet[] = (albumManifest.scenes as SceneEntry[])
  .map(buildScene)
  .filter((s): s is SceneSet => s !== null);

export const sceneForShelf = (shelf: Shelf): SceneSet | undefined => SCENES.find((s) => s.shelf === shelf);

export const CHARACTERS: CharacterInfo[] = characterManifest.characters
  .filter((c) => isShelf(c.shelf))
  .map((c) => ({
    id: c.id as CharacterId,
    shelf: c.shelf as Shelf,
    poses: Object.fromEntries(
      Object.entries(c.poses)
        .map(([pose, file]) => [pose, artUrl('characters', file)])
        .filter(([, url]) => url),
    ),
  }));

export const HOST_CHARACTER = characterManifest.host as CharacterId;

export const characterForShelf = (shelf: Shelf): CharacterInfo | undefined => CHARACTERS.find((c) => c.shelf === shelf);

/** A character pose url, falling back to idle; undefined while the character has no art (e.g. Tortoise). */
export function characterArt(id: CharacterId, pose: CharacterPose = 'idle'): string | undefined {
  const c = CHARACTERS.find((x) => x.id === id);
  return c?.poses[pose] ?? c?.poses.idle;
}

export const MOODS: Mood[] = moodManifest.moods
  .filter((m) => isShelf(m.shelf))
  .map((m) => ({
    id: m.id,
    kind: 'mood',
    shelf: m.shelf as Shelf,
    character: m.character as CharacterId,
    mood: m.mood,
    src: artUrl('stickers/moods', m.file),
  }));

export const moodsForShelf = (shelf: Shelf): Mood[] => MOODS.filter((m) => m.shelf === shelf);

export const ACCESSORIES: Accessory[] = accessoryManifest.accessories.map((a) => ({
  id: a.id,
  src: artUrl('stickers/accessories', a.file),
  price: a.price,
}));

export const accessoryById = (id: string) => ACCESSORIES.find((a) => a.id === id);

export const THANK_YOU_STICKER_ID = 'general_thank_you';

export const GENERAL_STICKERS: Collectible[] = generalManifest.stickers.map((s) => ({
  id: s.id,
  kind: 'general',
  shelf: null,
  src: artUrl('stickers/general', s.file),
}));

const ALL: Collectible[] = [
  ...SHELVES.flatMap((s) => SHELF_STICKERS[s]),
  ...SCENES.flatMap((s) => s.pieces),
  ...MOODS,
  ...GENERAL_STICKERS,
];
const BY_ID = new Map(ALL.map((c) => [c.id, c]));

export const collectibleById = (id: string): Collectible | undefined => BY_ID.get(id);

/** Only collectibles whose PNG exists can be earned, so missing art never shows as a broken image. */
const ready = (list: Collectible[]) => list.filter((c) => c.src).map((c) => c.id);

export const AWARD_POOLS: AwardPools = {
  stickers: Object.fromEntries(SHELVES.map((s) => [s, ready(SHELF_STICKERS[s])])),
  scenePieces: Object.fromEntries(SHELVES.map((s) => [s, ready(sceneForShelf(s)?.pieces ?? [])])),
  moods: Object.fromEntries(SHELVES.map((s) => [s, ready(moodsForShelf(s))])),
};

/** Slots a shelf page shows: 12 stickers, the character's moods and the scene pieces. */
export function shelfTotal(shelf: Shelf): number {
  return SHELF_SLOTS + moodsForShelf(shelf).length + (sceneForShelf(shelf)?.pieces.length ?? 0);
}

/** Collectibles on one shelf page that can be decorated (stickers, moods, general). */
export const isDecoratable = (c: Collectible) => c.kind !== 'scene';

/** Earned ids that count toward a shelf page: its stickers, its character's moods and its scene pieces. */
export function shelfEarned(book: StickerSave, shelf: Shelf): number {
  const ids = new Set([
    ...SHELF_STICKERS[shelf].map((s) => s.id),
    ...moodsForShelf(shelf).map((m) => m.id),
    ...(sceneForShelf(shelf)?.pieces.map((p) => p.id) ?? []),
  ]);
  return book.earned.filter((id) => ids.has(id)).length;
}

export function bookTotals(book: StickerSave): { earned: number; total: number } {
  const general = GENERAL_STICKERS.filter((g) => g.id !== 'general_star');
  return {
    earned:
      SHELVES.reduce((n, s) => n + shelfEarned(book, s), 0) + general.filter((g) => book.earned.includes(g.id)).length,
    total: SHELVES.reduce((n, s) => n + shelfTotal(s), 0) + general.length,
  };
}

/** Stable −8…+8° sticker tilt from its id (ART.md §5). */
export function stickerTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (((h % 17) + 17) % 17) - 8;
}
