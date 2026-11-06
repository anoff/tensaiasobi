import { test, expect } from '@playwright/test';

test.describe('Emoji sticker halo', () => {
  test('home tiles and theme emoji use an even SVG dilate, not chained drop-shadows', async ({ page }) => {
    await page.goto('/');
    const theme = page.getByTestId('theme-button').getByTestId('emoji-halo');
    await expect(theme).toHaveAttribute('data-halo-radius', '4');
    await expect(theme).toHaveCSS('filter', /url\(/);
    await expect(theme).not.toHaveCSS('filter', /drop-shadow/);

    const math = page.getByTestId('launch-math').getByTestId('emoji-halo');
    await expect(math).toHaveAttribute('data-halo-radius', '4');
    await expect(math).toHaveCSS('filter', /url\(/);
    await expect(math).not.toHaveCSS('filter', /drop-shadow/);

    await expect(page.locator('filter feMorphology[operator="dilate"]')).toHaveCount(await page.getByTestId('emoji-halo').count());
  });

  test('guide icons use the 2 px dilate', async ({ page }) => {
    await page.goto('/');
    const row = page.getByTestId('home-guide');
    await row.scrollIntoViewIfNeeded();
    await row.click();
    const icon = page.getByTestId('guide-game-math').getByTestId('emoji-halo');
    await expect(icon).toHaveAttribute('data-halo-radius', '2');
    await expect(icon).toHaveCSS('filter', /url\(/);
    await expect(icon).not.toHaveCSS('filter', /drop-shadow/);
  });
});
