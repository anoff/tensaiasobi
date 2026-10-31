import { test, expect } from '@playwright/test';

test.describe('Home sorts games into categories', () => {
  test('numbers, language, logic and play sections hold the right games', async ({ page }) => {
    await page.goto('/');
    for (const band of ['little', 'big'] as const) {
      await page.getByTestId(`age-mode-${band}`).click();
      await expect(page.getByTestId('category-numbers').getByTestId('launch-math')).toBeVisible();
      await expect(page.getByTestId('category-language').getByTestId('launch-letterTrace')).toBeVisible();
      await expect(page.getByTestId('category-logic').getByTestId('launch-odd')).toBeVisible();
      await expect(page.getByTestId('category-play').getByTestId('launch-maze')).toBeVisible();
      await expect(page.getByTestId('category-play').getByTestId('launch-dispatch')).toBeVisible();
      await expect(page.getByTestId('category-stickers').getByTestId('launch-sticker-book')).toBeVisible();
      await expect(page.getByTestId('launch-town')).toHaveCount(0);
      await expect(page.getByTestId('category-play').getByTestId('launch-animal-genie')).toBeVisible();
      await expect(page.getByTestId('category-logic').getByTestId('launch-animal-genie')).toHaveCount(0);
    }
    await expect(page.getByTestId('category-language').getByTestId('launch-shiritori')).toBeVisible();
    await expect(page.getByTestId('category-logic').getByTestId('launch-tower-sort')).toBeVisible();
    await expect(page.getByTestId('launch-number-train')).toHaveCount(0);
    await page.getByTestId('age-mode-little').click();
    await expect(page.getByTestId('category-numbers').getByTestId('launch-number-train')).toBeVisible();
  });
});
