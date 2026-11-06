/**
 * One app-wide theme (#74). It changes play-area content only (emoji sets, the scene gradient inside a
 * game's stage); app chrome, shelves and tokens never change with it. Themed games: Maze, Tower Sort,
 * Memory Match. A new themed game must offer all three.
 */
export const APP_THEMES = ['animals', 'space', 'ocean'] as const;

export type AppThemeId = (typeof APP_THEMES)[number];

export const THEME_EMOJI: Record<AppThemeId, string> = {
  animals: '🐶',
  space: '🚀',
  ocean: '🐠',
};

export function isAppThemeId(value: unknown): value is AppThemeId {
  return typeof value === 'string' && (APP_THEMES as readonly string[]).includes(value);
}

/** A stored value from an older or hand-edited save: anything unknown is `animals`. */
export function toAppTheme(value: unknown): AppThemeId {
  return isAppThemeId(value) ? value : 'animals';
}

/** The home and in-game 🎨 buttons cycle animals → space → ocean → animals. */
export function nextTheme(id: AppThemeId): AppThemeId {
  return APP_THEMES[(APP_THEMES.indexOf(id) + 1) % APP_THEMES.length];
}
