import type { CSSProperties } from 'react';
import { BUTTER } from '../theme/blockTable';

/**
 * One colour cue per operation across all maths games, so a child learns
 * "green = more joins, red = some leave" once and can rely on it everywhere.
 */
export type Operation = 'plus' | 'minus' | 'times' | 'divide';

export const OPERATION_CLASSES: Record<Operation, string> = {
  plus: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  minus: 'bg-rose-100 border-rose-300 text-rose-700',
  times: 'text-ink',
  divide: 'bg-paper-rule border-ink/30 text-ink',
};

/** Cream (#fff8ec, the AnswerBubble / level-track fill in ART.md). */
const CREAM = '#fff8ec';

/**
 * Token colours that need inline styles: × gets a butter rim and butter at
 * 25 % over cream (hex alpha 40), with the glyph in notebook ink.
 */
export const OPERATION_STYLES: Partial<Record<Operation, CSSProperties>> = {
  times: { borderColor: BUTTER, backgroundColor: CREAM, backgroundImage: `linear-gradient(${BUTTER}40, ${BUTTER}40)` },
};

/** The big glyph drawn for each operation: real minus, times and divide signs, never * or /. */
export const OPERATION_GLYPHS: Record<Operation, string> = { plus: '+', minus: '−', times: '×', divide: '÷' };

/** Maps a raw operator symbol ('+', '-', '−', '×', '÷') or a signed delta to its operation. */
export function operationOf(op: string | number): Operation {
  if (typeof op === 'number') return op < 0 ? 'minus' : 'plus';
  if (op === '-' || op === '−') return 'minus';
  if (op === '×' || op === '*') return 'times';
  if (op === '÷' || op === '/') return 'divide';
  return 'plus';
}
