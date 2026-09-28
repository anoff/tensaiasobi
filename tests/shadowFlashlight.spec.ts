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

  test('hard: a wrong pick brings a new shadow without the victory screen', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-shadow').click();
    await page.getByTestId('difficulty-hard').click();
    const stage = page.getByTestId('shadow-stage');
    await expect(page.getByTestId('shadow-choice')).toHaveCount(6);
    const round = await stage.getAttribute('data-round');
    const target = await stage.getAttribute('data-target');

    const choices = page.getByTestId('shadow-choice');
    const emojis = await choices.evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim()));
    await choices.nth(emojis.findIndex((e) => e !== target)).click();

    await expect(page.getByTestId('shadow-play-again')).toHaveCount(0);
    await expect(stage).not.toHaveAttribute('data-round', round!);
    await expect(choices.first()).toBeEnabled();
  });
});
