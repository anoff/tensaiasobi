import { test, expect } from '@playwright/test';

test.describe('Fruit Math Pop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-fruit-math-pop').click();
    await expect(page.getByTestId('fruit-math-pop-tray')).toBeVisible();
  });

  test('shows two choices for easy and three for medium and hard', async ({ page }) => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      await page.getByTestId(`difficulty-${difficulty}`).click();
      await expect(page.getByTestId('fruit-math-pop-answer').first()).toBeVisible();
      await expect(page.getByTestId('fruit-math-pop-answer')).toHaveCount(difficulty === 'easy' ? 2 : 3);
    }
  });

  test('includes the correct quantity and only uses valid quantities', async ({ page }) => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      await page.getByTestId(`difficulty-${difficulty}`).click();
      await expect.poll(async () => page.getByTestId('fruit-math-pop-answer').count()).toBe(difficulty === 'easy' ? 2 : 3);
      const tray = page.getByTestId('fruit-math-pop-tray');
      const result = Number(await tray.getAttribute('data-result'));
      const quantities = await page.getByTestId('fruit-math-pop-answer').evaluateAll((answers) =>
        answers.map((answer) => Number(answer.getAttribute('data-quantity'))),
      );
      expect(quantities).toContain(result);
      expect(new Set(quantities).size).toBe(quantities.length);
      expect(quantities.every((quantity) => quantity >= 1 && quantity <= (difficulty === 'hard' ? 10 : 5))).toBe(true);
    }
  });

  test('answers are numerals and the problem fruit never loops an animation', async ({ page }) => {
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      await page.getByTestId(`difficulty-${difficulty}`).click();
      await expect(page.getByTestId('fruit-math-pop-answer').first()).toBeVisible();
      const answers = await page.getByTestId('fruit-math-pop-answer').evaluateAll((els) =>
        els.map((el) => ({ text: (el.textContent ?? '').trim(), quantity: el.getAttribute('data-quantity') })),
      );
      for (const answer of answers) expect(answer.text).toBe(answer.quantity);

      const looping = await page.getByTestId('fruit-math-pop-tray').evaluate((tray) =>
        [tray, ...tray.querySelectorAll('*')].filter((el) => /animate-(bounce|pulse|shake)/.test(el.getAttribute('class') ?? '')).length,
      );
      expect(looping).toBe(0);
    }
  });

  test('hard covers the fruit before the answers appear', async ({ page }) => {
    await page.getByTestId('difficulty-hard').click();
    await expect(page.getByTestId('fruit-math-pop-cover')).toBeVisible();
    await expect(page.getByTestId('fruit-math-pop-answer')).toHaveCount(0);
    await expect(page.getByTestId('fruit-math-pop-answer').first()).toBeVisible();
    await expect(page.getByTestId('fruit-math-pop-cover')).toBeVisible();
  });
});
