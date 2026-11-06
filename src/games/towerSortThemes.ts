import type { AppThemeId } from '../theme/appTheme';

export interface TowerSortTheme {
  id: AppThemeId;
  nameEmoji: string;
  emojis: string[];
  bgGradient: string;
}

/** One entry per app theme (#74). `id` is part of the best-moves key, so old `_fruits` records are orphaned. */
export const TOWER_SORT_THEMES: Record<AppThemeId, TowerSortTheme> = {
  animals: {
    id: 'animals',
    nameEmoji: '🐶',
    emojis: ['🐶', '🐱', '🐼', '🦊', '🐸', '🐰'],
    bgGradient: 'from-emerald-50 via-green-100 to-teal-50',
  },
  space: {
    id: 'space',
    nameEmoji: '🚀',
    emojis: ['🚀', '🪐', '⭐', '☄️', '👽', '🛸'],
    bgGradient: 'from-slate-900 via-indigo-950 to-slate-900',
  },
  ocean: {
    id: 'ocean',
    nameEmoji: '🐠',
    emojis: ['🐠', '🐬', '🐙', '🦀', '🐳', '🦈'],
    bgGradient: 'from-sky-100 via-cyan-100 to-blue-200',
  },
};
