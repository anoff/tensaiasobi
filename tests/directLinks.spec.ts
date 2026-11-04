import { test, expect, type Page } from '@playwright/test';

// #75: every game has a direct link, `#/<catalog id>`. The hash keeps it base-path agnostic.

const hashOf = async (page: Page) => new URL(page.url()).hash;

test.describe('Direct game links', () => {
  // No link may crash the app: every test ends with zero uncaught page errors.
  let pageErrors: string[] = [];
  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
  });
  test.afterEach(() => {
    expect(pageErrors).toEqual([]);
  });

  test('opening a link starts that game, including one outside the current age band', async ({ page }) => {
    await page.goto('/#/maze');
    await expect(page.getByTestId('maze-canvas')).toBeVisible();
    await expect(page.getByTestId('home-button')).toBeVisible();
    await expect(page.getByTestId('launch-maze')).toHaveCount(0);

    // Tower Sort is a 'big' game; the home switch defaults to 'little'.
    await page.goto('/#towerSort');
    await expect(page.getByTestId('home-button')).toBeVisible();
    await expect(page.getByTestId('category-logic')).toHaveCount(0);
  });

  test('home button returns to the menu and a reload stays there', async ({ page }) => {
    await page.goto('/#/maze');
    await expect(page.getByTestId('maze-canvas')).toBeVisible();

    await page.getByTestId('home-button').click();
    await expect(page.getByTestId('launch-maze')).toBeVisible();
    await expect.poll(() => hashOf(page)).toBe('');

    await page.reload();
    await expect(page.getByTestId('launch-maze')).toBeVisible();
    await expect(page.getByTestId('maze-canvas')).toHaveCount(0);
  });

  test('tapping a tile sets the link; browser Back lands on the menu and Forward reopens the game', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-maze').click();
    await expect(page.getByTestId('maze-canvas')).toBeVisible();
    await expect.poll(() => hashOf(page)).toBe('#/maze');

    await page.goBack();
    await expect(page.getByTestId('launch-maze')).toBeVisible();
    await expect.poll(() => hashOf(page)).toBe('');

    await page.goForward();
    await expect(page.getByTestId('maze-canvas')).toBeVisible();

    // A reload on the game's link reopens the game.
    await page.reload();
    await expect(page.getByTestId('maze-canvas')).toBeVisible();
  });

  test('an unknown game id falls back to the menu and clears the hash', async ({ page }) => {
    await page.goto('/#/no-such-game');
    await expect(page.getByTestId('launch-maze')).toBeVisible();
    await expect(page.getByTestId('home-button')).toHaveCount(0);
    await expect.poll(() => hashOf(page)).toBe('');
  });

  test('a link cannot skip Learning-first mode', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('challenge_active', 'true');
      localStorage.setItem('challenge_play_unlocked', 'false');
    });
    await page.goto('/#/maze');
    await expect(page.getByTestId('maze-canvas')).toHaveCount(0);
    await expect(page.getByTestId('home-button')).toHaveCount(0);
    await expect.poll(() => hashOf(page)).toBe('');
  });

  test('browser Back inside Magic Puzzle goes to its gallery first, then to the menu', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('launch-puzzle').click();
    await expect(page.getByTestId('puzzle-gallery')).toBeVisible();
    await page.getByTestId('puzzle-tile').first().click();
    await expect(page.getByTestId('puzzle-back')).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId('puzzle-gallery')).toBeVisible();
    await expect.poll(() => hashOf(page)).toBe('#/puzzle');

    await page.goBack();
    await expect(page.getByTestId('launch-puzzle')).toBeVisible();
    await expect.poll(() => hashOf(page)).toBe('');
  });
});
