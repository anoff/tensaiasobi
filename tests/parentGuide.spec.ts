import { test, expect, type Page } from '@playwright/test';

// #30 / #31: the Parents' guide opens from a quiet footer row on home, with no parent gate.

async function solveParentGate(page: Page) {
  const gateTextElement = page.locator('form div.text-4xl');
  await expect(gateTextElement).toBeVisible();
  const expr = (await gateTextElement.innerText()).replace(/[×x]/g, '*').replace(/[=?]/g, '').trim();
  const answer = Function(`"use strict"; return (${expr})`)();
  await page.locator('form input[type="number"]').fill(String(answer));
  await page.locator('form button[type="submit"]').click();
}

async function openGuide(page: Page) {
  await page.goto('/');
  const row = page.getByTestId('home-guide');
  await row.scrollIntoViewIfNeeded();
  await expect(row).toHaveText('📖 Parents’ guide');
  await row.click();
  await expect(page.getByTestId('parent-guide')).toBeVisible();
  await expect(page.locator('form div.text-4xl')).toHaveCount(0); // no parent gate
}

const hashOf = (page: Page) => new URL(page.url()).hash;

test.describe("Parents' guide", () => {
  test('opens from the home footer without a gate and lists all games under the four shelves', async ({ page }) => {
    await openGuide(page);
    await expect(page.getByRole('heading', { name: 'Parents’ guide 📖' })).toBeVisible();
    await expect(page.getByTestId('home-button')).toHaveCount(0);

    for (const shelf of ['numbers', 'language', 'logic', 'play']) {
      await expect(page.getByTestId(`guide-shelf-${shelf}`)).toBeVisible();
    }
    await expect(page.locator('[data-testid^="guide-game-"]')).toHaveCount(26);

    const math = page.getByTestId('guide-game-math');
    await expect(math).toContainText('Math Pop');
    await expect(math).toContainText('Pop the bubble with the right answer.');
    await expect(math).toContainText('Learns:');
    await expect(math.getByTestId('guide-age-little')).toHaveText('🧸 3–5');
    await expect(math.getByTestId('guide-age-big')).toHaveText('🎒 6–8');
    // Age-only games show just their own chip.
    await expect(page.getByTestId('guide-game-numberTrain').getByTestId('guide-age-big')).toHaveCount(0);

    await expect.poll(() => hashOf(page)).toBe('#/guide');
    await page.getByTestId('guide-back').click();
    await expect(page.getByTestId('home-guide')).toBeVisible();
    await expect.poll(() => hashOf(page)).toBe('');
  });

  test('#/guide deep-links to the guide; Back and reload return to home', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('home-guide')).toBeAttached(); // app mounted, so the hash change is a popstate
    await page.goto('/#/guide');
    await expect(page.getByTestId('parent-guide')).toBeVisible();
    await expect(page.locator('form div.text-4xl')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('parent-guide')).toBeVisible();

    await page.getByTestId('guide-back').click();
    await expect(page.getByTestId('home-guide')).toBeVisible();
    await page.reload();
    await expect(page.getByTestId('home-guide')).toBeVisible();
    await expect(page.getByTestId('parent-guide')).toHaveCount(0);

    // Browser Back from a guide opened on home lands on home.
    await page.getByTestId('home-guide').click();
    await expect(page.getByTestId('parent-guide')).toBeVisible();
    await page.goBack();
    await expect(page.getByTestId('home-guide')).toBeVisible();
    await expect(page.getByTestId('parent-guide')).toHaveCount(0);
  });

  test('Settings no longer has a guide row', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('open-settings').click();
    await solveParentGate(page);
    await expect(page.getByText('Sound Effects 🔊')).toBeVisible();
    await expect(page.getByTestId('open-guide')).toHaveCount(0);
    await expect(page.getByText('Parents’ guide')).toHaveCount(0);
  });

  test('lock tip defaults to iPhone on a desktop browser and switches to Android', async ({ page }) => {
    await openGuide(page);
    const steps = page.getByTestId('guide-lock-steps').locator('li');
    await expect(page.getByTestId('guide-lock-tab-ios')).toHaveAttribute('aria-selected', 'true');
    await expect(steps).toHaveCount(3);
    await expect(steps.first()).toContainText('Guided Access');

    await page.getByTestId('guide-lock-tab-android').click();
    await expect(page.getByTestId('guide-lock-tab-android')).toHaveAttribute('aria-selected', 'true');
    await expect(steps.first()).toContainText('App pinning');
    await expect(page.getByTestId('guide-lock')).toContainText('Search Settings for “pin”');
  });

  test('copy link puts the public game link on the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openGuide(page);
    const copy = page.getByTestId('guide-copy-maze');
    await expect(copy).toHaveAccessibleName('Copy link');
    await copy.click();
    await expect(copy).toContainText('✓');
    const clipboardText = () =>
      page.evaluate(() => (navigator as unknown as { clipboard: { readText: () => Promise<string> } }).clipboard.readText());
    expect(await clipboardText()).toBe('https://asobi.anoff.io/#/maze');
    await expect(copy).toContainText('🔗', { timeout: 3000 });
  });

  test('is translated (German)', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('lang-dropdown-trigger').click();
    await page.getByTestId('lang-select-de').click();
    await expect(page.getByTestId('home-guide')).toHaveText('📖 Elternratgeber');
    await page.getByTestId('home-guide').click();
    await expect(page.getByRole('heading', { name: 'Elternratgeber 📖' })).toBeVisible();
    await expect(page.getByTestId('guide-game-maze')).toContainText('Übt:');
    await expect(page.getByTestId('guide-back')).toHaveText('← Startseite');
  });
});
