import type { CSSProperties } from 'react';

/** Block-table palette (#69): warm paper, ink outlines, three toy fills. */
export const INK = '#2a1c14';
export const PAPER = '#ffe7c2';
export const CORAL = '#ff4d3a';
export const LEAF = '#1f9a62';
export const BUTTER = '#ffc21a';
export const FILLS = [CORAL, LEAF, BUTTER] as const;
/** Just-for-fun shelf: no learning colour, only chalk, pebble and ink. */
export const CHALK = '#fffaf0';
export const PEBBLE = '#b8aea3';
export const COAL = '#3a2e27';
export const PLAY_FILLS = [CHALK, PEBBLE, COAL] as const;

export const hardShadow = (x = 5, y = 6) => `${x}px ${y}px 0 0 ${INK}`;

/** Glyph/text color that reads on a given fill: ink on light fills, paper on coral/leaf/coal. */
export const onFill = (fill: string) => (fill === BUTTER || fill === CHALK || fill === PEBBLE ? INK : '#fff');

/** Launcher tile labels stay ink on every toy fill except the dark coal block. */
export const tileLabelOn = (fill: string) => (fill === COAL ? '#fff' : INK);

export const PLAY_MAT_STYLE: CSSProperties = {
  backgroundColor: PAPER,
  backgroundImage: `radial-gradient(circle at 12px 12px, rgba(42,28,20,0.07) 1.6px, transparent 1.8px)`,
  backgroundSize: '28px 28px',
};
