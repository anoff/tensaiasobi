import { test, expect } from '@playwright/test';

test.describe('Snorkel Pearl Finder E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Verify launcher, difficulty selector, and basic game elements', async ({ page }) => {
    const launcher = page.getByTestId('launch-snorkel-pearl-finder');
    await expect(launcher).toBeVisible();
    await launcher.click();

    await expect(page.getByTestId('difficulty-easy')).toBeVisible();
    await expect(page.getByTestId('difficulty-medium')).toBeVisible();
    await expect(page.getByTestId('difficulty-hard')).toBeVisible();

    await expect(page.getByTestId('snorkel-stage')).toBeVisible();
    const clams = page.getByTestId('snorkel-clam');
    await expect(clams.first()).toBeVisible();
  });

  test('Verify pearl count and clam coverage per difficulty', async ({ page }) => {
    const launcher = page.getByTestId('launch-snorkel-pearl-finder');
    await launcher.click();

    for (const diff of ['easy', 'medium', 'hard'] as const) {
      await page.getByTestId(`difficulty-${diff}`).click();

      const pearls = page.getByTestId('snorkel-pearl');
      const expectedCount = diff === 'easy' ? 3 : diff === 'medium' ? 5 : 6;
      await expect(pearls).toHaveCount(expectedCount);

      const clamColors = new Set<string>();
      const clams = page.getByTestId('snorkel-clam');
      const clamCount = await clams.count();
      expect(clamCount).toBeGreaterThanOrEqual(diff === 'easy' ? 2 : diff === 'medium' ? 3 : 4);

      for (let i = 0; i < clamCount; i++) {
        const color = await clams.nth(i).getAttribute('data-clam-color');
        if (color) clamColors.add(color);
      }

      for (let i = 0; i < expectedCount; i++) {
        const pearlColor = await pearls.nth(i).getAttribute('data-pearl-color');
        expect(pearlColor).not.toBeNull();
        expect(clamColors.has(pearlColor!)).toBe(true);
      }
    }
  });

  test('Verify clams and pearls are at least 64px and clams at least 96px', async ({ page }) => {
    const launcher = page.getByTestId('launch-snorkel-pearl-finder');
    await launcher.click();

    const clams = page.getByTestId('snorkel-clam');
    const clamCount = await clams.count();
    expect(clamCount).toBeGreaterThan(0);

    for (let i = 0; i < clamCount; i++) {
      const box = await clams.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(96);
        expect(box.height).toBeGreaterThanOrEqual(96);
      }
    }

    const pearls = page.getByTestId('snorkel-pearl');
    const pearlCount = await pearls.count();
    expect(pearlCount).toBeGreaterThan(0);

    for (let i = 0; i < pearlCount; i++) {
      const box = await pearls.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(64);
        expect(box.height).toBeGreaterThanOrEqual(64);
      }
    }
  });

  test('Verify a pearl can be dragged to a matching clam', async ({ page }) => {
    const launcher = page.getByTestId('launch-snorkel-pearl-finder');
    await launcher.click();

    const pearl = page.getByTestId('snorkel-pearl').first();
    const pearlColor = await pearl.getAttribute('data-pearl-color');
    expect(pearlColor).not.toBeNull();

    const matchingClam = page.locator(`[data-clam-color="${pearlColor}"]`);
    await expect(matchingClam).toBeVisible();

    await pearl.dragTo(matchingClam);

    // The pearl should be collected (removed from stage).
    await expect(page.getByTestId('snorkel-pearl')).toHaveCount(2);
  });

  test('Verify incorrect match does not collect pearl', async ({ page }) => {
    const launcher = page.getByTestId('launch-snorkel-pearl-finder');
    await launcher.click();

    const pearl = page.getByTestId('snorkel-pearl').first();
    const pearlColor = await pearl.getAttribute('data-pearl-color');
    expect(pearlColor).not.toBeNull();

    const wrongClam = page.getByTestId('snorkel-clam').filter({
      hasNot: page.locator(`..`),
    }).first();
    const clams = page.getByTestId('snorkel-clam');
    let targetClam = clams.first();
    for (let i = 0; i < await clams.count(); i++) {
      const color = await clams.nth(i).getAttribute('data-clam-color');
      if (color !== pearlColor) {
        targetClam = clams.nth(i);
        break;
      }
    }

    const initialCount = await page.getByTestId('snorkel-pearl').count();
    await pearl.dragTo(targetClam);

    // Pearl count should remain the same after an incorrect drop.
    await expect(page.getByTestId('snorkel-pearl')).toHaveCount(initialCount);
  });
});
