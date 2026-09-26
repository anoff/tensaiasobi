import { test, expect, Page } from '@playwright/test';

// Helper to solve the ParentGate problem
async function allowOnlyMath(page: Page) {
  const toggles = page.locator('[data-testid^="challenge-game-"]');
  const count = await toggles.count();
  expect(count).toBeGreaterThan(1);
  for (let i = 0; i < count; i++) {
    const btn = toggles.nth(i);
    const testid = await btn.getAttribute('data-testid');
    const className = (await btn.getAttribute('class')) ?? '';
    const enabled = className.includes('bg-purple-100');
    const isMath = testid === 'challenge-game-math';
    if (isMath && !enabled) await btn.click();
    if (!isMath && enabled) await btn.click();
  }
}

async function solveParentGate(page: Page) {
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
  
  const input = page.locator('form input[type="number"]');
  await input.fill(answer.toString());
  
  await page.locator('form button[type="submit"]').click();
}

test.describe('tensaiasobi Challenge Mode E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });
    await page.goto('/');
    // Unregister service worker and clear localStorage to bypass PWA caching
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
      localStorage.clear();
    });
    await page.reload();
  });

  test('Verify Parent Settings includes Challenge Mode and configuring it limits launchers', async ({ page }) => {
    // 1. Open Parents Settings Dashboard
    await page.getByTestId('open-session').click();
    await solveParentGate(page);

    await expect(page.locator('h2', { hasText: 'Hand over' })).toBeVisible();
    await page.getByTestId('session-mode-learn').click();
    await expect(page.getByText('Learning first', { exact: true })).toBeVisible();

    // Let's configure the challenge: target 5 stars, only Math allowed
    // Select 5 Stars from the target dropdown
    const targetSelect = page.getByTestId('challenge-target-stars');
    await expect(targetSelect).toBeVisible();
    await targetSelect.selectOption('5'); // 5 Stars

    await allowOnlyMath(page);

    // Start Challenge Mode
    const startButton = page.getByTestId('session-start');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Verify we are back in main menu and challenge countdown is visible
    const countdownBadge = page.getByTestId('challenge-countdown-badge');
    await expect(countdownBadge).toBeVisible();
    const remaining = page.getByTestId('challenge-stars-remaining');
    await expect(remaining).toHaveText('5');

    const mathLauncher = page.getByTestId('launch-math');
    await expect(mathLauncher).toBeVisible();
    await expect(page.locator('[data-testid^="launch-"]')).toHaveCount(1);
  });

  test('Verify Math Game no-retry and completion flow in challenge mode', async ({ page }) => {
    // 1. Activate challenge mode via Parent settings (5 Stars target, Math only)
    await page.getByTestId('open-session').click();
    await solveParentGate(page);
    await page.getByTestId('session-mode-learn').click();

    const targetSelect = page.getByTestId('challenge-target-stars');
    await targetSelect.selectOption('5'); // 5 Stars target

    // Select the "Ice Cream" coupon as the challenge reward
    const couponSelect = page.getByTestId('challenge-coupon-select');
    await couponSelect.selectOption('ice_cream');

    await allowOnlyMath(page);

    await page.getByTestId('session-start').click();

    // 2. Play Math Game
    const mathLauncher = page.getByTestId('launch-math');
    await mathLauncher.click();

    // Solve an equation: get the equation text, calculate correct and wrong answers
    const equationElement = page.getByTestId('math-equation');
    await expect(equationElement).toBeVisible();
    const text = await equationElement.innerText();
    const match = text.match(/(\d+)\s*\+\s*(\d+)/);
    expect(match).not.toBeNull();
    if (!match) return;

    const num1 = parseInt(match[1], 10);
    const num2 = parseInt(match[2], 10);
    const correctAnswer = num1 + num2;

    // Get answer bubbles
    const answerButtons = page.getByTestId('math-answer-option');
    const firstValStr = await answerButtons.nth(0).innerText();

    const firstVal = parseInt(firstValStr, 10);

    const wrongButtonIdx = firstVal === correctAnswer ? 1 : 0;

    // Test WRONG answer behavior (should reset streak and load NEW question, no retry allowed)
    const originalEquation = text;
    await answerButtons.nth(wrongButtonIdx).click();

    // Verify it is disabled immediately
    await expect(answerButtons.nth(wrongButtonIdx)).toBeDisabled();

    // Wait for 2s (which handles the 1.5s timeout)
    await page.waitForTimeout(2000);

    // Verify a new equation is generated (or the wrong selections are cleared and it's a new equation)
    const newEquationText = await equationElement.innerText();
    expect(newEquationText).not.toBe(originalEquation);

    // Now answer correctly to earn stars and complete target
    // We need 5 stars. Easy math gives 2 stars * 1 level multiplier = 2 stars per correct answer.
    // So we need 3 correct answers to reach >= 5 stars (which gives 6 stars).
    for (let round = 0; round < 3; round++) {
      const currentEqText = await equationElement.innerText();
      const currentMatch = currentEqText.match(/(\d+)\s*\+\s*(\d+)/);
      if (!currentMatch) throw new Error("Could not parse current equation");
      
      const c1 = parseInt(currentMatch[1], 10);
      const c2 = parseInt(currentMatch[2], 10);
      const cAnswer = c1 + c2;

      // Locate correct bubble
      const optCount = await answerButtons.count();
      for (let i = 0; i < optCount; i++) {
        const valStr = await answerButtons.nth(i).innerText();
        const val = parseInt(valStr, 10);
        if (val === cAnswer) {
          await answerButtons.nth(i).click();
          break;
        }
      }

      // Wait for next question transition
      await page.waitForTimeout(2000);
    }

    // Verify the challenge completion modal is shown
    const completionModal = page.getByTestId('challenge-completion-modal');
    await expect(completionModal).toBeVisible();

    // Verify the selected coupon reward is shown on the completion modal
    const couponReward = page.getByTestId('challenge-coupon-reward');
    await expect(couponReward).toBeVisible();
    await expect(couponReward).toContainText('Ice Cream');

    const claimButton = page.getByTestId('claim-challenge-reward-button');
    await expect(claimButton).toBeVisible();
    await claimButton.click();

    await expect(completionModal).toBeHidden();
    await expect(page.getByTestId('challenge-countdown-badge')).toBeHidden();
    await expect(page.getByTestId('challenge-play-unlocked-badge')).toBeVisible();

    await expect(page.getByTestId('launch-odd')).toBeVisible();
    await expect(page.getByTestId('launch-doodle')).toBeVisible();
    await expect(page.getByTestId('launch-town')).toBeVisible();

    // Verify the coupon was awarded and persisted in the Coupon Shop
    const couponsLauncher = page.getByTestId('launch-coupons');
    await couponsLauncher.click();
    const earnedCoupon = page.getByTestId('earned-coupon-ice_cream');
    await expect(earnedCoupon).toBeVisible();
  });
});
