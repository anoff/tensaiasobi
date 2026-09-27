/**
 * One colour cue per operation across all maths games, so a child learns
 * "green = more joins, red = some leave" once and can rely on it everywhere.
 */
export type Operation = 'plus' | 'minus';

export const OPERATION_CLASSES: Record<Operation, string> = {
  plus: 'bg-emerald-100 border-emerald-300 text-emerald-700',
  minus: 'bg-rose-100 border-rose-300 text-rose-700',
};

/** Maps a raw operator symbol ('+', '-', '−') or a signed delta to its operation. */
export function operationOf(op: string | number): Operation {
  if (typeof op === 'number') return op < 0 ? 'minus' : 'plus';
  return op === '-' || op === '−' ? 'minus' : 'plus';
}
