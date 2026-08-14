import { test, expect } from '@playwright/test';

test.describe('Bodyboard Wave Rider', () => {
  test('shows both generated wave sizes and an alignment window', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-bodyboard-wave-rider').click();

    const stage = page.getByTestId('bodyboard-stage');
    await expect(page.getByTestId('bodyboard-wave-canvas')).toBeVisible();
    await expect(stage).toHaveAttribute('data-wave-types', 'small,large');
    await expect(stage).toHaveAttribute('data-alignment-window', '72');
    await expect(page.getByTestId('bodyboard-paddle')).toBeVisible();
  });

  test('uses narrower mathematically defined alignment windows at higher difficulties', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-bodyboard-wave-rider').click();

    const stage = page.getByTestId('bodyboard-stage');
    await page.getByTestId('difficulty-medium').click();
    await expect(stage).toHaveAttribute('data-alignment-window', '38');
    await page.getByTestId('difficulty-hard').click();
    await expect(stage).toHaveAttribute('data-alignment-window', '26');
  });

  test('keeps the paddle target at least 96 pixels tall', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-bodyboard-wave-rider').click();
    const paddle = page.getByTestId('bodyboard-paddle');
    const box = await paddle.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(96);
  });

  test('catches an aligned large swell and reaches the beach', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-bodyboard-wave-rider').click();
    await expect(page.getByTestId('bodyboard-alignment')).toBeVisible({ timeout: 5000 });
    await page.getByTestId('bodyboard-paddle').click();
    await expect(page.getByText('Amazing ride to the beach!')).toBeVisible({ timeout: 3000 });
  });
});
