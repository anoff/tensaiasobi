import { test, expect } from '@playwright/test';

test.describe('Math Pop (merged with Fruit Math Pop)', () => {
  test('preschool easy draws the sum as fruit only, with dot tallies on the answers', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    await expect(page.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('math-pictures')).toBeVisible();
    await expect(page.getByTestId('notebook-tally')).toHaveCount(3);
    const equation = page.getByTestId('math-equation');
    // No numerals for the operands, only fruit and the "?" slot.
    expect(await equation.innerText()).not.toMatch(/\d/);
    expect(Number(await equation.getAttribute('data-answer'))).toBeLessThanOrEqual(8);
  });

  test('preschool medium shows fruit and numbers together and keeps the sum after a miss', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    await page.getByTestId('difficulty-medium').click();
    await expect(page.getByTestId('math-pictures')).toBeVisible();

    const equation = page.getByTestId('math-equation');
    const text = await equation.innerText();
    expect(text).toMatch(/\d+\s*\+\s*\d+/);
    const answer = Number(await equation.getAttribute('data-answer'));
    expect(answer).toBeLessThanOrEqual(10);
    const options = page.getByTestId('math-answer-option');
    const values = await options.evaluateAll((els) => els.map((el) => parseInt(el.textContent ?? '', 10)));
    await options.nth(values.findIndex((v) => v !== answer)).click();

    await expect(page.getByTestId('math-pictures')).toBeVisible();
    expect(await equation.innerText()).toBe(text);
  });

  test('switching level right after a correct answer keeps the new level\'s sum', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    const equation = page.getByTestId('math-equation');
    const answer = await equation.getAttribute('data-answer');
    await page.locator('[data-testid="math-answer-option"]', { hasText: new RegExp(`^${answer}`) }).first().click();

    // Before the 1.8 s "next question" pause runs out, pick medium.
    await page.getByTestId('difficulty-medium').click();
    const mediumSum = await equation.innerText();
    await page.waitForTimeout(2500);
    expect(await equation.innerText()).toBe(mediumSum);
  });

  test('both ages start Math Pop on 1 star with all three levels open', async ({ page }) => {
    for (const band of ['little', 'big'] as const) {
      await page.goto('/');
      await page.getByTestId(`age-mode-${band}`).click();
      await page.getByTestId('launch-math').click();
      await expect(page.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'true');
      for (const level of ['easy', 'medium', 'hard']) await expect(page.getByTestId(`difficulty-${level}`)).toBeEnabled();
    }
  });

  test('there is no separate Fruit Math Pop tile any more', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('launch-fruit-math-pop')).toHaveCount(0);
  });
});
