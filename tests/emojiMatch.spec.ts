import { test, expect } from '@playwright/test';

test.describe('Emoji Match Game E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Verify game launcher, configuration screen, and gameplay flow', async ({ page }) => {
    // 1. Check launcher is visible on home screen
    const launcher = page.getByTestId('launch-emojimatch');
    await expect(launcher).toBeVisible();
    await launcher.click();

    // 2. Check setup screen elements are visible
    const easyDiff = page.getByTestId('difficulty-easy');
    const mediumDiff = page.getByTestId('difficulty-medium');
    const hardDiff = page.getByTestId('difficulty-hard');
    
    await expect(easyDiff).toBeVisible();
    await expect(mediumDiff).toBeVisible();
    await expect(hardDiff).toBeVisible();

    const startSoloZen = page.getByTestId('start-solo-zen');
    const startDuel = page.getByTestId('start-duel');
    
    await expect(startSoloZen).toBeVisible();
    await expect(startDuel).toBeVisible();

    // Easy mode should lock out Time Attack
    await easyDiff.click();
    const startSoloTime = page.getByTestId('start-solo-time');
    await expect(startSoloTime).not.toBeVisible(); // Not present because it's replaced with text locked block

    // 3. Start Solo Zen on Medium difficulty
    await mediumDiff.click();
    await expect(startSoloTime).toBeVisible(); // Available now on Medium
    await startSoloZen.click();

    // 4. Verify game screen cards and stats
    const card1 = page.getByTestId('emoji-match-card-1');
    const card2 = page.getByTestId('emoji-match-card-2');
    
    await expect(card1).toBeVisible();
    await expect(card2).toBeVisible();

    // Check that card 1 contains exactly 6 emoji buttons (for Medium, q=5, 6 emojis)
    const card1Buttons = card1.locator('button');
    await expect(card1Buttons).toHaveCount(6);

    // Check that card 2 contains exactly 6 emoji buttons
    const card2Buttons = card2.locator('button');
    await expect(card2Buttons).toHaveCount(6);

    // 5. Test interaction (tap an emoji on card 1)
    const firstEmojiButton = card1Buttons.first();
    await expect(firstEmojiButton).toBeVisible();
    await firstEmojiButton.click();

    // 6. Test returning to the modes menu
    const exitBtn = page.getByText('Exit');
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    // Verify setup screen is visible again
    await expect(page.getByTestId('start-solo-zen')).toBeVisible();

    // 7. Return to main dashboard menu via HomeButton
    const homeBtn = page.getByTestId('home-button');
    await expect(homeBtn).toBeVisible();
    await homeBtn.click();

    // Verify launcher is visible on home screen again
    await expect(page.getByTestId('launch-emojimatch')).toBeVisible();
  });
});
