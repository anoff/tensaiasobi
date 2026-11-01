/** String surgery on the generated print SVGs (scripts/build_print_svgs.py; pure, unit-tested). */

/** Shiny rim gold (ART.md §6, make_shiny.py). */
export const SHINY_RIM = '#e08a00';
/** Print SVGs draw on a 256 px sticker box. */
export const PRINT_BOX = 256;
/** Room around the box so a turned sticker never clips (half the diagonal minus half the side, rounded up). */
export const TURN_PAD = Math.ceil((PRINT_BOX * Math.SQRT2 - PRINT_BOX) / 2);

/** The inside of an `<svg>` document (drops the root tag). */
export const svgInner = (svg: string) =>
  svg
    .trim()
    .replace(/^<\?xml[^>]*>\s*/, '')
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');

const VIEWBOX = (svg: string) => /viewBox="([^"]+)"/.exec(svg)?.[1] ?? `0 0 ${PRINT_BOX} ${PRINT_BOX}`;

export interface PrintLayer {
  svg: string;
  /** Accessory spot on the sticker (0..1, 0.5 = centred), as in AccessoryPlacement. */
  x?: number;
  y?: number;
}

export interface PrintStickerOptions {
  /** Keep the hard ink shadow (on-page look); the sticker sheet drops it. */
  shadow: boolean;
  /** Gold rim (the sparkle comes in as a layer). */
  shiny: boolean;
  /** Degrees clockwise around the sticker centre. */
  rotation?: number;
  /** Drawn on top, each a 256 px box offset like the on-screen accessories. */
  layers?: PrintLayer[];
}

/** One self-contained SVG for svg2pdf: padded box (TURN_PAD each side), turned, with its layers. */
export function printStickerSvg(sticker: string, { shadow, shiny, rotation = 0, layers = [] }: PrintStickerOptions) {
  let inner = svgInner(sticker);
  if (!shadow) inner = inner.replace(/<path id="shadow"[^>]*\/>/, '');
  if (shiny) inner = inner.replace(/(<path id="rim"[^>]*?fill=")[^"]*"/, `$1${SHINY_RIM}"`);
  const extra = layers
    .map(({ svg, x = 0.5, y = 0.5 }) => {
      const dx = +((x - 0.5) * PRINT_BOX).toFixed(2);
      const dy = +((y - 0.5) * PRINT_BOX).toFixed(2);
      return `<svg x="${dx}" y="${dy}" width="${PRINT_BOX}" height="${PRINT_BOX}" viewBox="${VIEWBOX(svg)}">${svgInner(
        svg
      )}</svg>`;
    })
    .join('');
  const c = PRINT_BOX / 2;
  const full = PRINT_BOX + 2 * TURN_PAD;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-TURN_PAD} ${-TURN_PAD} ${full} ${full}" width="${full}" height="${full}">` +
    `<g transform="rotate(${rotation} ${c} ${c})">${inner}${extra}</g></svg>`
  );
}

/** Edge (mm) of the padded print SVG for a sticker whose box edge is `side` mm. */
export const paddedSide = (side: number) => (side * (PRINT_BOX + 2 * TURN_PAD)) / PRINT_BOX;
