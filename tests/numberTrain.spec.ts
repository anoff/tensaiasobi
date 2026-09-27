import { test, expect } from '@playwright/test';

test.describe('Number Train E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-number-train').click();
  });

  test('Verify launcher, difficulty selector, and basic game elements', async ({ page }) => {
    await expect(page.getByTestId('difficulty-easy')).toBeVisible();
    await expect(page.getByTestId('difficulty-medium')).toBeVisible();
    await expect(page.getByTestId('difficulty-hard')).toBeVisible();

    await expect(page.getByTestId('number-train')).toBeVisible();
    await expect(page.getByTestId('number-train-station').first()).toBeVisible();
  });

  test('Verify stations are at least 96px, correct count per difficulty, and one wagon only', async ({ page }) => {
    for (const diff of ['easy', 'medium', 'hard'] as const) {
      await page.getByTestId(`difficulty-${diff}`).click();

      const stations = page.getByTestId('number-train-station');
      await expect(stations).toHaveCount(diff === 'easy' ? 3 : 4);

      const count = await stations.count();
      for (let i = 0; i < count; i++) {
        const box = await stations.nth(i).boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(96);
          expect(box.height).toBeGreaterThanOrEqual(96);
        }
      }

      // Passengers never exceed a single ten-seat wagon.
      const passengers = Number(await page.getByTestId('number-train').getAttribute('data-passengers'));
      expect(passengers).toBeGreaterThanOrEqual(1);
      expect(passengers).toBeLessThanOrEqual(diff === 'easy' ? 5 : 10);
      await expect(page.getByTestId('number-train-passenger')).toHaveCount(passengers);

      // Only hard asks for one more / one less.
      await expect(page.getByTestId('number-train-delta')).toHaveCount(diff === 'hard' ? 1 : 0);
    }
  });

  test('Tapping a wrong station keeps the round, tapping the right one starts the next', async ({ page }) => {
    const stage = page.getByTestId('number-train-stage');
    const answer = await stage.getAttribute('data-answer');
    const stations = page.getByTestId('number-train-station');

    const values = await stations.evaluateAll((els) => els.map((el) => el.getAttribute('data-value')));
    const wrong = values.find((value) => value !== answer)!;

    await page.locator(`[data-testid="number-train-station"][data-value="${wrong}"]`).click();
    await page.waitForTimeout(900);
    await expect(stage).toHaveAttribute('data-answer', answer!);
    await expect(stations.first()).toBeEnabled();

    await page.locator(`[data-testid="number-train-station"][data-value="${answer}"]`).click();
    await expect(stations.first()).toBeDisabled();
    await expect(page.getByTestId('stars-total')).toHaveText('1');
    await expect(stations.first()).toBeEnabled({ timeout: 4000 });
  });

  test('hard: a wrong station brings a new round instead of a retry', async ({ page }) => {
    await page.getByTestId('difficulty-hard').click();
    const stage = page.getByTestId('number-train-stage');
    await expect(page.getByTestId('number-train-station')).toHaveCount(4);
    const round = await stage.getAttribute('data-round');
    const answer = await stage.getAttribute('data-answer');
    await page.locator(`[data-testid="number-train-station"]:not([data-value="${answer}"])`).first().click();
    await expect(stage).not.toHaveAttribute('data-round', round!);
    await expect(page.getByTestId('stars-total')).toHaveText('0');
  });
});
