import { test, expect, type Page } from '@playwright/test';

async function openChess(page: Page) {
  await page.goto('/');
  await page.getByTestId('age-mode-big').click();
  await page.getByTestId('launch-chess').click();
  await expect(page.getByTestId('chess-root')).toHaveAttribute('data-phase', 'pick');
}

test.describe('Chess', () => {
  test('launcher uses drawn Staunton art and opens three modes', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-big').click();
    const launch = page.getByTestId('launch-chess');
    await expect(launch).toBeVisible();
    await expect(launch.locator('img')).toHaveAttribute('src', /chess_launcher/);
    await launch.click();
    await expect(page.getByTestId('chess-mode-moves')).toBeVisible();
    await expect(page.getByTestId('chess-mode-capture')).toBeVisible();
    await expect(page.getByTestId('chess-mode-hotseat')).toBeVisible();
    for (const btn of await page.locator('[data-testid^="chess-mode-"]').all()) {
      const box = await btn.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(96);
    }
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
});
