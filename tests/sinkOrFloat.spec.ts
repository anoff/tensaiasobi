import { test, expect, type Locator, type Page } from '@playwright/test';
import { openGame } from './ageLevels';

async function stars(page: Page) {
  return Number((await page.getByTestId('stars-total').innerText()).replace(/\D/g, '') || '0');
}

/** Pick up the object on the shelf and say float or sink. */
async function predict(page: Page, emoji: string, floats: boolean) {
  await page.locator(`[data-testid="sof-object"][data-emoji="${emoji}"]`).click();
  await page.getByTestId(floats ? 'sof-float' : 'sof-sink').click();
}

async function shelf(page: Page) {
  const objects = page.getByTestId('sof-object');
  const count = await objects.count();
  const items: { emoji: string; floats: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      emoji: (await objects.nth(i).getAttribute('data-emoji'))!,
      floats: (await objects.nth(i).getAttribute('data-floats')) === 'true',
    });
  }
  return items;
}

test.describe('Sink or Float', () => {
  test('easy: one object at a time, a miss shows the result and lets the child retry', async ({ page }) => {
    await openGame(page, 'launch-sink-or-float', 'little', 'easy');
    const stage = page.getByTestId('sof-stage');
    await expect(stage).toHaveAttribute('data-flow', 'single');
    await expect(stage).toHaveAttribute('data-count', '2');
    await expect(page.getByTestId('sof-object')).toHaveCount(1);
    // Zones are off until an object is picked up.
    await expect(page.getByTestId('sof-float')).toBeDisabled();

    const before = await stars(page);
    const [first] = await shelf(page);
    await predict(page, first.emoji, !first.floats);
    await expect(page.getByTestId('sof-result')).toHaveAttribute('data-correct', 'false');
    await expect(page.getByTestId('sof-result')).toHaveAttribute('data-result', first.floats ? 'float' : 'sink');
    await expect(stage).toHaveAttribute('data-phase', 'playing');
    // Same object is back for another try.
    await expect(page.getByTestId('sof-object')).toHaveAttribute('data-emoji', first.emoji);
    expect(await stars(page)).toBe(before);

    await predict(page, first.emoji, first.floats);
    await expect(page.getByTestId('sof-result')).toHaveAttribute('data-correct', 'true');
    await expect(stage).toHaveAttribute('data-phase', 'playing');
    await expect(page.getByTestId('sof-object')).not.toHaveAttribute('data-emoji', first.emoji);

    const [second] = await shelf(page);
    await predict(page, second.emoji, second.floats);
    await expect(page.getByTestId('sof-victory')).toBeVisible();
    await expect.poll(() => stars(page)).toBe(before + 2);
  });

  test('medium: all objects are on the shelf and any order works', async ({ page }) => {
    await openGame(page, 'launch-sink-or-float', 'big', 'medium');
    const items = await shelf(page);
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.length).toBeLessThanOrEqual(4);
    const before = await stars(page);
    for (const item of [...items].reverse()) await predict(page, item.emoji, item.floats);
    await expect(page.getByTestId('sof-victory')).toBeVisible();
    await expect.poll(() => stars(page)).toBe(before + 6);
  });

  test('hard: predict everything first, then drop; all right pays 10 stars', async ({ page }) => {
    await openGame(page, 'launch-sink-or-float', 'big', 'hard');
    const stage = page.getByTestId('sof-stage');
    await expect(stage).toHaveAttribute('data-flow', 'batch');
    const items = await shelf(page);
    expect(items.length).toBeGreaterThanOrEqual(4);
    const before = await stars(page);

    for (const item of items.slice(0, -1)) await predict(page, item.emoji, item.floats);
    await expect(page.getByTestId('sof-drop')).toHaveCount(0);
    const last = items[items.length - 1];
    await predict(page, last.emoji, last.floats);
    await page.getByTestId('sof-drop').click();
    await expect(stage).toHaveAttribute('data-phase', 'dropping');
    await expect(page.getByTestId('sof-victory')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => stars(page)).toBe(before + 10);
  });

  test('hard: one wrong prediction ends the round with no stars and fresh objects', async ({ page }) => {
    await openGame(page, 'launch-sink-or-float', 'big', 'hard');
    const stage = page.getByTestId('sof-stage');
    const items = await shelf(page);
    const before = await stars(page);

    for (const [i, item] of items.entries()) await predict(page, item.emoji, i === 0 ? !item.floats : item.floats);
    await page.getByTestId('sof-drop').click();
    await expect(page.getByTestId('sof-victory')).toHaveCount(0);
    // The true result is shown, then a new round replaces the shelf.
    await expect(page.locator('[data-testid="sof-object"][data-prediction="float"], [data-testid="sof-object"][data-prediction="sink"]')).toHaveCount(0, { timeout: 15_000 });
    await expect(stage).toHaveAttribute('data-phase', 'playing');
    expect(await stars(page)).toBe(before);
  });

  test('every drop restarts the animation: two misses in a row, then a right answer right after a miss', async ({ page }) => {
    await openGame(page, 'launch-sink-or-float', 'little', 'easy');
    const stage = page.getByTestId('sof-stage');
    const dropId = async () => Number(await page.getByTestId('sof-drop-object').getAttribute('data-drop-id'));
    const [first] = await shelf(page);

    await predict(page, first.emoji, !first.floats);
    const miss1 = await dropId();
    await expect(stage).toHaveAttribute('data-phase', 'playing');

    await predict(page, first.emoji, !first.floats);
    const miss2 = await dropId();
    expect(miss2).toBeGreaterThan(miss1);
    await expect(stage).toHaveAttribute('data-phase', 'playing');

    // A right answer straight after a miss also gets its own drop.
    await predict(page, first.emoji, first.floats);
    const right = await dropId();
    expect(right).toBeGreaterThan(miss2);
    await expect(page.getByTestId('sof-result')).toHaveAttribute('data-correct', 'true');
  });

  // Small phones: every control must be on screen at once (nothing to scroll to), and the
  // picked-up object must stay visible while the child chooses Float or Sink.
  const PHONES = [
    { name: 'smallest phone', width: 320, height: 568, minTarget: 72 },
    { name: 'short phone', width: 375, height: 667, minTarget: 96 },
    { name: 'standard phone', width: 390, height: 844, minTarget: 96 },
  ] as const;

  for (const phone of PHONES) {
    test.describe(`${phone.name} (${phone.width}x${phone.height})`, () => {
      test.use({ viewport: { width: phone.width, height: phone.height } });

      async function expectOnScreen(locator: Locator, what: string) {
        const box = await locator.boundingBox();
        expect(box, `${what} is rendered`).not.toBeNull();
        expect(box!.y, `${what} top`).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height, `${what} bottom`).toBeLessThanOrEqual(phone.height);
        expect(box!.x, `${what} left`).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width, `${what} right`).toBeLessThanOrEqual(phone.width);
        return box!;
      }

      /** The play area must not need scrolling, and all controls must be big enough. */
      async function expectFits(page: Page, withDrop: boolean) {
        await page.waitForTimeout(700); // let the pop-in animation settle
        const objects = page.getByTestId('sof-object');
        for (let i = 0; i < (await objects.count()); i++) {
          const box = await expectOnScreen(objects.nth(i), `object ${i}`);
          expect(box.width, `object ${i} width`).toBeGreaterThanOrEqual(phone.minTarget);
          expect(box.height, `object ${i} height`).toBeGreaterThanOrEqual(phone.minTarget);
        }
        await expectOnScreen(page.getByTestId('sof-tank'), 'tank');
        for (const id of ['sof-float', 'sof-sink']) {
          const box = await expectOnScreen(page.getByTestId(id), id);
          expect(box.width, `${id} width`).toBeGreaterThanOrEqual(phone.minTarget);
          expect(box.height, `${id} height`).toBeGreaterThanOrEqual(phone.minTarget);
        }
        if (withDrop) await expectOnScreen(page.getByTestId('sof-drop'), 'drop button');
        const scrolls = await page.locator('main').evaluate((el) => el.scrollHeight - el.clientHeight);
        expect(scrolls, 'main does not scroll').toBeLessThanOrEqual(1);
      }

      for (const [band, level] of [['little', 'easy'], ['big', 'medium'], ['big', 'hard']] as const) {
        test(`${level}: shelf, tank and both zones fit together, also with an object picked up`, async ({ page }) => {
          await openGame(page, 'launch-sink-or-float', band, level);
          if (level === 'hard') {
            // Worst case: five objects on the shelf.
            for (let i = 0; i < 30 && (await page.getByTestId('sof-object').count()) < 5; i++) {
              await page.getByTestId(i % 2 === 0 ? 'difficulty-medium' : 'difficulty-hard').click();
              await page.getByTestId('difficulty-hard').click();
            }
          }
          await expectFits(page, false);

          // Pick one up: it stays on screen next to the zones it is going to.
          const items = await shelf(page);
          const first = page.locator(`[data-testid="sof-object"][data-emoji="${items[0].emoji}"]`);
          await first.click();
          await expect(first).toHaveAttribute('data-selected', 'true');
          await page.waitForTimeout(300);
          await expectOnScreen(first, 'picked-up object');
          await expect(page.getByTestId('sof-float')).toBeEnabled();
          await expectFits(page, false);

          if (level === 'hard') {
            // Predict everything: the big drop button is on screen too, and so is the result.
            await page.getByTestId(items[0].floats ? 'sof-float' : 'sof-sink').click();
            for (const item of items.slice(1)) await predict(page, item.emoji, item.floats);
            await expect(page.getByTestId('sof-drop')).toBeVisible();
            await expectFits(page, true);
            await page.getByTestId('sof-drop').click();
            await expect(page.getByTestId('sof-victory')).toBeVisible({ timeout: 15_000 });
            await expectOnScreen(page.getByTestId('sof-victory'), 'victory text');
          }
        });
      }
    });
  }
});
