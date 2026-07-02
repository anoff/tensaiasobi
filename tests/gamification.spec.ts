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
    // Unregister service worker to bypass PWA caching
    await page.evaluate(async () => {
      const nav = navigator as unknown as {
        serviceWorker?: {
          getRegistrations: () => Promise<Array<{ unregister: () => Promise<boolean> }>>;
        };
      };
      if (nav.serviceWorker) {
        const regs = await nav.serviceWorker.getRegistrations();
        for (const r of regs) {
          await r.unregister();
        }
      }
    });
    await page.reload();
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

  test('Verify Town Builder Delete All with reimbursement', async ({ page }) => {
    // 1. Injected 100 stars via localStorage to afford purchases
    await page.addInitScript(() => {
      localStorage.setItem('gamification_stars', '100');
    });

    await page.goto('/');

    // 2. Open Town Builder
    const townLauncher = page.getByTestId('launch-town');
    await expect(townLauncher).toBeVisible();
    await townLauncher.click();

    // 3. Place a House (cost: 10) in the first cell
    const cells = page.locator('button[aria-label="Tap an empty spot to build!"]');
    await expect(cells.first()).toBeVisible();
    await cells.first().click();

    const houseBtn = page.locator('button', { hasText: 'House' });
    await expect(houseBtn).toBeVisible();
    await houseBtn.click();

    // 4. Place a Tree (cost: 5) in the second cell
    await cells.first().click(); // Open catalog on second cell (index 0 of remaining empty cells)
    
    // Switch to nature category tab
    const natureTab = page.locator('button', { hasText: 'Nature' });
    await expect(natureTab).toBeVisible();
    await natureTab.click();

    const treeBtn = page.locator('button', { hasText: 'Tree' });
    await expect(treeBtn).toBeVisible();
    await treeBtn.click();

    // Verify Delete All button is visible and active
    const deleteAllBtn = page.getByTestId('town-delete-all');
    await expect(deleteAllBtn).toBeVisible();
    await expect(deleteAllBtn).toBeEnabled();

    // 5. Long hold Delete All button to trigger the confirmation prompt
    // We dispatch pointerdown, wait, then dispatch pointerup
    await deleteAllBtn.dispatchEvent('pointerdown');
    await page.waitForTimeout(1200);
    await deleteAllBtn.dispatchEvent('pointerup');

    // Verify Delete All Confirmation modal is shown
    const confirmModalTitle = page.locator('p', { hasText: 'Are you sure you want to delete all items and receive a refund?' });
    await expect(confirmModalTitle).toBeVisible();

    // Verify correct refund amount (5 for house + 2 for tree = 7 stars)
    const refundAmountText = page.locator('p', { hasText: 'Refund: ⭐ 7' });
    await expect(refundAmountText).toBeVisible();

    // 6. Confirm Delete All
    const confirmDeleteBtn = page.getByTestId('town-confirm-delete-all-btn');
    await expect(confirmDeleteBtn).toBeVisible();
    await confirmDeleteBtn.click();

    // Verify grid is empty again (36 empty cells)
    await expect(cells).toHaveCount(36);

    // Verify stars are reimbursed (85 left + 7 refund = 92 stars)
    // We return home to check the star counter badge
    await page.getByTestId('home-button').click();
    const starCountBadge = page.getByTestId('stars-total');
    await expect(starCountBadge).toHaveText('92');
  });
});
