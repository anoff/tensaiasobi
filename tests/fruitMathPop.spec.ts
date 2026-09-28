import { test, expect } from '@playwright/test';
import { ALL_LEVELS, openGame } from './ageLevels';

test.describe('Fruit Math Pop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-fruit-math-pop').click();
    await expect(page.getByTestId('fruit-math-pop-tray')).toBeVisible();
  });

  test('shows two choices for easy and three for medium and hard', async ({ page }) => {
    for (const [band, difficulty] of ALL_LEVELS) {
      await openGame(page, 'launch-fruit-math-pop', band, difficulty);
      await expect(page.getByTestId('fruit-math-pop-answer').first()).toBeVisible();
      await expect(page.getByTestId('fruit-math-pop-answer')).toHaveCount(difficulty === 'easy' ? 2 : 3);
    }
  });

  test('includes the correct quantity and only uses valid quantities', async ({ page }) => {
    for (const [band, difficulty] of ALL_LEVELS) {
      await openGame(page, 'launch-fruit-math-pop', band, difficulty);
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
    for (const [band, difficulty] of ALL_LEVELS) {
      await openGame(page, 'launch-fruit-math-pop', band, difficulty);
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

  test('dot tallies: always on easy, hidden on medium until a miss', async ({ page }) => {
    const answers = page.getByTestId('fruit-math-pop-answer');
    await expect(answers.first()).toBeVisible();
    await expect(page.getByTestId('notebook-tally')).toHaveCount(2);

    await page.getByTestId('difficulty-medium').click();
    await expect(answers.first()).toBeVisible();
    await expect(page.getByTestId('notebook-tally')).toHaveCount(0);

    const result = await page.getByTestId('fruit-math-pop-tray').getAttribute('data-result');
    await page.locator(`[data-testid="fruit-math-pop-answer"]:not([data-quantity="${result}"])`).first().click();
    await expect(page.getByTestId('notebook-tally')).toHaveCount(3);
    // Medium stays forgiving: same sum, try again.
    await expect(page.getByTestId('fruit-math-pop-tray')).toHaveAttribute('data-result', result!);
  });

  test('hard: a miss brings a new sum instead of a retry', async ({ page }) => {
    await openGame(page, 'launch-fruit-math-pop', 'big', 'hard');
    const tray = page.getByTestId('fruit-math-pop-tray');
    await expect(page.getByTestId('fruit-math-pop-answer').first()).toBeVisible();
    await expect(page.getByTestId('notebook-tally')).toHaveCount(0);

    const round = await tray.getAttribute('data-round');
    const result = await tray.getAttribute('data-result');
    await page.locator(`[data-testid="fruit-math-pop-answer"]:not([data-quantity="${result}"])`).first().click();
    await expect(tray).not.toHaveAttribute('data-round', round!);
    await expect(page.getByTestId('notebook-tally')).toHaveCount(0);
  });
});
