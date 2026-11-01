import { describe, expect, it } from 'vitest';
import {
  CANVAS_W,
  GROUND_Y,
  SCENE_THEMES,
  SCENE_THEME_IDS,
  SLOT_ORDER,
  STICKER_ROOM,
  isSceneThemeId,
  newSeed,
  sceneLayout,
  sceneThemeById,
  skyFile,
  type SceneTheme,
  type SlotId,
} from './sceneThemes';
import { backgroundLayout, layerUrl, paintBackground, paintLayout } from './sceneArt';
import pages from '../assets/stickers/pages/themes.json';
import { en } from '../locales/en';

const PLAYGROUND = sceneThemeById('playground');
const LIVING_ROOM = sceneThemeById('living_room');
/** A theme without approved art draws placeholder layers (none left once all 20 are in). */
const PLACEHOLDER: SceneTheme = {
  ...SCENE_THEMES[2],
  skies: ['day', 'evening'],
  skyFiles: { day: null, evening: null },
  thumbSky: null,
  art: false,
  backdrops: [],
  ground: null,
  props: [],
};
const LOW: readonly SlotId[] = ['low-left', 'low-right'];

describe('scene themes', () => {
  it("lists the Art Director's 20 themes in order, each named in every language", () => {
    expect(SCENE_THEMES.map((t) => t.id)).toEqual([...SCENE_THEME_IDS]);
    expect(SCENE_THEME_IDS).toHaveLength(20);
    expect(SCENE_THEME_IDS.slice(0, 3)).toEqual(['playground', 'living_room', 'park']);
    expect(SCENE_THEME_IDS[19]).toBe('summer_festival');
    for (const t of SCENE_THEMES) {
      expect(en.stickerBook.themes[t.id], t.id).toBeTruthy();
      expect(t.skies.length, t.id).toBeGreaterThan(0);
      expect(t.anchors.map((a) => a.slot).sort(), t.id).toEqual([...SLOT_ORDER].sort());
    }
    expect(isSceneThemeId('park')).toBe(true);
    expect(isSceneThemeId('numbers')).toBe(false);
  });

  it("takes the approved themes from the Artist's themes.json; every file it names is in the app", () => {
    expect(SCENE_THEMES.filter((t) => t.art).map((t) => t.id)).toEqual(pages.themes.map((t) => t.id));
    expect(PLAYGROUND.art && LIVING_ROOM.art).toBe(true);
    const files = [
      ...Object.values(pages.skies).map((s) => s.file),
      ...SCENE_THEMES.flatMap((t) => [...t.backdrops, ...(t.ground ? [t.ground] : []), ...t.props.map((p) => p.file)]),
    ];
    for (const f of files) expect(layerUrl(f), f).toBeTruthy();
    for (const t of SCENE_THEMES.filter((x) => x.art)) {
      for (const s of t.skies) expect(skyFile(s), s).toBeTruthy();
      expect(t.backdrops).toHaveLength(2);
      expect(t.props).toHaveLength(5);
    }
    expect(GROUND_Y * pages.canvas[1]).toBeCloseTo(1248, 6);
    expect(CANVAS_W).toBe(900);
  });

  it("resolves every theme's skies, props and thumbnail sky to files listed in themes.json, all of them in the app", () => {
    const listed = new Set<string>();
    const walk = (n: unknown): void => {
      if (typeof n === 'string') {
        if (n.endsWith('.png')) listed.add(n);
      } else if (Array.isArray(n)) n.forEach(walk);
      else if (n && typeof n === 'object') Object.values(n).forEach(walk);
    };
    walk(pages);
    // All 20 themes have approved art: no placeholders left.
    expect(SCENE_THEMES.filter((t) => !t.art).map((t) => t.id)).toEqual([]);
    for (const t of SCENE_THEMES) {
      expect(t.skies.length, t.id).toBeGreaterThan(0);
      for (const sky of t.skies) {
        // Sky ids map to files only through the top-level `skies` list.
        const entry = (pages.skies as Record<string, { file: string; themeOnly?: string[] }>)[sky];
        expect(entry, `${t.id} sky id ${sky}`).toBeTruthy();
        if (entry.themeOnly) expect(entry.themeOnly, `${sky} is theme-only`).toContain(t.id);
        const file = t.skyFiles[sky];
        expect(file).toBe(entry.file);
        expect(file && listed.has(file), `${t.id} sky ${sky} -> ${file}`).toBe(true);
        expect(layerUrl(file!), file!).toBeTruthy();
      }
      for (const f of [...t.backdrops, t.ground!, ...t.props.map((p) => p.file)]) {
        expect(listed.has(f), `${t.id} ${f}`).toBe(true);
        expect(layerUrl(f), f).toBeTruthy();
      }
      const raw = pages.themes.find((x) => x.id === t.id) as { thumbSky?: string } | undefined;
      if (raw?.thumbSky !== undefined) {
        expect((pages.skies as Record<string, unknown>)[raw.thumbSky], `${t.id} thumbSky id`).toBeTruthy();
        expect(t.skies, `${t.id} thumbSky ${raw.thumbSky}`).toContain(raw.thumbSky);
        expect(t.thumbSky).toBe(raw.thumbSky);
      }
    }
  });

  it('draws the picker thumbnail from seed 1 with the thumbSky when there is one, otherwise the seed-1 sky', () => {
    const t = SCENE_THEMES.find((x) => x.skies.length > 1)!;
    const seeded = sceneLayout(t, 1);
    const other = t.skies.find((s) => s !== seeded.sky)!;
    const fixed = sceneLayout(t, 1, { sky: other });
    expect(fixed.sky).toBe(other);
    expect(fixed.skyFile).toBe(t.skyFiles[other]);
    expect({ ...fixed, sky: seeded.sky, skyFile: seeded.skyFile, skyFill: seeded.skyFill }).toEqual(seeded);
    // Unknown or missing thumbSky: the seed-1 sky.
    expect(sceneLayout(t, 1, { sky: 'nope' }).sky).toBe(seeded.sky);
    expect(sceneLayout(t, 1, { sky: null }).sky).toBe(seeded.sky);
    for (const x of SCENE_THEMES) {
      const thumb = backgroundLayout({ theme: x.id, seed: 1 }, true)!;
      expect(thumb.sky, x.id).toBe(x.thumbSky ?? sceneLayout(x, 1).sky);
    }
  });

  it('keeps the underwater sky for under the sea only', () => {
    expect(SCENE_THEMES.filter((t) => t.skies.includes('underwater')).map((t) => t.id)).toEqual(['under_the_sea']);
    expect(sceneThemeById('under_the_sea').skyFiles.underwater).toBe(pages.skies.underwater.file);
  });

  it('keeps every prop anchor out of the sticker room', () => {
    for (const t of SCENE_THEMES)
      for (const a of t.anchors) {
        const inside = a.x > STICKER_ROOM.x0 && a.x < STICKER_ROOM.x1 && a.y > STICKER_ROOM.y0 && a.y < STICKER_ROOM.y1;
        expect(inside, `${t.id} ${a.slot}`).toBe(false);
      }
  });

  it('is stable per seed and varies sky, backdrop, mirroring and 3-4 props, each on a free slot it allows, back slots first', () => {
    for (const t of SCENE_THEMES.filter((x) => x.art)) {
      expect(sceneLayout(t, 7)).toEqual(sceneLayout(t, 7));
      const layouts = Array.from({ length: 300 }, (_, i) => sceneLayout(t, i + 1));
      for (const l of layouts) {
        expect(t.skies).toContain(l.sky);
        expect(l.skyFile).toBe(skyFile(l.sky));
        expect(l.ground).toBe(t.ground);
        expect(l.props.length).toBeGreaterThanOrEqual(3);
        expect(l.props.length).toBeLessThanOrEqual(4);
        expect(new Set(l.props.map((p) => p.file)).size).toBe(l.props.length);
        expect(new Set(l.props.map((p) => p.anchor.slot)).size).toBe(l.props.length);
        for (const p of l.props) expect(t.props.find((x) => x.file === p.file)!.slots).toContain(p.anchor.slot);
        const order = l.props.map((p) => SLOT_ORDER.indexOf(p.anchor.slot));
        expect(order).toEqual([...order].sort((a, b) => a - b));
      }
      expect(new Set(layouts.map((l) => l.sky)).size).toBe(t.skies.length);
      expect(new Set(layouts.map((l) => l.backdrop?.file)).size).toBe(2);
      expect(new Set(layouts.map((l) => l.backdrop?.mirror)).size).toBe(2);
      expect(new Set(layouts.map((l) => l.props.length)).size).toBe(2);
      expect(new Set(layouts.flatMap((l) => l.props.map((p) => p.file))).size).toBe(5);
      expect(new Set(layouts.flatMap((l) => l.props.map((p) => p.mirror))).size).toBe(2);
    }
    // Low props (swings, seesaw, armchair, toy box) only ever stand on the front slots.
    const lowOnly = [...PLAYGROUND.props, ...LIVING_ROOM.props].filter((p) => p.slots.every((s) => LOW.includes(s)));
    expect(lowOnly).toHaveLength(4);
  });

  it('a placeholder theme draws only its flat sky and ground line', () => {
    const l = sceneLayout(PLACEHOLDER, 1);
    expect(PLACEHOLDER.skies).toContain(l.sky);
    expect(l.skyFile).toBeNull();
    expect(l.backdrop).toBeNull();
    expect(l.ground).toBeNull();
    expect(l.props).toEqual([]);
  });

  it('makes a new seed that differs from the old one', () => {
    let i = 0;
    const rng = () => [0, 0, 0.5][i++];
    expect(newSeed(rng, 1)).toBe(1 + Math.floor(0.5 * 0x7ffffffe));
    expect(newSeed(() => 0)).toBe(1);
  });
});

describe('page background composite (screen and print)', () => {
  const fakeCtx = () => {
    const calls: string[] = [];
    const ctx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      fillRect: (x: number, y: number, w: number, h: number) => calls.push(`fill ${ctx.fillStyle} ${x},${y},${w},${h}`),
      beginPath: () => {},
      moveTo: (x: number, y: number) => calls.push(`move ${x},${y}`),
      lineTo: (x: number, y: number) => calls.push(`line ${x},${y}`),
      stroke: () => calls.push(`stroke ${ctx.strokeStyle} ${ctx.lineWidth}`),
      drawImage: () => calls.push('image'),
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
    };
    return { ctx, calls };
  };

  it('paints a blank page as paper', async () => {
    const { ctx, calls } = fakeCtx();
    await paintBackground(ctx as never, 90, 160, 'blank');
    expect(calls).toEqual(['fill #ffe7c2 0,0,90,160']);
  });

  it('paints placeholder layers for a theme: its flat sky, then the ground under an ink line at 78 %', async () => {
    const { ctx, calls } = fakeCtx();
    const layout = sceneLayout(PLACEHOLDER, 3);
    await paintLayout(ctx as never, 900, 1600, layout);
    const gy = Math.round(1600 * GROUND_Y);
    expect(calls).toEqual([
      `fill ${layout.skyFill} 0,0,900,1600`,
      `fill ${layout.groundFill} 0,${gy},900,${1600 - gy}`,
      `move 0,${gy}`,
      `line 900,${gy}`,
      'stroke #2a1c14 3',
    ]);
  });
});
