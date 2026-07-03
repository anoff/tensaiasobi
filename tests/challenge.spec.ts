import { test, expect, Page } from '@playwright/test';

// Helper to solve the ParentGate problem
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
    const parentsButton = page.locator('button', { hasText: 'Parents' });
    await expect(parentsButton).toBeVisible();
    await parentsButton.click();

    // Solve Parent Gate
    await solveParentGate(page);

    // Verify Settings Dashboard is shown
    const settingsTitle = page.locator('h2', { hasText: 'Settings' });
    await expect(settingsTitle).toBeVisible();

    // Verify Challenge Mode Section header is visible
    const challengeHeader = page.locator('span', { hasText: 'Challenge Mode' });
    await expect(challengeHeader).toBeVisible();

    // Let's configure the challenge: target 5 stars, only Math allowed
    // Select 5 Stars from the target dropdown
    const targetSelect = page.locator('select');
    await expect(targetSelect).toBeVisible();
    await targetSelect.selectOption('5'); // 5 Stars

    // Deselect all games except Math Pop
    // The default enabled buttons will have class 'bg-purple-100'
    const gamesToDisable = [
      '🧐 Odd One',
      '🎨 Doodle',
      '🐯 Match',
      '🗺️ Mazes',
      '⭐ Trace',
      '⚡ Emoji Match',
      '🔤 First Sound',
      '🔗 Word Chain'
    ];

    for (const name of gamesToDisable) {
      const btn = page.getByRole('button', { name, exact: true });
      await expect(btn).toBeVisible();
      const className = await btn.getAttribute('class');
      if (className && className.includes('bg-purple-100')) {
        await btn.click();
      }
    }

    // Start Challenge Mode
    const startButton = page.locator('button', { hasText: 'Start Challenge Mode' });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Verify we are back in main menu and challenge countdown is visible
    const countdownBadge = page.getByTestId('challenge-countdown-badge');
    await expect(countdownBadge).toBeVisible();
    const remaining = page.getByTestId('challenge-stars-remaining');
    await expect(remaining).toHaveText('5');

    // Verify only Math Pop launcher is visible, and others are hidden
    const mathLauncher = page.getByTestId('launch-math');
    await expect(mathLauncher).toBeVisible();

    const hiddenLaunchers = [
      'launch-odd',
      'launch-doodle',
      'launch-memory',
      'launch-maze',
      'launch-trace',
      'launch-emojimatch',
      'launch-anlaut',
      'launch-shiritori',
      'launch-town',
      'launch-shop'
    ];

    for (const launcherId of hiddenLaunchers) {
      const launcher = page.getByTestId(launcherId);
      await expect(launcher).toBeHidden();
    }
  });

  test('Verify Math Game no-retry and completion flow in challenge mode', async ({ page }) => {
    // 1. Activate challenge mode via Parent settings (5 Stars target, Math only)
    const parentsButton = page.locator('button', { hasText: 'Parents' });
    await parentsButton.click();
    await solveParentGate(page);

    const targetSelect = page.locator('select');
    await targetSelect.selectOption('5'); // 5 Stars target

    const gamesToDisable = [
      '🧐 Odd One', '🎨 Doodle', '🐯 Match', '🗺️ Mazes', '⭐ Trace', '⚡ Emoji Match', '🔤 First Sound', '🔗 Word Chain'
    ];
    for (const name of gamesToDisable) {
      const btn = page.getByRole('button', { name, exact: true });
      const className = await btn.getAttribute('class');
      if (className && className.includes('bg-purple-100')) {
        await btn.click();
      }
    }

    await page.locator('button', { hasText: 'Start Challenge Mode' }).click();

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

    const claimButton = page.getByTestId('claim-challenge-reward-button');
    await expect(claimButton).toBeVisible();
    await claimButton.click();

    // Verify we are back in normal mode (countdown badge is hidden, other games are visible)
    await expect(completionModal).toBeHidden();
    const countdownBadge = page.getByTestId('challenge-countdown-badge');
    await expect(countdownBadge).toBeHidden();

    // Verify other games are visible again (e.g. Odd One)
    const oddLauncher = page.getByTestId('launch-odd');
    await expect(oddLauncher).toBeVisible();
  });
});
