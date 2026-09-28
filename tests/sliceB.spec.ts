import { test, expect, Page } from '@playwright/test';

async function solveParentGate(page: Page) {
  const gateTextElement = page.locator('form div.text-4xl');
  await expect(gateTextElement).toBeVisible();
  const text = await gateTextElement.innerText();
  const cleanExpr = text.replace(/×/g, '*').replace(/=/g, '').replace(/\?/g, '').trim();
  const answer = Function(`"use strict"; return (${cleanExpr})`)();
  await page.locator('form input[type="number"]').fill(answer.toString());
  await page.locator('form button[type="submit"]').click();
}

async function openSettings(page: Page) {
  await page.getByRole('button', { name: /Parents|Eltern|ほごしゃ|부모님/ }).click();
  await solveParentGate(page);
}

test.describe('Slice B parent controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('little age band hides big-kid games and keeps doodle', async ({ page }) => {
    await page.getByTestId('open-session').click();
    await solveParentGate(page);
    await page.getByTestId('age-band-little').click();
    await page.getByTestId('session-start').click();

    await expect(page.getByTestId('launch-doodle')).toBeVisible();
    await expect(page.getByTestId('launch-shiritori')).toHaveCount(0);
    await expect(page.getByTestId('launch-dispatch')).toHaveCount(0);
  });

  test('home age switch toggles between preschool and school games and persists', async ({ page }) => {
    await expect(page.getByTestId('age-mode-little')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('launch-doodle')).toBeVisible();
    await expect(page.getByTestId('launch-shiritori')).toHaveCount(0);

    await page.getByTestId('age-mode-big').click();
    await expect(page.getByTestId('age-mode-big')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('launch-shiritori')).toBeVisible();
    await expect(page.getByTestId('launch-doodle')).toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('launch-shiritori')).toBeVisible();

    await page.getByTestId('age-mode-little').click();
    await expect(page.getByTestId('launch-doodle')).toBeVisible();
  });

  test('the age switch sets the starting level and locks the one that does not fit', async ({ page }) => {
    await page.getByTestId('age-mode-little').click();
    await page.getByTestId('launch-math').click();
    await expect(page.getByTestId('difficulty-easy')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('difficulty-medium')).toBeEnabled();
    await expect(page.getByTestId('difficulty-hard')).toBeDisabled();

    await page.getByTestId('home-button').click();
    await page.getByTestId('age-mode-big').click();
    await page.getByTestId('launch-math').click();
    await expect(page.getByTestId('difficulty-medium')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('difficulty-easy')).toBeDisabled();
    await expect(page.getByTestId('difficulty-hard')).toBeEnabled();
  });

  test('parent can add a custom coupon', async ({ page }) => {
    await openSettings(page);
    await page.getByTestId('custom-coupon-emoji').fill('🛝');
    await page.getByTestId('custom-coupon-name').fill('Playground time');
    await page.getByTestId('custom-coupon-add').click();
    await expect(page.getByText('Playground time', { exact: true })).toBeVisible();
  });
});
