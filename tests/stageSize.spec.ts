import { test, expect } from '@playwright/test';
import { ALL_LEVELS, openGame } from './ageLevels';

// Difficulty should scale the rules, not the number of fat-finger targets on the phone stage.
test.describe('Hard mode keeps targets tap-sized', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-big').click();
  });

  test('City Dispatch stays a 5×5 grid on hard', async ({ page }) => {
    await page.getByTestId('launch-dispatch').click();
    await page.getByTestId('difficulty-hard').click();
    await page.getByTestId('dispatch-start').click();
    const cells = page.getByTestId('dispatch-cell');
    await expect(cells).toHaveCount(25);
    const box = await cells.first().boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(56);
  });

  test('Magic Puzzle grows 2×2 → 3×3 → 4×4', async ({ page }) => {
    const pieces = { easy: 4, medium: 9, hard: 16 } as const;
    for (const [band, diff] of ALL_LEVELS) {
      await openGame(page, 'launch-puzzle', band, diff);
      await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(pieces[diff]);
    }
  });

  test('Balance has a real difficulty ladder (school: easy locked, starts on medium)', async ({ page }) => {
    await page.getByTestId('launch-physics').click();
    await expect(page.getByTestId('difficulty-easy')).toBeDisabled();
    await expect(page.getByTestId('difficulty-medium')).toHaveAttribute('aria-pressed', 'true');
    for (const [diff, tray] of [['medium', 4], ['hard', 5]] as const) {
      await page.getByTestId(`difficulty-${diff}`).click();
      await expect(page.getByTestId('physics-tray-weight')).toHaveCount(tray);
    }
  });
});
