import { test, expect, type Page } from '@playwright/test';
import { TORTOISE_STICKER_HOLD_MS } from '../src/games/chessTortoise';


async function openChess(page: Page, search = '') {
  await page.goto('/' + (search ? `?${search}` : ''));
  await page.getByTestId('age-mode-big').click();
  await page.getByTestId('launch-chess').click();
  await expect(page.getByTestId('chess-root')).toHaveAttribute('data-phase', 'pick');
}

test.describe('Chess', () => {
  test('launcher uses drawn Staunton art and opens four modes', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-big').click();
    const launch = page.getByTestId('launch-chess');
    await expect(launch).toBeVisible();
    await expect(launch.locator('img')).toHaveAttribute('src', /chess_launcher/);
    await launch.click();
    await expect(page.getByTestId('chess-mode-moves')).toBeVisible();
    await expect(page.getByTestId('chess-mode-capture')).toBeVisible();
    await expect(page.getByTestId('chess-mode-hotseat')).toBeVisible();
    await expect(page.getByTestId('chess-mode-tortoise')).toBeVisible();
    for (const btn of await page.locator('[data-testid^="chess-mode-"]').all()) {
      const box = await btn.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(96);
    }
    const levels = page.getByTestId('chess-tortoise-levels');
    await expect(levels).toBeVisible();
    await expect(page.getByTestId('difficulty-easy')).toBeVisible();
    await expect(page.getByTestId('difficulty-medium')).toBeVisible();
    await expect(page.getByTestId('difficulty-hard')).toHaveCount(0);
    await expect(levels.getByText('Gentle')).toBeVisible();
    await expect(levels.getByText('Clever')).toBeVisible();
    const levelLabel = page.getByTestId('chess-tortoise-level-label');
    await expect(levelLabel).toHaveText('Tortoise level');
    const labelBox = await levelLabel.boundingBox();
    const rowBox = await page.getByTestId('difficulty-easy').boundingBox();
    expect(labelBox).toBeTruthy();
    expect(rowBox).toBeTruthy();
    expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(rowBox!.y + 1);
  });

  test('moves mode: hint reveals legal squares, miss does not, hit moves the piece', async ({ page }) => {
    await openChess(page);
    await page.getByTestId('chess-mode-moves').click();
    await expect(page.getByTestId('chess-board')).toBeVisible();
    const board = page.getByTestId('chess-board');
    const hintBtn = page.getByTestId('chess-hint');
    await expect(hintBtn).toBeVisible();
    const hb = await hintBtn.boundingBox();
    expect(hb?.height ?? 0).toBeGreaterThanOrEqual(96);
    await expect(page.getByTestId('chess-hint-dot')).toHaveCount(0);
    await expect(page.getByTestId('chess-hint-capture')).toHaveCount(0);
    await page.getByTestId('chess-sq-a8').click();
    await expect(page.getByTestId('chess-hint-dot')).toHaveCount(0);
    await expect(page.getByTestId('chess-hint-capture')).toHaveCount(0);
    await hintBtn.click();
    await expect(
      page.getByTestId('chess-hint-dot').or(page.getByTestId('chess-hint-capture')).first(),
    ).toBeVisible();
    const hintSq = await page.getByTestId('chess-hint-dot').first().locator('xpath=ancestor::button').getAttribute('data-square');
    expect(hintSq).toBeTruthy();
    const before = await board.getAttribute('data-fen');
    await page.getByTestId(`chess-sq-${hintSq}`).click();
    await expect.poll(async () => board.getAttribute('data-fen')).not.toBe(before);
  });

  test('capture mode: hint-gated sequence of captures', async ({ page }) => {
    await openChess(page);
    await page.getByTestId('chess-mode-capture').click();
    const board = page.getByTestId('chess-board');
    await expect(board).toBeVisible();
    await expect(page.getByTestId('chess-hint')).toBeVisible();
    await expect(page.getByTestId('chess-hint-dot')).toHaveCount(0);
    await expect(page.getByTestId('chess-hint-capture')).toHaveCount(0);
    const whites = board.locator('[data-piece^="w"]');
    const count = await whites.count();
    for (let i = 0; i < count; i++) {
      await whites.nth(i).click();
      if (await page.getByTestId('chess-selected').count()) break;
    }
    await expect(page.getByTestId('chess-selected')).toBeVisible();
    await expect(page.getByTestId('chess-hint-capture')).toHaveCount(0);
    await page.getByTestId('chess-sq-a8').click();
    await expect(page.getByTestId('chess-hint-capture')).toHaveCount(0);
    await expect(page.getByTestId('chess-hint-dot')).toHaveCount(0);
    await page.getByTestId('chess-hint').click();
    await expect(page.getByTestId('chess-hint-capture')).toHaveCount(1);
    await expect(page.getByTestId('chess-hint-dot')).toHaveCount(0);
    const startFen = await board.getAttribute('data-fen');
    const capSq = await page.getByTestId('chess-hint-capture').locator('xpath=ancestor::button').getAttribute('data-square');
    expect(capSq).toBeTruthy();
    await page.getByTestId(`chess-sq-${capSq}`).click();
    await expect.poll(async () => board.getAttribute('data-fen')).not.toBe(startFen);
    await expect(page.getByTestId('chess-hint-capture')).toHaveCount(0);
    await expect(page.getByTestId('chess-hint-dot')).toHaveCount(0);
    await page.getByTestId('chess-hint').click();
    await expect(page.getByTestId('chess-hint-capture')).toHaveCount(1);
    await expect(page.getByTestId('chess-hint-dot')).toHaveCount(0);
  });

  test('capture mode: involved pieces only, progress count, and side dot', async ({ page }) => {
    await openChess(page);
    await page.getByTestId('chess-mode-capture').click();
    await expect(page.getByTestId('chess-side-dot')).toBeVisible();
    await expect(page.getByTestId('chess-side-dot')).toHaveText('⚪');
    const progress = page.getByTestId('chess-capture-progress');
    await expect(progress).toBeVisible();
    await expect(progress).toHaveText(/0 \/ [23]/);
    await expect(page.locator('[data-piece="wk"]')).toHaveCount(0);
    // A sequence may end on the king, so that king stays visible. Spectator kings do not.
    expect(await page.locator('[data-piece="bk"]').count()).toBeLessThanOrEqual(1);
    await expect(page.getByTestId('chess-won-trays')).toHaveCount(0);
    const whites = page.getByTestId('chess-board').locator('[data-piece^="w"]');
    const count = await whites.count();
    for (let i = 0; i < count; i++) {
      await whites.nth(i).click();
      if (await page.getByTestId('chess-selected').count()) break;
    }
    await page.getByTestId('chess-hint').click();
    const capSq = await page.getByTestId('chess-hint-capture').locator('xpath=ancestor::button').getAttribute('data-square');
    await page.getByTestId(`chess-sq-${capSq}`).click();
    await expect.poll(async () => progress.textContent()).toMatch(/1 \/ [23]/);
    await expect(page.locator('[data-piece="wk"]')).toHaveCount(0);
    expect(await page.locator('[data-piece="bk"]').count()).toBeLessThanOrEqual(1);
  });

  test('hot-seat starts from the standard setup with turn banner', async ({ page }) => {
    await openChess(page);
    await page.getByTestId('chess-mode-hotseat').click();
    await expect(page.getByTestId('chess-prompt')).toContainText(/White|Blancs|Weiß|しろ|백/);
    await expect(page.getByTestId('chess-board')).toHaveAttribute('data-fen', /rnbqkbnr\/pppppppp/);
    await expect(page.getByTestId('chess-sq-a1')).toHaveAttribute('data-tile', 'walnut');
    await expect(page.getByTestId('chess-sq-h1')).toHaveAttribute('data-tile', 'cream');
    await expect(page.getByTestId('chess-panda')).toBeVisible();
    await expect(page.getByTestId('chess-hint')).toHaveCount(0);
    await page.getByTestId('chess-sq-e2').click();
    await expect(page.getByTestId('chess-selected')).toBeVisible();
    await expect(page.getByTestId('chess-hint-dot').first()).toBeVisible();
    await page.getByTestId('chess-sq-e4').click();
    await expect(page.getByTestId('chess-prompt')).toContainText(/Black|Noirs|Schwarz|くろ|흑/);
    await expect(page.getByTestId('chess-side-dot')).toHaveText('⚫');
    await expect(page.getByTestId('chess-won-count-w')).toHaveText('0');
    await expect(page.getByTestId('chess-won-count-b')).toHaveText('0');
    await page.getByTestId('chess-sq-d7').click();
    await page.getByTestId('chess-sq-d5').click();
    await page.getByTestId('chess-sq-e4').click();
    await page.getByTestId('chess-sq-d5').click();
    await expect(page.getByTestId('chess-won-count-w')).toHaveText('1');
    await expect(page.getByTestId('chess-won-white').locator('img')).toHaveCount(1);
    await expect(page.getByTestId('chess-won-count-b')).toHaveText('0');
  });

  test('moves mode has no tray, take-count, or side dot', async ({ page }) => {
    await openChess(page);
    await page.getByTestId('chess-mode-moves').click();
    await expect(page.getByTestId('chess-side-dot')).toHaveCount(0);
    await expect(page.getByTestId('chess-capture-progress')).toHaveCount(0);
    await expect(page.getByTestId('chess-won-trays')).toHaveCount(0);
  });

  test('fits short phones without clipped chrome', async ({ page }) => {
    for (const { width, height } of [
      { width: 320, height: 568 },
      { width: 375, height: 667 },
    ]) {
      await page.setViewportSize({ width, height });
      await openChess(page);
      await page.getByTestId('chess-mode-moves').click();
      const board = page.getByTestId('chess-board');
      await expect(board).toBeVisible();
      const box = await board.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(height);
      const done = page.getByTestId('chess-done');
      const db = await done.boundingBox();
      expect(db!.y + db!.height).toBeLessThanOrEqual(height);
      expect(db!.height).toBeGreaterThanOrEqual(72);
      await expect(page.getByTestId('chess-panda')).toBeHidden();
      await page.getByTestId('chess-done').click();
    }
  });

  test('vs Tortoise starts from the standard setup with no Hint button', async ({ page }) => {
    await openChess(page);
    await page.getByTestId('chess-mode-tortoise').click();
    const root = page.getByTestId('chess-root');
    await expect(root).toHaveAttribute('data-mode', 'tortoise');
    const board = page.getByTestId('chess-board');
    await expect(board).toBeVisible();
    await expect(board).toHaveAttribute('data-fen', /rnbqkbnr\/pppppppp\/8\/8\/8\/8\/PPPPPPPP\/RNBQKBNR w/);
    await expect(page.getByTestId('chess-prompt')).toHaveText('White to move');
    await expect(page.getByTestId('chess-hint')).toHaveCount(0);
    await expect(page.getByTestId('chess-won-trays')).toBeVisible();
  });

  test('vs Tortoise shows a one-line thinking banner, then a last-move tint', async ({ page }) => {
    await openChess(page);
    await page.getByTestId('chess-mode-tortoise').click();
    await page.getByTestId('chess-sq-e2').click();
    await page.getByTestId('chess-sq-e4').click();
    const prompt = page.getByTestId('chess-prompt');
    await expect(prompt).toHaveText('⚫ Tortoise is thinking…');
    await expect(page.getByTestId('chess-thinking')).toHaveCount(0);
    await expect(page.getByTestId('chess-side-dot')).toHaveCount(0);
    const box = await prompt.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeLessThanOrEqual(375);
    // One line of text-lg / leading-tight is well under 40px; a wrap would be taller.
    expect(box!.height).toBeLessThan(40);
    await expect(page.getByTestId('chess-last-move').first()).toBeVisible({ timeout: 3000 });
    await expect(prompt).toHaveText('White to move');
    await expect(page.getByTestId('chess-side-dot')).toHaveText('⚪');
  });

  test("vs Tortoise shows a calm Tortoise wins after the king is captured", async ({ page }) => {
    const fen = encodeURIComponent('4k3/8/8/8/8/8/4q3/4K3 b - - 0 1');
    await openChess(page, `tortoiseFen=${fen}&tortoiseLevel=clever`);
    await page.getByTestId('chess-mode-tortoise').click();
    await expect(page.getByTestId('chess-prompt')).toHaveText('Tortoise wins', { timeout: 5000 });
    await expect(page.getByTestId('chess-play-again')).toBeVisible();
    await expect(page.getByTestId('chess-new-game')).toHaveCount(0);
    const award = page.getByTestId('sticker-award');
    await expect(award).toHaveCount(0);
    if (await award.count()) {
      await award.click();
      if (await award.isVisible().catch(() => false)) await award.click();
      await expect(award).toHaveCount(0);
    }
    await expect(page.getByTestId('chess-prompt')).toHaveText('Tortoise wins');
    await expect(page.locator('.animate-confetti, [data-testid="chess-confetti"]')).toHaveCount(0);
  });

  test('vs Tortoise holds the Logic sticker popup until the end line has been visible for 1.5s', async ({ page }) => {
    const fen = encodeURIComponent('4k3/8/8/8/8/8/4q3/4K3 b - - 0 1');
    await openChess(page, `tortoiseFen=${fen}&tortoiseLevel=clever`);
    await page.getByTestId('chess-mode-tortoise').click();
    const prompt = page.getByTestId('chess-prompt');
    await expect(prompt).toHaveText('Tortoise wins', { timeout: 5000 });
    const award = page.getByTestId('sticker-award');
    await expect(award).toHaveCount(0);
    // Still hidden well after the line is on screen; then it may appear at 1.5s.
    await page.waitForTimeout(1000);
    await expect(award).toHaveCount(0);
    await expect(award).toBeVisible({ timeout: TORTOISE_STICKER_HOLD_MS });
  });
});
