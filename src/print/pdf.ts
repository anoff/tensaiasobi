/**
 * Print PDFs: the current My page and a sticker sheet. jsPDF, svg2pdf and the Capacitor save path load on
 * demand (dynamic imports), so none of them weigh on the first paint.
 */
import type { jsPDF } from 'jspdf';
import { Capacitor } from '@capacitor/core';
import { hasShiny, type BookPage, type StickerSave } from '../data/stickerRules';
import { SHINY_SPARKLE, collectibleById, stickerTilt } from '../data/stickers';
import { paintBackground } from '../data/sceneArt';
import { boxPixels, pageLayout, sheetLayout, stickerOnPage, type Box, type PaperSize } from './layout';
import { paddedSide, printStickerSvg, type PrintLayer } from './printSvg';

const PRINT_SVGS = import.meta.glob<string>('../assets/stickers/print/svg/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const printUrl = (name: string) => PRINT_SVGS[`../assets/stickers/print/svg/print_${name}.svg`];
export const hasPrintArt = (id: string) => Boolean(printUrl(id));

const text = new Map<string, Promise<string>>();
const fetchText = (url: string) => {
  if (!text.has(url))
    text.set(
      url,
      fetch(url).then((r) => r.text())
    );
  return text.get(url)!;
};

async function newDoc(paper: PaperSize) {
  const [{ jsPDF }] = await Promise.all([import('jspdf'), import('svg2pdf.js')]);
  return new jsPDF({ unit: 'mm', format: paper, orientation: 'portrait', compress: true });
}

/** svg2pdf reads computed styles, so each SVG sits in the DOM (off-screen) while it is drawn. */
async function drawSvg(doc: jsPDF, svg: string, box: Box) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;overflow:hidden';
  host.innerHTML = svg;
  document.body.appendChild(host);
  try {
    await doc.svg(host.firstElementChild as Element, { x: box.x, y: box.y, width: box.w, height: box.h });
  } finally {
    host.remove();
  }
}

/** The page background at 200 dpi as one JPEG: the same composite as on screen (paper, or the seeded scene). */
async function backgroundImage(page: BookPage, box: Box) {
  const { w, h } = boxPixels(box);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  await paintBackground(canvas.getContext('2d')!, w, h, page.background);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** The current page as on screen: background (optional), then each copy with its accessories, tilt and turn. */
export async function pagePdf(book: StickerSave, page: BookPage, paper: PaperSize, background: boolean) {
  const { box } = pageLayout(paper);
  const doc = await newDoc(paper);
  if (background) doc.addImage(await backgroundImage(page, box), 'JPEG', box.x, box.y, box.w, box.h);
  const sparkle = SHINY_SPARKLE ? await fetchText(SHINY_SPARKLE) : undefined;
  for (const pl of page.stickers) {
    const copy = book.copies.find((c) => c.uid === pl.uid);
    const url = copy && printUrl(copy.id);
    if (!copy || !url) continue;
    const layers: PrintLayer[] = copy.shiny && sparkle ? [{ svg: sparkle }] : [];
    for (const a of book.placements[pl.uid] ?? []) {
      const accUrl = printUrl(`acc_${a.accessoryId}`);
      if (accUrl) layers.push({ svg: await fetchText(accUrl), x: a.x, y: a.y });
    }
    const s = stickerOnPage(box, pl, stickerTilt(copy.id));
    const side = paddedSide(s.side);
    const svg = printStickerSvg(await fetchText(url), {
      shadow: true,
      shiny: copy.shiny,
      rotation: s.rotation,
      layers,
    });
    await drawSvg(doc, svg, { x: s.cx - side / 2, y: s.cy - side / 2, w: side, h: side });
  }
  return doc;
}

/** Owned stickers for the sheet: one of each, in earn order, gold if any copy is shiny. */
export function sheetStickers(book: StickerSave) {
  const ids = [...new Set(book.copies.map((c) => c.id))].filter((id) => collectibleById(id) && hasPrintArt(id));
  return ids.map((id) => ({ id, shiny: hasShiny(book, id) }));
}

/** Every owned sticker at 5 cm with its die-cut rim, on white, without shadows. */
export async function sheetPdf(book: StickerSave, paper: PaperSize) {
  const items = sheetStickers(book);
  const { pages } = sheetLayout(paper, items.length);
  const doc = await newDoc(paper);
  const sparkle = SHINY_SPARKLE ? await fetchText(SHINY_SPARKLE) : undefined;
  let i = 0;
  for (const [p, boxes] of pages.entries()) {
    if (p > 0) doc.addPage(paper, 'portrait');
    for (const b of boxes) {
      const { id, shiny } = items[i++];
      const layers = shiny && sparkle ? [{ svg: sparkle }] : [];
      const svg = printStickerSvg(await fetchText(printUrl(id)!), { shadow: false, shiny, layers });
      const side = paddedSide(b.w);
      const pad = (side - b.w) / 2;
      await drawSvg(doc, svg, { x: b.x - pad, y: b.y - pad, w: side, h: side });
    }
  }
  return doc;
}

/** Web: a normal download. iOS/Android: write to the cache and open the share sheet (needs `cap sync`). */
export async function savePdf(doc: jsPDF, filename: string) {
  if (!Capacitor.isNativePlatform()) {
    doc.save(filename);
    return;
  }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const data = doc.output('datauristring').split(',')[1];
  const { uri } = await Filesystem.writeFile({ path: filename, data, directory: Directory.Cache });
  await Share.share({ title: filename, url: uri });
}
