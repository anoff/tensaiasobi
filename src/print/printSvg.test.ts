import { describe, expect, it } from 'vitest';
import { PRINT_BOX, SHINY_RIM, TURN_PAD, paddedSide, printStickerSvg, svgInner } from './printSvg';

const STICKER =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">' +
  '<path id="shadow" d="M0 0Z" fill="#2a1c14" transform="translate(6 7)"/><path id="edge" d="M0 0Z" fill="#2a1c14"/>' +
  '<path id="rim" d="M1 1Z" fill="#b8aea3"/><path id="cut" d="M2 2Z" fill="#ffffff"/><svg id="art" x="25" y="25"></svg></svg>';
const ACC =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><circle r="3"/></svg>';

describe('print svg', () => {
  it('pads the box so any turn stays inside', () => {
    expect(TURN_PAD).toBe(54);
    expect(((PRINT_BOX + 2 * TURN_PAD) / 2) ** 2).toBeGreaterThanOrEqual(2 * (PRINT_BOX / 2) ** 2);
    expect(paddedSide(50)).toBeCloseTo((50 * 364) / 256, 6);
  });

  it('drops the shadow for the sheet and keeps it on the page', () => {
    expect(printStickerSvg(STICKER, { shadow: false, shiny: false })).not.toContain('id="shadow"');
    expect(printStickerSvg(STICKER, { shadow: true, shiny: false })).toContain('id="shadow"');
  });

  it('turns a shiny rim gold and nothing else', () => {
    const s = printStickerSvg(STICKER, { shadow: false, shiny: true });
    expect(s).toContain(`<path id="rim" d="M1 1Z" fill="${SHINY_RIM}"/>`);
    expect(s).toContain('<path id="cut" d="M2 2Z" fill="#ffffff"/>');
    expect(printStickerSvg(STICKER, { shadow: false, shiny: false })).toContain('fill="#b8aea3"');
  });

  it('turns around the centre and offsets accessories like the screen', () => {
    const s = printStickerSvg(STICKER, {
      shadow: true,
      shiny: false,
      rotation: -30,
      layers: [{ svg: ACC, x: 0.25, y: 0.5 }],
    });
    expect(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-54 -54 364 364"')).toBe(true);
    expect(s).toContain('<g transform="rotate(-30 128 128)">');
    expect(s).toContain(
      '<svg x="-64" y="0" width="256" height="256" viewBox="0 0 256 256"><circle r="3"/></svg></g></svg>'
    );
    expect(svgInner(ACC)).toBe('<circle r="3"/>');
  });
});
