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

  test('Verify Town Builder and Coupon Shop are accessible and have the core components', async ({ page }) => {
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

    // 2. Check Coupon Shop Launcher
    const couponsLauncher = page.getByTestId('launch-coupons');
    await expect(couponsLauncher).toBeVisible();
    await couponsLauncher.click();

    // Verify Coupon Shop title and catalog
    const couponsTitle = page.locator('h2', { hasText: 'Coupon Collection' });
    await expect(couponsTitle).toBeVisible();
    const catalogHeading = page.locator('h3', { hasText: 'All Coupons' });
    await expect(catalogHeading).toBeVisible();
    const gummyBearCoupon = page.locator('p', { hasText: 'Gummy Bear' });
    await expect(gummyBearCoupon).toBeVisible();
  });

  test('Verify Parent Settings Dashboard displays Reward Coupons section', async ({ page }) => {
    // Open Settings (triggers Parent Gate)
    const parentsButton = page.locator('button', { hasText: 'Parents' });
    await expect(parentsButton).toBeVisible();
    await parentsButton.click();

    // Solve Parent Gate
    await solveParentGate(page);

    // Verify we are in settings dashboard
    const settingsTitle = page.locator('h2', { hasText: 'Settings' });
    await expect(settingsTitle).toBeVisible();

    // Verify Coupons Configuration Section is visible
    const couponsSection = page.locator('span', { hasText: 'Reward Coupons' });
    await expect(couponsSection).toBeVisible();

    // Verify default coupons (e.g. Gummy Bear, Ice Cream, etc.) are listed
    const gummyBearCoupon = page.locator('span', { hasText: 'Gummy Bear' });
    await expect(gummyBearCoupon).toBeVisible();
  });

  test('Verify redeeming an earned coupon from the Coupon Shop requires a tap-and-hold gesture plus double confirmation', async ({ page }) => {
    // 0. Seed an earned Gummy Bear coupon so there is something to redeem
    await page.addInitScript(() => {
      localStorage.setItem('gamification_coupons', JSON.stringify([
        { id: 'gummy_bear', enabled: true, earnedCount: 1 },
      ]));
    });
    await page.goto('/');

    // 1. Open Coupon Shop
    const couponsLauncher = page.getByTestId('launch-coupons');
    await expect(couponsLauncher).toBeVisible();
    await couponsLauncher.click();

    // Gummy Bear is shown as earned
    const earnedCoupon = page.getByTestId('earned-coupon-gummy_bear');
    await expect(earnedCoupon).toBeVisible();

    // No "Award" button exists anywhere - coupons can only be redeemed once earned
    await expect(page.locator('button', { hasText: 'Award' })).toHaveCount(0);

    const redeemButton = page.getByTestId('redeem-coupon-gummy_bear');
    await expect(redeemButton).toBeVisible();

    // A quick tap should NOT redeem the coupon - a sustained hold is required
    await redeemButton.click();
    const redeemDialog = page.getByTestId('redeem-confirm-dialog');
    await expect(redeemDialog).toBeHidden();

    // 2. Tap-and-hold "Redeem" on the Gummy Bear coupon (like clearing the town)
    await redeemButton.dispatchEvent('pointerdown');
    await page.waitForTimeout(900);
    await redeemButton.dispatchEvent('pointerup');

    // 3. First confirmation: a custom redeem dialog must appear before anything happens
    await expect(redeemDialog).toBeVisible();
    await expect(redeemDialog).toContainText('Gummy Bear');

    // Cancelling the confirmation dialog should NOT redeem the coupon
    await page.getByTestId('redeem-confirm-cancel').click();
    await expect(redeemDialog).toBeHidden();
    await expect(earnedCoupon).toBeVisible();

    // 4. Try again and confirm the dialog this time
    await redeemButton.dispatchEvent('pointerdown');
    await page.waitForTimeout(900);
    await redeemButton.dispatchEvent('pointerup');
    await expect(redeemDialog).toBeVisible();
    await page.getByTestId('redeem-confirm-submit').click();

    // 5. Second confirmation: Parent Gate math challenge must appear
    const gateTitle = page.locator('h2', { hasText: 'Parents Only' });
    await expect(gateTitle).toBeVisible();

    // Cancelling the parent gate should NOT redeem the coupon either
    await page.locator('form button', { hasText: 'Cancel' }).click();
    await expect(earnedCoupon).toBeVisible();

    // 6. Redeem again and confirm both steps this time
    await redeemButton.dispatchEvent('pointerdown');
    await page.waitForTimeout(900);
    await redeemButton.dispatchEvent('pointerup');
    await expect(redeemDialog).toBeVisible();
    await page.getByTestId('redeem-confirm-submit').click();
    await expect(gateTitle).toBeVisible();
    await solveParentGate(page);

    // 7. A celebration message is shown
    const celebration = page.getByTestId('coupon-celebration');
    await expect(celebration).toBeVisible();
    await expect(celebration).toContainText('Gummy Bear');
    await page.getByTestId('coupon-celebration-close').click();
    await expect(celebration).toBeHidden();

    // 8. The coupon has been used up
    const noneMessage = page.locator('p', { hasText: 'No coupons earned yet' });
    await expect(noneMessage).toBeVisible();
    await expect(earnedCoupon).toBeHidden();
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

  test('Verify tapping a placed Town item triggers "Petting Zoo" feedback instead of opening the catalog', async ({ page }) => {
    // 1. Inject stars to afford a purchase
    await page.addInitScript(() => {
      localStorage.setItem('gamification_stars', '100');
    });

    await page.goto('/');

    // 2. Open Town Builder
    const townLauncher = page.getByTestId('launch-town');
    await expect(townLauncher).toBeVisible();
    await townLauncher.click();

    // 3. Placement Confetti overlay canvas should be present on the grid
    const confettiCanvas = page.getByTestId('town-confetti-canvas');
    await expect(confettiCanvas).toBeVisible();

    // 4. Place a House (cost: 10) in the first cell
    const emptyCells = page.locator('button[aria-label="Tap an empty spot to build!"]');
    await expect(emptyCells.first()).toBeVisible();
    await emptyCells.first().click();

    const houseBtn = page.locator('button', { hasText: 'House' });
    await expect(houseBtn).toBeVisible();
    await houseBtn.click();

    // The catalog modal should close after placing the item
    await expect(houseBtn).not.toBeVisible();

    // 5. Tap the placed House again – it should NOT reopen the catalog modal,
    //    and it should instead play a swell "poke" animation.
    // Buildings have an infinite CSS "town-pulse" animation applied, so the
    // element's bounding box never settles; force the click to bypass
    // Playwright's actionability/stability check. Also wait out the one-shot
    // "town-place" placement animation window (500ms) so it doesn't take
    // rendering priority over the poke animation class.
    const placedHouse = page.locator('button[aria-label="🏠"]');
    await expect(placedHouse).toBeVisible();
    await page.waitForTimeout(600);
    await placedHouse.click({ force: true });

    // Catalog title should not appear since the tap was consumed as item feedback
    const catalogTitle = page.locator('h3', { hasText: 'Choose an item' });
    await expect(catalogTitle).not.toBeVisible();

    // The poke swell animation class should be applied to the emoji inside
    // the tapped cell (not the cell itself, which must stay in place)
    // (assert promptly since the class is removed after ~1s).
    await expect(placedHouse.locator('span')).toHaveClass(/town-poke-swell/, { timeout: 500 });
  });
});
