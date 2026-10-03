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

    // Zen is gone; Time Attack and 2 players are open on every level.
    await expect(page.getByTestId('start-solo-zen')).toHaveCount(0);
    for (const diff of [easyDiff, mediumDiff]) {
      await diff.click();
      await expect(page.getByTestId('start-solo-time')).toBeVisible();
      await expect(page.getByTestId('start-duel')).toBeVisible();
    }

    // 3. Start Time Attack on Medium difficulty
    await page.getByTestId('start-solo-time').click();

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
    await expect(page.getByTestId('start-solo-time')).toBeVisible();

    // 7. Return to main dashboard menu via HomeButton
    const homeBtn = page.getByTestId('home-button');
    await expect(homeBtn).toBeVisible();
    await homeBtn.click();

    // Verify launcher is visible on home screen again
    await expect(page.getByTestId('launch-emojimatch')).toBeVisible();
  });

  test('2 players: wrong tap freezes only that player, right tap scores and swaps the middle card', async ({ page }) => {
    await page.getByTestId('launch-emojimatch').click();
    await page.getByTestId('difficulty-easy').click();
    await page.getByTestId('start-duel').click();

    const emojis = (testId: string) =>
      page.getByTestId(testId).locator('button').evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim()));
    const center = await emojis('duel-center');
    const p1 = await emojis('duel-card-1');
    const p2 = await emojis('duel-card-2');
    const p1Match = p1.find((e) => center.includes(e))!;
    const p2Wrong = p2.find((e) => !center.includes(e))!;

    await page.getByTestId('duel-card-2').getByRole('button', { name: p2Wrong, exact: true }).click();
    await expect(page.getByTestId('duel-card-2')).toHaveAttribute('data-frozen', 'true');
    await expect(page.getByTestId('duel-card-1')).toHaveAttribute('data-frozen', 'false');

    await page.getByTestId('duel-card-1').getByRole('button', { name: p1Match, exact: true }).click();
    await expect(page.getByTestId('duel-score-1')).toContainText('1 / 10');
    await expect(page.getByTestId('duel-score-2')).toContainText('0 / 10');
    // Player 1's old card is now the middle card.
    await expect.poll(async () => (await emojis('duel-center')).sort().join()).toBe([...p1].sort().join());
    await expect(page.getByTestId('duel-card-2')).toHaveAttribute('data-frozen', 'false');
  });
});
