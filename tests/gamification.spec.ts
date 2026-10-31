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

  test('Verify Sticker Book and Coupon Shop are accessible and have the core components', async ({ page }) => {
    // 1. Check the Sticker Book launcher (My Town is gone)
    await expect(page.getByTestId('launch-town')).toHaveCount(0);
    const bookLauncher = page.getByTestId('launch-sticker-book');
    await expect(bookLauncher).toBeVisible();
    await bookLauncher.click();

    // Verify the book shows one page per shelf with 12 sticker slots each
    await expect(page.getByTestId('sticker-book')).toBeVisible();
    for (const shelf of ['numbers', 'language', 'logic', 'play']) {
      await expect(page.getByTestId(`book-shelf-${shelf}`)).toBeVisible();
    }
    await expect(page.getByTestId('book-stickers-numbers').getByTestId('sticker-slot-empty')).toHaveCount(12);

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
    const parentsButton = page.getByTestId('open-settings');
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

  test('Verify "Earn it!" on a not-yet-earned coupon opens the Parent Gate and pre-fills Challenge Mode setup', async ({ page }) => {
    // 1. Open Coupon Shop - all default coupons start un-earned
    const couponsLauncher = page.getByTestId('launch-coupons');
    await couponsLauncher.click();

    const earnButton = page.getByTestId('earn-coupon-movie_night');
    await expect(earnButton).toBeVisible();
    await expect(earnButton).toContainText('Earn it!');
    await earnButton.click();

    // 2. Parent Gate must appear before anything else happens
    const gateTitle = page.locator('h2', { hasText: 'Parents Only' });
    await expect(gateTitle).toBeVisible();

    // Cancelling should return to the Coupon Shop without navigating away
    await page.locator('form button', { hasText: 'Cancel' }).click();
    await expect(gateTitle).toBeHidden();
    await expect(earnButton).toBeVisible();

    // 3. Click again and solve the gate this time
    await earnButton.click();
    await expect(gateTitle).toBeVisible();
    await solveParentGate(page);

    await expect(page.locator('h2', { hasText: 'Hand over' })).toBeVisible();
    await expect(page.getByTestId('session-mode-learn')).toHaveClass(/bg-purple-100/);

    const couponSelect = page.getByTestId('challenge-coupon-select');
    await expect(couponSelect).toHaveValue('movie_night');
  });
});
