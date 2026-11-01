/** Print layout maths in millimetres (pure; unit-tested). */
import { PAGE_ASPECT, PAGE_SIZE_STEPS, type PagePlacement } from '../data/stickerRules';

export type PaperSize = 'a4' | 'letter';

export const PAPER_MM: Record<PaperSize, { w: number; h: number }> = {
  a4: { w: 210, h: 297 },
  letter: { w: 215.9, h: 279.4 },
};

/** Letter for the US, Canada, Mexico and the Philippines (by locale region); A4 everywhere else. */
export function paperForLocale(locale: string | undefined): PaperSize {
  const region = (locale ?? '').split(/[-_]/)[1]?.toUpperCase();
  return region && ['US', 'CA', 'MX', 'PH'].includes(region) ? 'letter' : 'a4';
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Background raster resolution. */
export const BACKGROUND_DPI = 200;
/** Edge of a sticker on the sticker sheet. */
export const SHEET_STICKER_MM = 50;
export const PAGE_MARGIN_MM = 10;
export const SHEET_GAP_MM = 6;

/** A My page (A4 portrait shape) on portrait paper: the biggest centred box inside the margins. */
export function pageLayout(paper: PaperSize, aspect = PAGE_ASPECT, margin = PAGE_MARGIN_MM) {
  const { w: pw, h: ph } = PAPER_MM[paper];
  const aw = pw - 2 * margin;
  const ah = ph - 2 * margin;
  const w = Math.min(aw, ah * aspect);
  const h = w / aspect;
  return { width: pw, height: ph, box: { x: (pw - w) / 2, y: (ph - h) / 2, w, h } };
}

/** Pixel size of a box rasterised at `dpi`. */
export const boxPixels = (box: Box, dpi = BACKGROUND_DPI) => ({
  w: Math.round((box.w / 25.4) * dpi),
  h: Math.round((box.h / 25.4) * dpi),
});

/**
 * Where a placed copy lands on the printed page: its square (before turning), the centre and the total
 * turn (page rotation + the sticker's own tilt). Same maths as the board: the edge is the page width × size step.
 */
export function stickerOnPage(box: Box, pl: Pick<PagePlacement, 'x' | 'y' | 'size' | 'rotation'>, tilt = 0) {
  const side = box.w * PAGE_SIZE_STEPS[pl.size];
  const cx = box.x + pl.x * box.w;
  const cy = box.y + pl.y * box.h;
  return { cx, cy, side, x: cx - side / 2, y: cy - side / 2, rotation: pl.rotation + tilt };
}

/** Sticker sheet: a centred grid of `side` squares on portrait paper, split over as many pages as needed. */
export function sheetLayout(
  paper: PaperSize,
  count: number,
  side = SHEET_STICKER_MM,
  margin = PAGE_MARGIN_MM,
  gap = SHEET_GAP_MM
) {
  const { w, h } = PAPER_MM[paper];
  const cols = Math.max(1, Math.floor((w - 2 * margin + gap) / (side + gap)));
  const rows = Math.max(1, Math.floor((h - 2 * margin + gap) / (side + gap)));
  const x0 = (w - (cols * side + (cols - 1) * gap)) / 2;
  const y0 = (h - (rows * side + (rows - 1) * gap)) / 2;
  const perPage = cols * rows;
  const pages: Box[][] = [];
  for (let i = 0; i < count; i++) {
    const p = Math.floor(i / perPage);
    const k = i % perPage;
    (pages[p] ??= []).push({
      x: x0 + (k % cols) * (side + gap),
      y: y0 + Math.floor(k / cols) * (side + gap),
      w: side,
      h: side,
    });
  }
  return { width: w, height: h, cols, rows, perPage, pages };
}
