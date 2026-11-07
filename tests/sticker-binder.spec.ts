import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const KEY = 'gamification_stickers';
const owned = [
  { uid: 'c1', id: 'numbers_01', shiny: false },
  { uid: 'c2', id: 'numbers_01', shiny: true },
  { uid: 'c3', id: 'numbers_02', shiny: false },
  { uid: 'c4', id: 'numbers_01', shiny: false },
];
const placed = (uid: string, x = 0.5, y = 0.5) => ({ uid, x, y, size: 1, rotation: 0 });
const fixture = {
  version: 2, copies: owned, daily: { date: '2026-11-08', k: 3 }, seenCount: 4,
  ownedAccessories: ['crown'], placements: { c2: [{ accessoryId: 'crown', x: 0.5, y: 0.2 }] },
  pages: [
    { id: 'p1', background: 'blank', stickers: [] },
    { id: 'p2', background: { theme: 'park', seed: 3 }, stickers: [placed('c1', 0.3, 0.4), placed('c2', 0.7, 0.6), placed('c3', 0.4, 0.7)] },
    { id: 'p3', background: 'blank', stickers: [placed('c4')] },
  ],
};
async function open(page: Page, book = fixture, theme = 'animals') {
  await page.addInitScript(({ key, book, theme }) => {
    if (sessionStorage.getItem('binder-seeded')) return;
    sessionStorage.setItem('binder-seeded', '1');
    localStorage.setItem(key, JSON.stringify(book));
    localStorage.setItem('settings_app_theme', JSON.stringify(theme));
    localStorage.setItem('gamification_stars', '25');
  }, { key: KEY, book, theme });
  await page.goto('/');
  await page.getByTestId('launch-sticker-book').click();
  await page.getByTestId('book-tab-pages').click();
}
async function stored(page: Page) {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
}
async function shot(page: Page, name: string) {
  const dir = process.env.STICKER_SCREENSHOTS_DIR;
  if (!dir) return;
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: join(dir, `${name}.png`) });
}

test('nested Add page: cancel/back create nothing, all themes retained, failed save retries and double tap creates once', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('tab')).toHaveCount(2);
  await expect(page.getByTestId('book-tab-scenes')).toHaveCount(0);
  const before = await stored(page);
  await page.getByTestId('page-new').click();
  await expect(page.getByTestId('book-tab-pages')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-testid^="page-bg-"]')).toHaveCount(21);
  await expect(page.locator('[data-testid^="page-bg-"]').first()).toHaveAttribute('data-testid', 'page-bg-blank');
  await shot(page, '03-add-page-picker');
  await page.getByTestId('page-add-cancel').click();
  expect(await stored(page)).toEqual(before);
  await expect(page.getByTestId('page-board')).toHaveAttribute('data-page', 'p3');
  await page.getByTestId('page-new').click();
  await page.keyboard.press('Escape');
  expect(await stored(page)).toEqual(before);
  await page.getByTestId('page-new').click();
  await page.goBack();
  await expect(page.getByTestId('page-board')).toHaveAttribute('data-page', 'p3');
  expect(await stored(page)).toEqual(before);
  await page.getByTestId('page-new').click();
  await page.evaluate(`(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === '${KEY}' && sessionStorage.getItem('fail-save')) throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    sessionStorage.setItem('fail-save', '1');
  })()`);
  await page.getByTestId('page-bg-park').click();
  await expect(page.getByRole('alert')).toHaveText('Could not save. Please try again.');
  expect(await stored(page)).toEqual(before);
  await page.evaluate(() => sessionStorage.removeItem('fail-save'));
  await page.getByTestId('page-bg-park').evaluate((element) => { element.click(); element.click(); });
  await expect(page.getByTestId('page-board')).toHaveAttribute('data-background', 'park');
  const after = await stored(page);
  expect(after.pages).toHaveLength(before.pages.length + 1);
  expect(after.pages.slice(0, -1)).toEqual(before.pages);
  expect(after.copies).toEqual(before.copies);
});

test('confirmed deletion returns every plain/shiny copy without minting, preserves accessories, persists and leaves empty book', async ({ page }) => {
  await open(page);
  await page.getByTestId('page-prev').click();
  const before = await stored(page);
  await page.getByTestId('page-delete').click();
  const dialog = page.getByTestId('page-delete-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('page-delete-cancel')).toBeFocused();
  await expect(page.getByTestId('page-delete-preview').locator('[data-shiny="true"]')).toHaveCount(1);
  await shot(page, '04-delete-confirmation');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByTestId('page-delete-confirm')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByTestId('page-delete-cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId('page-delete')).toBeFocused();
  expect(await stored(page)).toEqual(before);
  await page.getByTestId('page-delete').click();
  await page.getByTestId('page-delete-cancel').click();
  expect(await stored(page)).toEqual(before);
  await page.getByTestId('page-delete').click();
  await page.mouse.click(3, 3);
  await expect(dialog).not.toBeVisible();
  expect(await stored(page)).toEqual(before);
  await page.getByTestId('page-delete').click();
  await page.goBack();
  await expect(dialog).not.toBeVisible();
  expect(await stored(page)).toEqual(before);
  await page.getByTestId('page-delete').click();
  await page.evaluate("window.dispatchEvent(new Event('app-back', { cancelable: true }))");
  await expect(dialog).not.toBeVisible();
  expect(await stored(page)).toEqual(before);
  await page.getByTestId('page-delete').click();
  await page.evaluate(`(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key === '${KEY}' && sessionStorage.getItem('fail-save')) throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    sessionStorage.setItem('fail-save', '1');
  })()`);
  await page.getByTestId('page-delete-confirm').click();
  await expect(page.getByRole('alert')).toHaveText('Could not save. Please try again.');
  expect(await stored(page)).toEqual(before);
  await expect(page.getByTestId('page-board')).toHaveAttribute('data-page', 'p2');
  await page.evaluate(() => sessionStorage.removeItem('fail-save'));
  await page.getByTestId('page-delete-confirm').click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByTestId('page-board')).toHaveAttribute('data-page', 'p3');
  await expect(page.getByRole('status')).toHaveText('Page removed. Stickers returned.');
  await expect(page.locator('[data-testid="tray-sticker"][data-sticker="numbers_01"]')).toHaveAttribute('data-free', '2');
  await expect(page.locator('[data-testid="tray-sticker"][data-sticker="numbers_02"]')).toHaveAttribute('data-free', '1');
  const after = await stored(page);
  expect(after).toEqual({ ...before, pages: [before.pages[0], before.pages[2]] });
  await page.reload();
  await page.getByTestId('launch-sticker-book').click();
  await page.getByTestId('book-tab-pages').click();
  expect(await stored(page)).toEqual(after);
  for (const remaining of [1, 0]) {
    await page.getByTestId('page-delete').click();
    await page.getByTestId('page-delete-confirm').click();
    expect((await stored(page)).pages).toHaveLength(remaining);
  }
  await expect(page.getByTestId('page-choose')).toBeVisible();
  await expect(page.getByTestId('binder-rail')).toBeVisible();
  await shot(page, '05-empty-book');
  await page.getByTestId('book-tab-collection').click();
  await expect(page.getByTestId('book-collection')).toBeVisible();
  const empty = await stored(page);
  expect(empty.copies).toEqual(before.copies);
  expect(empty.placements).toEqual(before.placements);
  expect(empty.ownedAccessories).toEqual(before.ownedAccessories);
  expect(empty.version).toBe(2);
  await page.reload();
  await page.getByTestId('launch-sticker-book').click();
  await page.getByTestId('book-tab-pages').click();
  await expect(page.getByTestId('page-choose')).toBeVisible();
  await page.getByTestId('page-new').click();
  await page.getByTestId('page-add-cancel').click();
  expect((await stored(page)).pages).toEqual([]);
});

for (const theme of ['animals', 'space', 'ocean']) {
  test(`binder fit and interaction in ${theme} content theme, at 375 and 320`, async ({ page }) => {
    await open(page, fixture, theme);
    if (theme !== 'animals') await page.getByTestId('page-prev').click();
    for (const size of [{ width: 375, height: 812 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(size);
      await expect(async () => {
        const board = (await page.getByTestId('page-board').boundingBox())!;
        const rail = (await page.getByTestId('binder-rail').boundingBox())!;
        expect(board.height / board.width).toBeCloseTo(16 / 9, 2);
        expect(rail.x + rail.width).toBeLessThan(board.x);
        expect(await page.evaluate('document.documentElement.scrollWidth')).toBeLessThanOrEqual(size.width);
        expect(await page.evaluate('document.querySelector("main").scrollHeight - document.querySelector("main").clientHeight')).toBeLessThanOrEqual(1);
      }).toPass();
      await expect(page.getByTestId('binder-rail')).toHaveCSS('pointer-events', 'none');
      await expect(page.getByTestId('binder-rail')).toHaveAttribute('aria-hidden', 'true');
      if (size.width === 375 && theme !== 'ocean') await shot(page, theme === 'animals' ? '01-binder-blank-animals' : '02-binder-park-space');
      const sticker = page.getByTestId('page-board').getByTestId('page-sticker').first();
      await sticker.click();
      await expect(sticker.getByTestId('handle-size')).toBeVisible();
      await sticker.getByTestId('handle-size').click();
      await sticker.click();
    }
  });
}
