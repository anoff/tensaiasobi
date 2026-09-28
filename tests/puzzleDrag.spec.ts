import { test, expect, Page } from '@playwright/test';

async function center(page: Page, selector: string) {
  const box = await page.locator(selector).boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function firstTrayPieceId(page: Page) {
  return Number(await page.getByTestId('puzzle-tray-piece').first().getAttribute('data-piece-id'));
}

async function mouseDrag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

test.describe('Magic Puzzle drag and drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-puzzle').click();
    await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(4);
  });

  test('dragging every piece onto its spot solves the puzzle', async ({ page }) => {
    for (let placed = 0; placed < 4; placed++) {
      const id = await firstTrayPieceId(page);
      const from = await center(page, `[data-testid="puzzle-tray-piece"][data-piece-id="${id}"]`);
      const to = await center(page, `[data-puzzle-slot="${id}"]`);
      await mouseDrag(page, from, to);
      await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(3 - placed);
    }
    await expect(page.getByText(/Superb/)).toBeVisible();
  });

  test('hard is a 4×4 that can be solved by dragging, with tap-sized slots', async ({ page }) => {
    await page.getByTestId('difficulty-hard').click();
    await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(16);
    const slot = await page.locator('[data-puzzle-slot="0"]').boundingBox();
    expect(slot!.width).toBeGreaterThanOrEqual(64);
    for (let placed = 0; placed < 16; placed++) {
      const id = await firstTrayPieceId(page);
      const from = await center(page, `[data-testid="puzzle-tray-piece"][data-piece-id="${id}"]`);
      const to = await center(page, `[data-puzzle-slot="${id}"]`);
      await mouseDrag(page, from, to);
      await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(15 - placed);
    }
    await expect(page.getByText(/Superb/)).toBeVisible();
  });

  test('dropping outside the board keeps the piece in the tray', async ({ page }) => {
    const id = await firstTrayPieceId(page);
    const from = await center(page, `[data-testid="puzzle-tray-piece"][data-piece-id="${id}"]`);
    await mouseDrag(page, from, { x: 5, y: 5 });
    await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(4);
  });

  test('tap a piece then tap its spot still works', async ({ page }) => {
    const id = await firstTrayPieceId(page);
    await page.locator(`[data-testid="puzzle-tray-piece"][data-piece-id="${id}"] button`).click();
    await page.locator(`[data-puzzle-slot="${id}"]`).click();
    await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(3);
  });
});

test.describe('Magic Puzzle drag with touch', () => {
  test.use({ hasTouch: true });

  test('a finger can drag every piece onto its spot, diagonals included', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-puzzle').click();
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });

    for (let placed = 0; placed < 4; placed++) {
      const id = await firstTrayPieceId(page);
      const from = await center(page, `[data-testid="puzzle-tray-piece"][data-piece-id="${id}"]`);
      const to = await center(page, `[data-puzzle-slot="${id}"]`);
      await touch('touchStart', from);
      for (let i = 1; i <= 8; i++) {
        await touch('touchMove', { x: from.x + ((to.x - from.x) * i) / 8, y: from.y + ((to.y - from.y) * i) / 8 });
      }
      await touch('touchEnd');
      await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(3 - placed);
    }
    await expect(page.getByText(/Superb/)).toBeVisible();
  });

  test('a sideways swipe on a piece scrolls the tray instead of grabbing it', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-puzzle').click();
    await page.getByTestId('difficulty-hard').click();
    await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(16);
    const tray = page.getByTestId('puzzle-tray-piece').first().locator('..');
    const from = await center(page, '[data-testid="puzzle-tray-piece"]:nth-child(3)');

    const cdp = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', p?: { x: number; y: number }) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
    await touch('touchStart', from);
    for (let i = 1; i <= 8; i++) await touch('touchMove', { x: from.x - i * 15, y: from.y });
    await touch('touchEnd');

    expect(await tray.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);
    await expect(page.getByTestId('puzzle-tray-piece')).toHaveCount(16);
    await expect(page.locator('[data-puzzle-slot] [data-testid="puzzle-tray-piece"]')).toHaveCount(0);
  });
});
