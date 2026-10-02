import type { GameCategory } from '../games/catalog';
import { BUTTER, CORAL, LEAF, PLAY_FILLS } from './blockTable';

const CATEGORY_FILL: Record<Exclude<GameCategory, 'play'>, string> = {
  numbers: BUTTER,
  language: CORAL,
  logic: LEAF,
};

export const CATEGORY_EMOJI: Record<GameCategory, string> = {
  numbers: '🔢',
  language: '🔤',
  logic: '🧠',
  play: '🎲',
};

/** Learning categories keep one fill; the play shelf cycles chalk, pebble, coal. */
export function categoryFill(category: GameCategory, indexInSection: number): string {
  return category === 'play' ? PLAY_FILLS[indexInSection % PLAY_FILLS.length] : CATEGORY_FILL[category];
}
