import { describe, expect, it } from 'vitest';
import { PAPER_MM, boxPixels, pageLayout, paperForLocale, sheetLayout, stickerOnPage } from './layout';

describe('print layout', () => {
  it('picks Letter for US/CA locales and A4 elsewhere', () => {
    expect(paperForLocale('en-US')).toBe('letter');
    expect(paperForLocale('fr_CA')).toBe('letter');
    expect(paperForLocale('de-DE')).toBe('a4');
    expect(paperForLocale('ja')).toBe('a4');
    expect(paperForLocale(undefined)).toBe('a4');
  });

  it('fits the portrait page on portrait paper inside the margins, centred, 1:1 on A4', () => {
    for (const paper of ['a4', 'letter'] as const) {
      const { width, height, box } = pageLayout(paper);
      expect(width).toBe(PAPER_MM[paper].w);
      expect(height).toBe(PAPER_MM[paper].h);
      expect(box.h / box.w).toBeCloseTo(Math.SQRT2, 6);
      expect(box.x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(box.y).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(box.x * 2 + box.w).toBeCloseTo(width, 6);
      expect(box.y * 2 + box.h).toBeCloseTo(height, 6);
    }
    // A4 is the page shape itself: 190 x 268.7 mm inside 10 mm side margins.
    const a4 = pageLayout('a4').box;
    expect(a4.w).toBeCloseTo(190, 6);
    expect(a4.h).toBeCloseTo(268.7, 1);
    // Letter is wider: height-bound, 259.4 mm tall.
    expect(pageLayout('letter').box.h).toBeCloseTo(259.4, 6);
  });

  it('rasterises the background at 200 dpi', () => {
    expect(boxPixels({ x: 0, y: 0, w: 254, h: 190.5 })).toEqual({ w: 2000, h: 1500 });
    expect(boxPixels({ x: 0, y: 0, w: 25.4, h: 25.4 }, 100)).toEqual({ w: 100, h: 100 });
  });

  it('maps a placement to mm like the board does', () => {
    const box = { x: 20, y: 10, w: 200, h: 150 };
    const s = stickerOnPage(box, { x: 0.5, y: 0.25, size: 1, rotation: 30 }, -5);
    expect(s.side).toBeCloseTo(60, 6); // 0.3 × page width
    expect(s.cx).toBeCloseTo(120, 6);
    expect(s.cy).toBeCloseTo(47.5, 6);
    expect(s.x).toBeCloseTo(90, 6);
    expect(s.y).toBeCloseTo(17.5, 6);
    expect(s.rotation).toBe(25);
    expect(stickerOnPage(box, { x: 0, y: 0, size: 0, rotation: 0 }).side).toBeCloseTo(44, 6);
    expect(stickerOnPage(box, { x: 0, y: 0, size: 2, rotation: 0 }).side).toBeCloseTo(80, 6);
  });

  it('lays 5 cm stickers on a grid that stays on the paper and paginates', () => {
    const a4 = sheetLayout('a4', 25);
    expect([a4.cols, a4.rows, a4.perPage]).toEqual([3, 5, 15]);
    expect(a4.pages.map((p) => p.length)).toEqual([15, 10]);
    const letter = sheetLayout('letter', 12);
    expect([letter.cols, letter.rows]).toEqual([3, 4]);
    for (const { width, height, pages } of [a4, letter]) {
      for (const b of pages.flat()) {
        expect(b.w).toBe(50);
        expect(b.x).toBeGreaterThanOrEqual(10);
        expect(b.y).toBeGreaterThanOrEqual(10);
        expect(b.x + b.w).toBeLessThanOrEqual(width - 10);
        expect(b.y + b.h).toBeLessThanOrEqual(height - 10);
      }
    }
    // Neighbours never overlap and keep the cutting gap.
    const [a, b, , , e] = a4.pages[0];
    expect(b.x - (a.x + a.w)).toBeCloseTo(6, 6);
    expect(e.y - (a.y + a.h)).toBeCloseTo(6, 6);
    expect(sheetLayout('a4', 0).pages).toEqual([]);
  });
});
