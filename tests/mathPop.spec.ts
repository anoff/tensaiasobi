import { test, expect } from '@playwright/test';

test.describe('Math Pop (merged with Fruit Math Pop)', () => {
  test('preschool easy shows fruit pictures and dot tallies', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    await expect(page.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('math-pictures')).toBeVisible();
    await expect(page.getByTestId('notebook-tally')).toHaveCount(3);
    const text = await page.getByTestId('math-equation').innerText();
    const [a, b] = (text.match(/\d+/g) ?? []).map(Number);
    expect(a + b).toBeLessThanOrEqual(5);
  });

  test('medium hides the pictures until a miss, then keeps the same sum', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    await page.getByTestId('difficulty-medium').click();
    await expect(page.getByTestId('math-pictures')).toHaveCount(0);

    const equation = page.getByTestId('math-equation');
    const text = await equation.innerText();
    const match = text.match(/(\d+)\s*([+−])\s*(\d+)/)!;
    const answer = match[2] === '+' ? Number(match[1]) + Number(match[3]) : Number(match[1]) - Number(match[3]);
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
    const [a, b] = ((await equation.innerText()).match(/\d+/g) ?? []).map(Number);
    await page.locator('[data-testid="math-answer-option"]', { hasText: new RegExp(`^${a + b}`) }).first().click();

    // Before the 1.8 s "next question" pause runs out, pick medium.
    await page.getByTestId('difficulty-medium').click();
    const mediumSum = await equation.innerText();
    await page.waitForTimeout(2500);
    expect(await equation.innerText()).toBe(mediumSum);
  });

  test('there is no separate Fruit Math Pop tile any more', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('launch-fruit-math-pop')).toHaveCount(0);
  });
});
