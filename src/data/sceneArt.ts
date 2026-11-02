/**
 * The one scene-page composite, shared by the screen (a canvas behind the stickers) and the print PDF
 * (the same drawing at 200 dpi), so a page prints exactly as it shows.
 */
import { INK } from '../theme/blockTable';
import type { PageBackground } from './stickerRules';
import { CANVAS_W, GROUND_Y, LINE_WIDTH, sceneLayout, sceneThemeById, type SceneLayout } from './sceneThemes';

/* Approved scene layers, copied with their themes.json by scripts/import_scene_pages.py (900×1600 canvas;
   props are true-size PNGs on it). */
const LAYERS = import.meta.glob<string>('../assets/stickers/pages/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});
export const layerUrl = (file: string): string | undefined => LAYERS[`../assets/stickers/pages/${file}`];

/** `thumbnail`: the picker card, which uses the theme's thumbSky when themes.json names one. */
export const backgroundLayout = (bg: PageBackground, thumbnail = false): SceneLayout | null => {
  if (bg === 'blank') return null;
  const t = sceneThemeById(bg.theme);
  return sceneLayout(t, bg.seed, { sky: thumbnail ? t.thumbSky : null });
};

const images = new Map<string, Promise<HTMLImageElement | null>>();
function loadLayer(file: string): Promise<HTMLImageElement | null> {
  const url = layerUrl(file);
  if (!url) return Promise.resolve(null);
  if (!images.has(url))
    images.set(
      url,
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      }),
    );
  return images.get(url)!;
}

type Ctx = Pick<
  CanvasRenderingContext2D,
  'fillStyle' | 'strokeStyle' | 'lineWidth' | 'fillRect' | 'beginPath' | 'moveTo' | 'lineTo' | 'stroke' | 'drawImage' | 'save' | 'restore' | 'translate' | 'scale'
>;

function drawLayer(ctx: Ctx, img: HTMLImageElement | null, w: number, h: number, mirror: boolean) {
  if (!img) return;
  ctx.save();
  if (mirror) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, 0, 0, w, h);
  ctx.restore();
}

/**
 * Paints a page background into a w×h pixel box: solid white for a Blank page; for a scene the sky, backdrop,
 * ground (placeholder: a flat fill under an ink ground line at 78 %) and props on their anchors.
 */
export async function paintBackground(ctx: Ctx, w: number, h: number, bg: PageBackground, thumbnail = false): Promise<void> {
  await paintLayout(ctx, w, h, backgroundLayout(bg, thumbnail));
}

/** A Blank page is opaque white: on screen, on its picker card and in print (AD). */
export const BLANK_PAGE_FILL = '#ffffff';

/** Paints a layout (null = a Blank page, solid white): loads its layers, then draws them in order. */
export async function paintLayout(ctx: Ctx, w: number, h: number, layout: SceneLayout | null): Promise<void> {
  if (!layout) {
    ctx.fillStyle = BLANK_PAGE_FILL;
    ctx.fillRect(0, 0, w, h);
    return;
  }
  const [sky, backdrop, ground, ...props] = await Promise.all([
    layout.skyFile ? loadLayer(layout.skyFile) : null,
    layout.backdrop ? loadLayer(layout.backdrop.file) : null,
    layout.ground ? loadLayer(layout.ground) : null,
    ...layout.props.map((p) => loadLayer(p.file)),
  ]);
  ctx.fillStyle = layout.skyFill;
  ctx.fillRect(0, 0, w, h);
  drawLayer(ctx, sky, w, h, false);
  drawLayer(ctx, backdrop, w, h, layout.backdrop?.mirror ?? false);
  const gy = Math.round(h * GROUND_Y);
  if (ground) drawLayer(ctx, ground, w, h, false);
  else {
    ctx.fillStyle = layout.groundFill;
    ctx.fillRect(0, gy, w, h - gy);
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, w * LINE_WIDTH);
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }
  // Props at true size × the anchor's scale on the 900 px canvas, bottom centre on the anchor.
  layout.props.forEach((p, i) => {
    const img = props[i];
    if (!img) return;
    const k = (w / CANVAS_W) * p.anchor.scale;
    const pw = img.naturalWidth * k;
    const ph = img.naturalHeight * k;
    ctx.save();
    ctx.translate(p.anchor.x * w, p.anchor.y * h - ph);
    if (p.mirror) ctx.scale(-1, 1);
    ctx.drawImage(img, -pw / 2, 0, pw, ph);
    ctx.restore();
  });
}
