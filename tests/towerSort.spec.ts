import { test, expect, type Page } from '@playwright/test';

const towers = (page: Page) => page.getByTestId('tower-sort-tower');
const counts = (page: Page) =>
  towers(page).evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-count'))));

test.describe('Tower Sort', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-big').click();
    await page.getByTestId('launch-tower-sort').click();
    await expect(towers(page).first()).toBeVisible();
  });

  test('keeps ≤ 5 tap-sized tubes with a height cap of 4 on every school difficulty', async ({ page }) => {
    await expect(page.getByTestId('difficulty-easy')).toBeDisabled();
    for (const diff of ['medium', 'hard'] as const) {
      await page.getByTestId(`difficulty-${diff}`).click();
      const count = await towers(page).count();
      expect(count).toBeLessThanOrEqual(5);
      for (let i = 0; i < count; i++) {
        const tower = towers(page).nth(i);
        const box = await tower.boundingBox();
        expect(box!.width).toBeGreaterThanOrEqual(72);
        expect(Number(await tower.getAttribute('data-capacity'))).toBeLessThanOrEqual(4);
        expect(Number(await tower.getAttribute('data-count'))).toBeLessThanOrEqual(4);
      }
    }
  });

  test('lifting a piece parks it in the hold slot above the tubes; tapping the source puts it back', async ({ page }) => {
    const before = await counts(page);
    const source = before.findIndex((n) => n > 0);
    const hold = page.getByTestId('tower-sort-hold');

    await towers(page).nth(source).click();
    await expect(hold).toHaveAttribute('data-holding', 'true');
    expect((await counts(page))[source]).toBe(before[source] - 1);

    const holdBox = await hold.boundingBox();
    const towerBox = await towers(page).nth(source).boundingBox();
    expect(holdBox!.y + holdBox!.height).toBeLessThanOrEqual(towerBox!.y);

    await towers(page).nth(source).click();
    await expect(hold).toHaveAttribute('data-holding', 'false');
    expect(await counts(page)).toEqual(before);
    await expect(page.getByTestId('tower-sort-moves')).toContainText('0');
  });

  test('a full tube refuses the drop and the piece stays in hand', async ({ page }) => {
    await page.getByTestId('difficulty-hard').click();
    // Hard board: 3 types × 4 pieces in tubes of capacity 4.
    await expect.poll(async () => (await counts(page)).reduce((a, b) => a + b, 0)).toBe(12);
    const capacity = 4;
    const hold = page.getByTestId('tower-sort-hold');

    // Fill tube 0 by moving pieces onto it from the others.
    for (let guard = 0; guard < 20 && (await counts(page))[0] < capacity; guard++) {
      const current = await counts(page);
      const source = current.findIndex((n, i) => i !== 0 && n > 0);
      await towers(page).nth(source).click();
      await expect(hold).toHaveAttribute('data-holding', 'true');
      await towers(page).nth(0).click();
      await expect(hold).toHaveAttribute('data-holding', 'false');
    }
    expect((await counts(page))[0]).toBe(capacity);

    const current = await counts(page);
    const source = current.findIndex((n, i) => i !== 0 && n > 0);
    await towers(page).nth(source).click();
    await expect(hold).toHaveAttribute('data-holding', 'true');
    await towers(page).nth(0).click();

    await expect(hold).toHaveAttribute('data-holding', 'true');
    expect((await counts(page))[0]).toBe(capacity);
  });
});
