import { test, expect } from '@playwright/test';

test.describe('Shadow Flashlight difficulty', () => {
  test('keeps the beam size and grows the silhouette on hard', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-shadow').click();
    await expect(page.getByTestId('shadow-stage')).toBeVisible();

    const easyScale = await page.getByTestId('shadow-silhouette').evaluate((el) => el.style.transform);
    const easyBeam = await page.getByTestId('shadow-beam').evaluate((el) => (el as { style: { width: string } }).style.width);

    await page.getByTestId('difficulty-hard').click();
    await expect(page.getByTestId('shadow-silhouette')).toBeVisible();

    const hardScale = await page.getByTestId('shadow-silhouette').evaluate((el) => el.style.transform);
    const hardBeam = await page.getByTestId('shadow-beam').evaluate((el) => (el as { style: { width: string } }).style.width);

    expect(easyBeam).toBe(hardBeam);
    expect(easyScale).toContain('0.72');
    expect(hardScale).toContain('1.8');
  });
});
