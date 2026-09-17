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

test.describe('Slice A catalog, motion, a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('menu title does not idle-pulse and html lang follows the language switcher', async ({ page }) => {
    const title = page.locator('h1', { hasText: 'tensaiasobi' });
    await expect(title).toBeVisible();
    await expect(title).not.toHaveClass(/animate-pulse/);
    await expect(page.locator('html')).toHaveAttribute('lang', /^(en|de|ja|fr|ko)$/);

    const trigger = page.getByTestId('lang-dropdown-trigger');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
    const currentLang = await page.locator('html').getAttribute('lang');
    const targetLang = currentLang === 'de' ? 'ja' : 'de';
    await trigger.click();
    await page.getByTestId(`lang-select-${targetLang}`).click();
    await expect(page.locator('html')).toHaveAttribute('lang', targetLang);
  });

  test('parent gate is a named dialog that closes on Escape', async ({ page }) => {
    await page.getByRole('button', { name: /Parents|Eltern|ほごしゃ|부모님/ }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('challenge setup lists the full catalog including newer games', async ({ page }) => {
    await page.getByRole('button', { name: /Parents|Eltern|ほごしゃ|부모님/ }).click();
    await solveParentGate(page);

    await expect(page.getByTestId('challenge-game-math')).toBeVisible();
    await expect(page.getByTestId('challenge-game-fruitMathPop')).toBeVisible();
    await expect(page.getByTestId('challenge-game-shadowFlashlight')).toBeVisible();
    await expect(page.getByTestId('challenge-game-fairSharePicnic')).toBeVisible();
    await expect(page.getByTestId('challenge-game-dispatch')).toBeVisible();
    await expect(page.getByTestId('challenge-game-snorkelPearlFinder')).toBeVisible();

    const toggles = page.locator('[data-testid^="challenge-game-"]');
    await expect(toggles).toHaveCount(19);
  });
});
