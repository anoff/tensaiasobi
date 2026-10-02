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
      await expect(page.getByTestId('category-play').getByTestId('launch-town')).toBeVisible();
    }
    await expect(page.getByTestId('category-language').getByTestId('launch-shiritori')).toBeVisible();
    await expect(page.getByTestId('category-logic').getByTestId('launch-tower-sort')).toBeVisible();
  });
});
