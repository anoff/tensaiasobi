import { test, expect } from '@playwright/test';

test.describe('Shadow Flashlight difficulty', () => {
  test('Kita-only: starts easy, hard is locked, and the beam size stays the same on medium', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-shadow').click();
    await expect(page.getByTestId('shadow-stage')).toBeVisible();
    await expect(page.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('difficulty-hard')).toBeDisabled();

    const easyScale = await page.getByTestId('shadow-silhouette').evaluate((el) => el.style.transform);
    const easyBeam = await page.getByTestId('shadow-beam').evaluate((el) => (el as { style: { width: string } }).style.width);

    await page.getByTestId('difficulty-medium').click();
    await expect(page.getByTestId('shadow-silhouette')).toBeVisible();
    const mediumBeam = await page.getByTestId('shadow-beam').evaluate((el) => (el as { style: { width: string } }).style.width);

    expect(easyBeam).toBe(mediumBeam);
    expect(easyScale).toContain('0.72');
  });
});
