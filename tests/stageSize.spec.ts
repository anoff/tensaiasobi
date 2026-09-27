import { test, expect } from '@playwright/test';

// Difficulty should scale the rules, not the number of fat-finger targets on the phone stage.
test.describe('Hard mode keeps targets tap-sized', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
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

  test('Magic Puzzle caps hard at 3×3', async ({ page }) => {
    await page.getByTestId('launch-puzzle').click();
    await page.getByTestId('difficulty-hard').click();
    await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(9);
  });

  test('Balance has a real difficulty ladder', async ({ page }) => {
    await page.getByTestId('launch-physics').click();
    for (const [diff, tray] of [['easy', 3], ['medium', 4], ['hard', 5]] as const) {
      await page.getByTestId(`difficulty-${diff}`).click();
      await expect(page.getByTestId('physics-tray-weight')).toHaveCount(tray);
    }
  });
});
