/**
 * Scene pages (ART.md §6): Blank, or one of 20 themes built from layers picked by a seed stored on the page.
 * Pure data and maths, so the same layout drives the screen and the print PDF.
 *
 * Approved themes come from `assets/stickers/pages/themes.json`, the Artist's file copied in by
 * `scripts/import_scene_pages.py` (every file name, sky, prop slot and anchor is read from it). A theme
 * not in that file yet draws placeholder layers only: a flat sky (or wall) and a ground line at 78 %.
 */
import pagesJson from '../assets/stickers/pages/themes.json';
export const SCENE_THEME_IDS = [
  'playground',
  'living_room',
  'park',
  'beach',
  'forest',
  'farm',
  'town_street',
  'kitchen',
  'bedroom',
  'garden',
  'classroom',
  'train_station',
  'harbour',
  'campsite',
  'snowy_hill',
  'under_the_sea',
  'space',
  'castle',
  'market',
  'summer_festival',
] as const;
export type SceneThemeId = (typeof SCENE_THEME_IDS)[number];

export const isSceneThemeId = (v: unknown): v is SceneThemeId =>
  typeof v === 'string' && (SCENE_THEME_IDS as readonly string[]).includes(v);

/** The Artist's themes.json (only the approved themes are in the app copy). */
interface PagesJson {
  canvas: number[];
  ground_line: number;
  sticker_room: { x: number[]; y: number[] };
  /** Shared skies/walls by id. A theme may also list its own (theme-only) skies, see `ThemeSkyRef`. */
  skies: Record<string, { file: string; kind?: string }>;
  themes: {
    id: string;
    /** The skies this theme may use: ids from the shared `skies`, or theme-only `{ id, file }` entries. */
    skies: ThemeSkyRef[] | Record<string, string | { file: string }>;
    /** Sky the picker thumbnail uses (seed 1 otherwise picks it). */
    thumbSky?: string;
    backdrops: string[];
    ground: string;
    props: { file: string; id: string; size: number[]; slots: string[] }[];
    anchors: { slot: string; x: number; y: number; scale: number }[];
  }[];
}
type ThemeSkyRef = string | { id: string; file: string };
const PAGES = pagesJson as unknown as PagesJson;

/** A theme's skies as id → file, read from themes.json (shared ids resolve through the top-level `skies`). */
function themeSkies(t: PagesJson['themes'][number]): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  if (Array.isArray(t.skies)) {
    for (const ref of t.skies)
      if (typeof ref === 'string') out[ref] = PAGES.skies[ref]?.file ?? null;
      else out[ref.id] = ref.file;
  } else {
    for (const [id, ref] of Object.entries(t.skies)) out[id] = typeof ref === 'string' ? ref : ref.file;
  }
  return out;
}

/** Shared skies (outdoor) and walls (indoor), by themes.json id. */
export type SkyId = string;

/** Flat placeholder fills for themes without art: light enough to print, so stickers pop on top. */
const SKY_FILL: Record<string, string> = {
  day: '#cfe8f3',
  evening: '#f7d6bf',
  night: '#c3c6e4',
  wall_cream: '#f7eedb',
  wall_mint: '#d9efe2',
  wall_peach: '#f7dfcf',
};
const skyFill = (sky: SkyId) => SKY_FILL[sky] ?? '#f7eedb';
/** A shared sky/wall PNG by id, from themes.json. */
export const skyFile = (sky: SkyId): string | null => PAGES.skies[sky]?.file ?? null;

/** Prop slots. Standing props use the 4 side slots, low props the 2 front ones (themes.json `slots`). */
export type SlotId = 'left' | 'right' | 'back-left' | 'back-right' | 'low-left' | 'low-right';
/** Back slots are drawn first, the low front slots last. */
export const SLOT_ORDER: readonly SlotId[] = ['back-left', 'back-right', 'left', 'right', 'low-left', 'low-right'];
/** An anchor: the bottom-centre point of a prop, as 0–1 of the page, and the prop's scale there. */
export interface Anchor {
  slot: SlotId;
  x: number;
  y: number;
  scale: number;
}
/** Placeholder anchors (the pilot themes' values); all sit outside the sticker room. */
export const DEFAULT_ANCHORS: readonly Anchor[] = [
  { slot: 'left', x: 0.065, y: 0.8, scale: 1 },
  { slot: 'right', x: 0.935, y: 0.8, scale: 1 },
  { slot: 'back-left', x: 0.09, y: 0.78, scale: 0.7 },
  { slot: 'back-right', x: 0.91, y: 0.78, scale: 0.7 },
  { slot: 'low-left', x: 0.25, y: 0.95, scale: 1 },
  { slot: 'low-right', x: 0.75, y: 0.95, scale: 1 },
];

/** Ground line, as a share of the page height (y 1248 of 1600). */
export const GROUND_Y = PAGES.ground_line;
/** Ink line: 3 px on the 900 px wide canvas. */
export const LINE_WIDTH = 3 / PAGES.canvas[0];
/** Layer canvas width (props are drawn at their pixel size on it). */
export const CANVAS_W = PAGES.canvas[0];
/** The middle of the page that stays free of props (sticker room), as 0–1 of the page. */
export const STICKER_ROOM = {
  x0: PAGES.sticker_room.x[0],
  x1: PAGES.sticker_room.x[1],
  y0: PAGES.sticker_room.y[0],
  y1: PAGES.sticker_room.y[1],
} as const;

export interface SceneProp {
  file: string;
  slots: readonly SlotId[];
}
export interface SceneTheme {
  id: SceneThemeId;
  emoji: string;
  /** Skies (or walls) the seed may pick from. */
  skies: readonly SkyId[];
  /** Sky id → PNG (null for a placeholder theme), from themes.json. */
  skyFiles: Readonly<Record<SkyId, string | null>>;
  /** The sky the picker thumbnail uses, when themes.json names one. */
  thumbSky: SkyId | null;
  /** True when the theme's art is approved and in themes.json; false draws placeholder layers. */
  art: boolean;
  /** Placeholder ground / floor fill below the ground line. */
  groundFill: string;
  /** The 2 backdrops (empty for a placeholder theme). */
  backdrops: readonly string[];
  ground: string | null;
  /** The 5 props (empty for a placeholder theme). */
  props: readonly SceneProp[];
  anchors: readonly Anchor[];
}

const OUT: readonly SkyId[] = ['day', 'evening', 'night'];
const DAY: readonly SkyId[] = ['day', 'evening'];
const IN: readonly SkyId[] = ['wall_cream', 'wall_mint', 'wall_peach'];

const theme = (id: SceneThemeId, emoji: string, skies: readonly SkyId[], groundFill: string): SceneTheme => {
  const art = PAGES.themes.find((t) => t.id === id);
  if (!art) {
    const skyFiles = Object.fromEntries(skies.map((s) => [s, null]));
    return { id, emoji, skies, skyFiles, thumbSky: null, art: false, groundFill, backdrops: [], ground: null, props: [], anchors: DEFAULT_ANCHORS };
  }
  const skyFiles = themeSkies(art);
  const ids = Object.keys(skyFiles);
  return {
    id,
    emoji,
    skies: ids,
    skyFiles,
    thumbSky: art.thumbSky && ids.includes(art.thumbSky) ? art.thumbSky : null,
    art: true,
    groundFill,
    backdrops: art.backdrops,
    ground: art.ground,
    props: art.props.map((p) => ({ file: p.file, slots: p.slots as SlotId[] })),
    anchors: art.anchors.map((a) => ({ slot: a.slot as SlotId, x: a.x, y: a.y, scale: a.scale })),
  };
};

/** The 20 themes in the Art Director's order (ART.md §6). */
export const SCENE_THEMES: readonly SceneTheme[] = [
  theme('playground', '🛝', OUT, '#e9d3a6'),
  theme('living_room', '🛋️', IN, '#e3c39e'),
  theme('park', '🌳', OUT, '#bfe0a8'),
  theme('beach', '🏖️', DAY, '#f6e3b0'),
  theme('forest', '🌲', OUT, '#b7d8a0'),
  theme('farm', '🚜', OUT, '#cfe3a2'),
  theme('town_street', '🏘️', OUT, '#d9d4cc'),
  theme('kitchen', '🍳', IN, '#e8d9c0'),
  theme('bedroom', '🛏️', IN, '#e6cdb0'),
  theme('garden', '🌷', DAY, '#c4e3a8'),
  theme('classroom', '🏫', IN, '#e5cfa8'),
  theme('train_station', '🚉', OUT, '#d8d2c6'),
  theme('harbour', '⚓', OUT, '#bcd9e8'),
  theme('campsite', '🏕️', OUT, '#c9dda0'),
  theme('snowy_hill', '⛄', OUT, '#f4f7fa'),
  theme('under_the_sea', '🐚', ['day'], '#f1deb2'),
  theme('space', '🚀', ['night'], '#d6d2dc'),
  theme('castle', '🏰', OUT, '#c8dfa6'),
  theme('market', '🧺', DAY, '#e6d6b8'),
  theme('summer_festival', '🏮', ['evening', 'night'], '#e9d5b0'),
];

export const sceneThemeById = (id: SceneThemeId): SceneTheme => SCENE_THEMES.find((t) => t.id === id)!;

/** Seed the picker thumbnails are rendered from. */
export const THUMBNAIL_SEED = 1;

/** mulberry32: a small, stable PRNG, so the same seed gives the same page on every device. */
export function seededRng(seed: number): () => number {
  // Mix the seed first (murmur3 finaliser) so neighbouring seeds such as 1, 2, 3 give unrelated pages.
  let a = seed >>> 0;
  a = Math.imul(a ^ (a >>> 16), 0x85ebca6b);
  a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
  a = (a ^ (a >>> 16)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new seed in [1, 2^31), different from `not` (the dice always changes the page). */
export function newSeed(rng: () => number = Math.random, not?: number): number {
  for (;;) {
    const s = 1 + Math.floor(rng() * 0x7ffffffe);
    if (s !== not) return s;
  }
}

export interface PropPick {
  file: string;
  anchor: Anchor;
  mirror: boolean;
}
export interface SceneLayout {
  sky: SkyId;
  skyFill: string;
  /** The sky/wall PNG, or null for a placeholder theme (flat fill only). */
  skyFile: string | null;
  backdrop: { file: string; mirror: boolean } | null;
  ground: string | null;
  groundFill: string;
  /** In drawing order: back slots first. */
  props: PropPick[];
}

const shuffled = <T>(list: readonly T[], rng: () => number): T[] => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * What a themed page shows for a seed: 1 allowed sky, 1 of the 2 backdrops (maybe mirrored), the ground,
 * and 3–4 of the 5 props, each on a free slot it allows (each maybe mirrored). The sky is drawn first, so a
 * seed keeps its sky when a theme's art lands.
 */
export function sceneLayout(t: SceneTheme, seed: number, opts: { sky?: SkyId | null } = {}): SceneLayout {
  const rng = seededRng(seed);
  const drawn = t.skies[Math.floor(rng() * t.skies.length)];
  // A thumbnail may fix the sky; the draw above still happens, so everything else matches the seed.
  const sky = opts.sky && t.skies.includes(opts.sky) ? opts.sky : drawn;
  const backdropIndex = Math.floor(rng() * 2);
  const backdropMirror = rng() < 0.5;
  const propCount = rng() < 0.5 ? 3 : 4;
  const propOrder = shuffled(t.props, rng);
  const anchorOrder = shuffled(t.anchors, rng);
  const mirrors = [0, 1, 2, 3].map(() => rng() < 0.5);
  // The first props in the shuffled order, the pickiest placed first, each on its first free allowed slot;
  // a prop with no free slot gives way to the next one.
  const free = [...anchorOrder];
  const placed: { prop: SceneProp; anchor: Anchor }[] = [];
  const queue = [...propOrder];
  while (placed.length < propCount && queue.length) {
    const batch = queue.splice(0, propCount - placed.length).sort((a, b) => a.slots.length - b.slots.length);
    for (const prop of batch) {
      const at = free.findIndex((a) => prop.slots.includes(a.slot));
      if (at >= 0) placed.push({ prop, anchor: free.splice(at, 1)[0] });
    }
  }
  const props = placed
    .map((p, i) => ({ file: p.prop.file, anchor: p.anchor, mirror: mirrors[i] }))
    .sort((a, b) => SLOT_ORDER.indexOf(a.anchor.slot) - SLOT_ORDER.indexOf(b.anchor.slot));
  const backdropFile = t.backdrops[backdropIndex] ?? t.backdrops[0];
  return {
    sky,
    skyFill: skyFill(sky),
    skyFile: t.skyFiles[sky] ?? null,
    backdrop: backdropFile ? { file: backdropFile, mirror: backdropMirror } : null,
    ground: t.ground,
    groundFill: t.groundFill,
    props,
  };
}
