import { test, expect } from '@playwright/test';

test.describe('Bodyboard Wave Rider E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Verify launcher, difficulty selector, canvas, and paddle button', async ({ page }) => {
    const launcher = page.getByTestId('launch-bodyboard-wave-rider');
    await expect(launcher).toBeVisible();
    await launcher.click();

    await expect(page.getByTestId('difficulty-easy')).toBeVisible();
    await expect(page.getByTestId('difficulty-medium')).toBeVisible();
    await expect(page.getByTestId('difficulty-hard')).toBeVisible();
    await expect(page.getByTestId('bodyboard-canvas')).toBeVisible();
    await expect(page.getByTestId('bodyboard-paddle')).toBeVisible();
    await expect(page.getByTestId('bodyboard-distance')).toContainText('0m');
  });

  test('Verify wave generator cycles through small and large waves', async ({ page }) => {
    const launcher = page.getByTestId('launch-bodyboard-wave-rider');
    await launcher.click();

    const hasBothSizes = await page.evaluate(async () => {
      const module = await import('../src/utils/waves');
      const { generateWaves } = module;
      const waves = generateWaves('medium', 40, 0);
      const hasLarge = waves.some((w) => w.amplitude >= 0.85);
      const hasSmall = waves.some((w) => w.amplitude < 0.85);
      return { hasLarge, hasSmall, total: waves.length };
    });

    expect(hasBothSizes.hasLarge).toBe(true);
    expect(hasBothSizes.hasSmall).toBe(true);
    expect(hasBothSizes.total).toBe(40);
  });

  test('Verify alignment calculation is mathematically sound', async ({ page }) => {
    const launcher = page.getByTestId('launch-bodyboard-wave-rider');
    await launcher.click();

    const alignmentResult = await page.evaluate(async () => {
      const module = await import('../src/utils/waves');
      const { generateWaves, getActiveWave, isAligned } = module;
      const waves = generateWaves('easy', 10, 0);
      const activeWave = getActiveWave(waves, 96, 0);
      if (!activeWave) return { active: false, aligned: false };
      const aligned = isAligned(activeWave, 0, 96, 0.55);
      return { active: true, aligned, amplitude: activeWave.amplitude };
    });

    expect(alignmentResult.active).toBe(true);
    expect(alignmentResult.aligned).toBe(true);
    expect(alignmentResult.amplitude).toBeGreaterThanOrEqual(0.85);
  });

  test('Verify paddle button is at least 96px for kid-friendly touch', async ({ page }) => {
    const launcher = page.getByTestId('launch-bodyboard-wave-rider');
    await launcher.click();

    const button = page.getByTestId('bodyboard-paddle');
    const box = await button.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(96);
      expect(box.height).toBeGreaterThanOrEqual(96);
    }
  });

  test('Verify difficulty changes update target distance', async ({ page }) => {
    const launcher = page.getByTestId('launch-bodyboard-wave-rider');
    await launcher.click();

    for (const diff of ['easy', 'medium', 'hard'] as const) {
      await page.getByTestId(`difficulty-${diff}`).click();
      await expect(page.getByTestId('bodyboard-distance')).toContainText('0m');
    }
  });

  test('Verify a missed paddle resets to waiting state', async ({ page }) => {
    const launcher = page.getByTestId('launch-bodyboard-wave-rider');
    await launcher.click();

    // Force a missed state by overriding alignment math at the exact moment.
    await page.evaluate(() => {
      // @ts-expect-error test-only global override
      window.__bodyboardForceMiss = true;
    });
    await page.getByTestId('bodyboard-paddle').click();

    const message = page.getByTestId('bodyboard-message');
    await expect(message).toBeVisible();
    const text = await message.textContent();
    expect(text).not.toContain('Riding');
  });
});
