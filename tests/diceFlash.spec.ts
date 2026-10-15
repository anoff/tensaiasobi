import { test, expect, type Page } from '@playwright/test';
import { openGame } from './ageLevels';

async function stars(page: Page) {
  return Number((await page.getByTestId('stars-total').innerText()).replace(/\D/g, '') || '0');
}

const stage = (page: Page) => page.getByTestId('dice-stage');

async function waitForAnswer(page: Page) {
  await expect(stage(page)).toHaveAttribute('data-phase', 'answer', { timeout: 10_000 });
}

async function tap(page: Page, value: number) {
  await page.locator(`[data-testid="dice-option"][data-value="${value}"]`).click();
}

/** A button that is not the right answer. */
async function wrongValue(page: Page) {
  const count = Number(await stage(page).getAttribute('data-count'));
  const values = await page.getByTestId('dice-option').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-value'))));
  return values.find((v) => v !== count)!;
}

test.describe('Dice Flash', () => {
  test('easy: dots flash, then three answer buttons appear, and a right tap pays 2 stars', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'little', 'easy');
    await expect(stage(page)).toHaveAttribute('data-flash-ms', '2000');
    // Covered, then flashing: no answer buttons while the dots can be seen.
    await expect(page.getByTestId('dice-option')).toHaveCount(0);
    await expect(stage(page)).toHaveAttribute('data-phase', 'flash');
    await expect(page.getByTestId('dice-dot')).toHaveCount(Number(await stage(page).getAttribute('data-count')));
    await expect(page.getByTestId('dice-option')).toHaveCount(0);

    await waitForAnswer(page);
    await expect(page.getByTestId('dice-dot')).toHaveCount(0);
    await expect(page.getByTestId('dice-option')).toHaveCount(3);
    const options = await page.getByTestId('dice-option').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-value'))));
    const count = Number(await stage(page).getAttribute('data-count'));
    expect(options.filter((o) => o === count)).toHaveLength(1);
    // Targets are at least 96px.
    for (const box of await page.getByTestId('dice-option').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(96);
    }

    const before = await stars(page);
    await tap(page, count);
    await expect(stage(page)).toHaveAttribute('data-phase', 'right');
    await expect(page.getByTestId('dice-dot')).toHaveCount(count);
    await expect.poll(() => stars(page)).toBe(before + 2);
  });

  test('easy: a miss shows the same dots for 3 s, then asks the same flash again', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'little', 'easy');
    await waitForAnswer(page);
    const count = await stage(page).getAttribute('data-count');
    const layout = await stage(page).getAttribute('data-layout');
    const before = await stars(page);

    await tap(page, await wrongValue(page));
    await expect(stage(page)).toHaveAttribute('data-phase', 'reveal');
    await expect(page.getByTestId('dice-dot')).toHaveCount(Number(count));
    await expect(page.getByTestId('dice-option')).toHaveCount(0);
    // Still showing the dots two seconds later.
    await page.waitForTimeout(2000);
    await expect(stage(page)).toHaveAttribute('data-phase', 'reveal');

    await waitForAnswer(page);
    await expect(stage(page)).toHaveAttribute('data-count', count!);
    await expect(stage(page)).toHaveAttribute('data-layout', layout!);
    expect(await stars(page)).toBe(before);
  });

  test('medium: four answers and standard die faces', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'big', 'medium');
    await expect(stage(page)).toHaveAttribute('data-flash-ms', '1500');
    await waitForAnswer(page);
    await expect(page.getByTestId('dice-option')).toHaveCount(4);
    const count = Number(await stage(page).getAttribute('data-count'));
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(6);
  });

  test('hard: a miss gives a fresh flash with a different layout and no stars', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'big', 'hard');
    await expect(stage(page)).toHaveAttribute('data-flash-ms', '1000');
    await waitForAnswer(page);
    await expect(page.getByTestId('dice-option')).toHaveCount(4);
    const layout = await stage(page).getAttribute('data-layout');
    const before = await stars(page);

    await tap(page, await wrongValue(page));
    await expect(stage(page)).toHaveAttribute('data-phase', 'reveal');
    await waitForAnswer(page);
    expect(await stage(page).getAttribute('data-layout')).not.toBe(layout);
    expect(await stars(page)).toBe(before);
  });

  test('five right answers finish a set and pay 5 x 2 stars on easy', async ({ page }) => {
    test.setTimeout(60_000);
    await openGame(page, 'launch-dice-flash', 'little', 'easy');
    const before = await stars(page);
    for (let i = 0; i < 5; i++) {
      await waitForAnswer(page);
      await tap(page, Number(await stage(page).getAttribute('data-count')));
    }
    await expect(page.getByTestId('dice-victory')).toBeVisible({ timeout: 10_000 });
    await expect(stage(page)).toHaveAttribute('data-progress', '5');
    await expect.poll(() => stars(page)).toBe(before + 10);
    // A new set starts on its own.
    await expect(stage(page)).toHaveAttribute('data-progress', '0', { timeout: 10_000 });
  });
});
