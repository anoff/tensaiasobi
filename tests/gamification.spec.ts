import { test, expect, Page } from '@playwright/test';

// Helper to solve the ParentGate problem
async function solveParentGate(page: Page) {
  // Wait for the ParentGate to be visible
  const gateTextElement = page.locator('form div.text-4xl');
  await expect(gateTextElement).toBeVisible();
  
  const text = await gateTextElement.innerText();
  const cleanExpr = text
    .replace(/×/g, '*')
    .replace(/x/g, '*')
    .replace(/=/g, '')
    .replace(/\?/g, '')
    .trim();

  const answer = Function(`"use strict"; return (${cleanExpr})`)();
  
  // Type the sum in the input
  const input = page.locator('form input[type="number"]');
  await input.fill(answer.toString());
  
  // Submit the form
  await page.locator('form button[type="submit"]').click();
}

test.describe('tensaiasobi Gamification Checks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Verify Town Builder and Star Shop are accessible and have the core components', async ({ page }) => {
    // 1. Check Town Builder Launcher
    const townLauncher = page.getByTestId('launch-town');
    await expect(townLauncher).toBeVisible();
    await townLauncher.click();

    // Verify Town Builder title and grid
    const townTitle = page.locator('h2', { hasText: 'My Town' });
    await expect(townTitle).toBeVisible();
    const gridCells = page.locator('button[aria-label="Tap an empty spot to build!"]');
    await expect(gridCells).toHaveCount(36); // 6x6 grid

    // Return to menu
    await page.getByTestId('home-button').click();

    // 2. Check Star Shop Launcher
    const shopLauncher = page.getByTestId('launch-shop');
    await expect(shopLauncher).toBeVisible();
    await shopLauncher.click();

    // Verify Star Shop title and tabs
    const shopTitle = page.locator('h2', { hasText: 'Star Shop' });
    await expect(shopTitle).toBeVisible();
    const itemsTab = page.locator('button', { hasText: 'Items' });
    const vouchersTab = page.locator('button', { hasText: 'Vouchers' });
    await expect(itemsTab).toBeVisible();
    await expect(vouchersTab).toBeVisible();
  });

  test('Verify Parent Settings Dashboard displays Reward Vouchers section', async ({ page }) => {
    // Open Settings (triggers Parent Gate)
    const parentsButton = page.locator('button', { hasText: 'Parents' });
    await expect(parentsButton).toBeVisible();
    await parentsButton.click();

    // Solve Parent Gate
    await solveParentGate(page);

    // Verify we are in settings dashboard
    const settingsTitle = page.locator('h2', { hasText: 'Settings' });
    await expect(settingsTitle).toBeVisible();

    // Verify Vouchers Configuration Section is visible
    const vouchersSection = page.locator('span', { hasText: 'Reward Vouchers' });
    await expect(vouchersSection).toBeVisible();

    // Verify default vouchers (e.g. Gummy Bear, Ice Cream, etc.) are listed
    const gummyBearVoucher = page.locator('span', { hasText: 'Gummy Bear' });
    await expect(gummyBearVoucher).toBeVisible();
  });
});
