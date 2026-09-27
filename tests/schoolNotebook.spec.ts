import { test, expect } from '@playwright/test';

test.describe('School games use the notebook answer sheet', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Math shows full-width answer lines instead of bubbles, and no "tap the bubble" line', async ({ page }) => {
    await page.getByTestId('launch-math').click();
    await expect(page.getByTestId('math-equation')).toBeVisible();
    await expect(page.getByText('Tap the correct bubble!')).toHaveCount(0);

    const options = page.getByTestId('math-answer-option');
    await expect(options).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const box = await options.nth(i).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(64);
      expect(box!.width).toBeGreaterThan(250);
    }
  });

  test('Math: a wrong line shakes and clears so the child can try again', async ({ page }) => {
    await page.getByTestId('launch-math').click();
    const text = await page.getByTestId('math-equation').innerText();
    const match = text.match(/(\d+)\s*\+\s*(\d+)/)!;
    const answer = Number(match[1]) + Number(match[2]);

    const options = page.getByTestId('math-answer-option');
    const values = await options.evaluateAll((els) => els.map((el) => parseInt(el.textContent ?? '', 10)));
    const wrongIdx = values.findIndex((v) => v !== answer);

    await options.nth(wrongIdx).click();
    await expect(options.nth(wrongIdx)).toHaveClass(/animate-shake/);
    await expect(options.nth(wrongIdx)).toBeEnabled({ timeout: 2000 });
    await expect(options.nth(wrongIdx)).not.toHaveClass(/animate-shake/);
    expect(await page.getByTestId('math-equation').innerText()).toBe(text);
  });

  test('Math hard: a wrong line brings a new sum instead of a retry', async ({ page }) => {
    await page.getByTestId('launch-math').click();
    await page.getByTestId('difficulty-hard').click();
    const equation = page.getByTestId('math-equation');
    const text = await equation.innerText();
    const match = text.match(/(\d+)\s*([+−])\s*(\d+)/)!;
    const answer = match[2] === '+' ? Number(match[1]) + Number(match[3]) : Number(match[1]) - Number(match[3]);

    const options = page.getByTestId('math-answer-option');
    const values = await options.evaluateAll((els) => els.map((el) => parseInt(el.textContent ?? '', 10)));
    await options.nth(values.findIndex((v) => v !== answer)).click();
    await expect(equation).not.toHaveText(text, { timeout: 3000 });
  });

  test('First Sound offers letters as notebook lines', async ({ page }) => {
    await page.getByTestId('launch-anlaut').click();
    const options = page.getByTestId('anlaut-option');
    await expect(options).toHaveCount(3);
    const box = await options.first().boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(64);
  });
});
