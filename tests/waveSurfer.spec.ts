import { test, expect } from '@playwright/test';

test.describe('Wave Surfer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-wave-surfer').click();
    await expect(page.getByTestId('wave-stage')).toBeVisible();
  });

  test('displays three floating items and exactly one is marked correct', async ({ page }) => {
    await expect.poll(async () => page.getByTestId('wave-item').count()).toBe(3);
    const items = page.getByTestId('wave-item');
    const correctFlags = await items.evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-correct') === 'true'),
    );
    expect(correctFlags.filter(Boolean)).toHaveLength(1);
  });

  test('each floating item has a unique lane and value', async ({ page }) => {
    await expect.poll(async () => page.getByTestId('wave-item').count()).toBe(3);
    const items = await page.getByTestId('wave-item').evaluateAll((els) =>
      els.map((el) => ({
        lane: Number(el.getAttribute('data-lane')),
        value: el.getAttribute('data-value'),
      })),
    );
    const lanes = items.map((i) => i.lane);
    const values = items.map((i) => i.value);
    expect(new Set(lanes).size).toBe(3);
    expect(new Set(values).size).toBe(3);
  });

  test('easy has no obstacles, medium and hard keep at least one clear lane', async ({ page }) => {
    await page.getByTestId('difficulty-easy').click();
    await expect.poll(async () => page.getByTestId('wave-obstacle').count()).toBe(0);

    for (const difficulty of ['medium', 'hard'] as const) {
      await page.getByTestId(`difficulty-${difficulty}`).click();
      const obstacles = await page.getByTestId('wave-obstacle').evaluateAll((els) =>
        els.map((el) => Number(el.getAttribute('data-lane'))),
      );
      expect(new Set(obstacles).size).toBeLessThan(3);
    }
  });

  test('tapping a lane button changes the surfer lane', async ({ page }) => {
    const surfer = page.getByTestId('wave-surfer');
    await expect(surfer).toBeVisible();
    const initialBox = await surfer.boundingBox();
    expect(initialBox).not.toBeNull();

    await page.getByTestId('wave-lane-0').click();
    await page.waitForTimeout(200);
    const topBox = await surfer.boundingBox();
    expect(topBox).not.toBeNull();
    expect(topBox!.y).toBeLessThan(initialBox!.y);

    await page.getByTestId('wave-lane-2').click();
    await page.waitForTimeout(200);
    const bottomBox = await surfer.boundingBox();
    expect(bottomBox).not.toBeNull();
    expect(bottomBox!.y).toBeGreaterThan(topBox!.y);
  });
});
