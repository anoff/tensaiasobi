import { test, expect } from '@playwright/test';

test.describe('Number Train E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Verify launcher, difficulty selector, and basic game elements', async ({ page }) => {
    const launcher = page.getByTestId('launch-number-train');
    await expect(launcher).toBeVisible();
    await launcher.click();

    await expect(page.getByTestId('difficulty-easy')).toBeVisible();
    await expect(page.getByTestId('difficulty-medium')).toBeVisible();
    await expect(page.getByTestId('difficulty-hard')).toBeVisible();

    await expect(page.getByTestId('number-train')).toBeVisible();
    const stations = page.getByTestId('number-train-station');
    await expect(stations.first()).toBeVisible();
  });

  test('Verify stations are at least 96px and correct count per difficulty', async ({ page }) => {
    const launcher = page.getByTestId('launch-number-train');
    await launcher.click();

    for (const diff of ['easy', 'medium', 'hard'] as const) {
      await page.getByTestId(`difficulty-${diff}`).click();

      const stations = page.getByTestId('number-train-station');
      const expectedCount = diff === 'easy' ? 3 : 5;
      await expect(stations).toHaveCount(expectedCount);
      await expect(stations.first()).toBeVisible();

      const count = await stations.count();
      for (let i = 0; i < count; i++) {
        const station = stations.nth(i);
        await expect(station).toBeVisible();
        const box = await station.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(96);
          expect(box.height).toBeGreaterThanOrEqual(96);
        }
      }
    }
  });

  test('Verify train cannot be dropped outside the stage', async ({ page }) => {
    const launcher = page.getByTestId('launch-number-train');
    await launcher.click();

    const train = page.getByTestId('number-train');
    const stage = train.locator('..');
    const trainBox = await train.boundingBox();
    expect(trainBox).not.toBeNull();

    // Drag train far outside the stage area
    await train.dragTo(stage, {
      targetPosition: { x: -500, y: -500 },
      force: true,
    });

    // Train should return to a visible position inside the stage
    await expect.poll(async () => {
      const box = await train.boundingBox();
      return box ? box.x : null;
    }).toBeGreaterThanOrEqual(0);

    const newBox = await train.boundingBox();
    expect(newBox).not.toBeNull();
    if (newBox) {
      expect(newBox.y).toBeGreaterThanOrEqual(0);
    }
  });
});
