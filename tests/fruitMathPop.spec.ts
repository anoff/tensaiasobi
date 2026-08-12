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
});
