import type { AppThemeId } from '../theme/appTheme';

/** Card faces per app theme (#74). Hard needs 8 pairs, so every pool has at least 8. */
export const MEMORY_POOLS: Record<AppThemeId, readonly string[]> = {
  animals: ['🦁', '🐯', '🐼', '🐨', '🦊', '🐰', '🐸', '🐷', '🐮', '🐔', '🐧', '🦉', '🐻', '🐹', '🐭', '🐱'],
  space: ['🚀', '🪐', '⭐', '☄️', '👽', '🛸', '🌙', '🛰️'],
  ocean: ['🐠', '🐡', '🐬', '🐙', '🦀', '🐳', '🦈', '🐚'],
};
