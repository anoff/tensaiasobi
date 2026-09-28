import { expect, type Page } from '@playwright/test';

export type Band = 'little' | 'big';
export type Level = 'easy' | 'medium' | 'hard';

/** Kita reaches easy + medium, school reaches medium + hard: one entry per reachable level. */
export const ALL_LEVELS: ReadonlyArray<readonly [Band, Level]> = [
  ['little', 'easy'],
  ['little', 'medium'],
  ['big', 'hard'],
];

/** Go home, flip the age switch, open a game, and pick a level. */
export async function openGame(page: Page, launcher: string, band: Band, level?: Level) {
  await page.goto('/');
  await page.getByTestId(`age-mode-${band}`).click();
  await page.getByTestId(launcher).click();
  if (level) {
    await page.getByTestId(`difficulty-${level}`).click();
    await expect(page.getByTestId(`difficulty-${level}`)).toHaveAttribute('aria-pressed', 'true');
  }
}
