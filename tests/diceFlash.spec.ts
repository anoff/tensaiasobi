import { test, expect, type Locator, type Page } from '@playwright/test';
import { openGame } from './ageLevels';

async function stars(page: Page) {
  return Number((await page.getByTestId('stars-total').innerText()).replace(/\D/g, '') || '0');
}

const stage = (page: Page) => page.getByTestId('dice-stage');

async function waitForAnswer(page: Page) {
  await expect(stage(page)).toHaveAttribute('data-phase', 'answer', { timeout: 10_000 });
}

async function tap(page: Page, value: number) {
  await page.locator(`[data-testid="dice-option"][data-value="${value}"]`).click();
}

/** A button that is not the right answer. */
async function wrongValue(page: Page) {
  const count = Number(await stage(page).getAttribute('data-count'));
  const values = await page.getByTestId('dice-option').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-value'))));
  return values.find((v) => v !== count)!;
}

/** The white card is the die: no dice emoji in the play area in any phase (the game title keeps its own 🎲). */
async function expectNoDiceEmoji(page: Page) {
  await expect(stage(page).getByText('🎲')).toHaveCount(0);
  await expect(page.getByTestId('dice-card')).not.toContainText('🎲');
}

/** Computed style value of one element. */
async function style(locator: Locator, prop: 'animationName' | 'animationDuration' | 'transform') {
  return locator.evaluate((el, name) => el.ownerDocument.defaultView!.getComputedStyle(el)[name], prop);
}

/** Position of the card and of every dot, to prove nothing moves. */
async function stillSnapshot(page: Page) {
  const round = (r: { x: number; y: number; width: number; height: number }) =>
    [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 10) / 10);
  const card = page.getByTestId('dice-card');
  return {
    card: await card.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    }).then(round),
    dots: await page.getByTestId('dice-dot').evaluateAll((els) => els.map((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    })).then((list) => list.map(round)),
    transform: await style(card, 'transform'),
  };
}

test.describe('Dice Flash', () => {
  test('the blank card is tossed before the flash, then card and dots stand completely still while counting', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'big', 'hard');
    // Start a new set so the toss is seen from its beginning.
    await page.getByTestId('difficulty-medium').click();
    const card = page.getByTestId('dice-card');
    await expect(card).toHaveClass(/dice-toss/);
    await expect(page.getByTestId('dice-dot')).toHaveCount(0);
    await expectNoDiceEmoji(page);
    expect(await style(card, 'animationName')).toBe('dice-toss');
    expect(await style(card, 'animationDuration')).toBe('0.8s');

    // Landing coincides with the flash start: the toss class is gone and the dots appear.
    await expect(stage(page)).toHaveAttribute('data-phase', 'flash');
    await expect(card).not.toHaveClass(/dice-toss/);
    await expect(page.getByTestId('dice-dot')).toHaveCount(Number(await stage(page).getAttribute('data-count')));
    await expectNoDiceEmoji(page);
    await page.waitForTimeout(250); // past the 80 ms dot fade
    const first = await stillSnapshot(page);
    expect(first.transform).toBe('none');
    await page.waitForTimeout(400);
    expect(await stillSnapshot(page)).toEqual(first);
    await expect(stage(page)).toHaveAttribute('data-phase', 'flash');
  });

  test('answer phase: a blank card, no dots and no dice emoji; the toss class only exists while getting ready', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'little', 'easy');
    await waitForAnswer(page);
    await expect(page.getByTestId('dice-card')).toBeVisible();
    await expect(page.getByTestId('dice-card')).not.toHaveClass(/dice-toss/);
    await expect(page.getByTestId('dice-dot')).toHaveCount(0);
    await expectNoDiceEmoji(page);
    await expect(page.getByTestId('dice-card')).toHaveText('');
  });

  test.describe('reduced motion', () => {
    test('no toss, and the dots still fade in over 150 ms', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openGame(page, 'launch-dice-flash', 'big', 'hard');
      await page.getByTestId('difficulty-medium').click();
      const card = page.getByTestId('dice-card');
      await expect(card).toHaveClass(/dice-toss/);
      expect(await style(card, 'animationName')).toBe('none');
      await expect(stage(page)).toHaveAttribute('data-phase', 'flash');
      const dot = page.getByTestId('dice-dot').first();
      await expect(dot).toBeVisible();
      expect(await style(dot, 'animationName')).toBe('dice-dot-fade');
      expect(await style(dot, 'animationDuration')).toBe('0.15s');
    });
  });

  test('easy: dots flash, then three answer buttons appear, and a right tap pays 2 stars', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'little', 'easy');
    await expect(stage(page)).toHaveAttribute('data-flash-ms', '2000');
    // Covered, then flashing: no answer buttons while the dots can be seen.
    await expect(page.getByTestId('dice-option')).toHaveCount(0);
    await expect(stage(page)).toHaveAttribute('data-phase', 'flash');
    await expect(page.getByTestId('dice-dot')).toHaveCount(Number(await stage(page).getAttribute('data-count')));
    await expect(page.getByTestId('dice-option')).toHaveCount(0);

    await waitForAnswer(page);
    await expect(page.getByTestId('dice-dot')).toHaveCount(0);
    await expect(page.getByTestId('dice-option')).toHaveCount(3);
    const options = await page.getByTestId('dice-option').evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-value'))));
    const count = Number(await stage(page).getAttribute('data-count'));
    expect(options.filter((o) => o === count)).toHaveLength(1);
    // Targets are at least 96px.
    for (const box of await page.getByTestId('dice-option').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(96);
    }

    const before = await stars(page);
    await tap(page, count);
    await expect(stage(page)).toHaveAttribute('data-phase', 'right');
    // Right: the dots are shown again, still, in green (the spec keeps this); no dice emoji.
    await expect(page.getByTestId('dice-dot')).toHaveCount(count);
    await expectNoDiceEmoji(page);
    await expect.poll(() => stars(page)).toBe(before + 2);
  });

  test('easy: a miss shows the same dots for 3 s, then asks the same flash again', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'little', 'easy');
    await waitForAnswer(page);
    const count = await stage(page).getAttribute('data-count');
    const layout = await stage(page).getAttribute('data-layout');
    const before = await stars(page);

    await tap(page, await wrongValue(page));
    await expect(stage(page)).toHaveAttribute('data-phase', 'reveal');
    await expect(page.getByTestId('dice-dot')).toHaveCount(Number(count));
    await expect(page.getByTestId('dice-option')).toHaveCount(0);
    await expectNoDiceEmoji(page);
    // Still, not tossed: the card has no motion class and keeps its place while the dots are back.
    await expect(page.getByTestId('dice-card')).not.toHaveClass(/dice-toss/);
    // Still showing the dots two seconds later.
    await page.waitForTimeout(2000);
    await expect(stage(page)).toHaveAttribute('data-phase', 'reveal');

    await waitForAnswer(page);
    await expect(stage(page)).toHaveAttribute('data-count', count!);
    await expect(stage(page)).toHaveAttribute('data-layout', layout!);
    expect(await stars(page)).toBe(before);
  });

  test('medium: four answers and standard die faces', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'big', 'medium');
    await expect(stage(page)).toHaveAttribute('data-flash-ms', '1500');
    await waitForAnswer(page);
    await expect(page.getByTestId('dice-option')).toHaveCount(4);
    const count = Number(await stage(page).getAttribute('data-count'));
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(6);
  });

  test('hard: a miss gives a fresh flash with a different layout, no stars, and keeps the set progress', async ({ page }) => {
    await openGame(page, 'launch-dice-flash', 'big', 'hard');
    await expect(stage(page)).toHaveAttribute('data-flash-ms', '1000');
    await waitForAnswer(page);
    await expect(page.getByTestId('dice-option')).toHaveCount(4);

    // One right answer first: progress 1 of 5.
    const start = await stars(page);
    await tap(page, Number(await stage(page).getAttribute('data-count')));
    await expect(stage(page)).toHaveAttribute('data-progress', '1');
    await expect.poll(() => stars(page)).toBe(start + 4);
    await waitForAnswer(page);

    const layout = await stage(page).getAttribute('data-layout');
    const before = await stars(page);
    await tap(page, await wrongValue(page));
    await expect(stage(page)).toHaveAttribute('data-phase', 'reveal');
    await waitForAnswer(page);
    expect(await stage(page).getAttribute('data-layout')).not.toBe(layout);
    // No stars for the missed flash, and the set is not started over.
    expect(await stars(page)).toBe(before);
    await expect(stage(page)).toHaveAttribute('data-progress', '1');
  });

  test.describe('short phone (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    for (const [band, level] of [['big', 'medium'], ['big', 'hard']] as const) {
      test(`${level}: all four answers are fully on screen and at least 96px`, async ({ page }) => {
        await openGame(page, 'launch-dice-flash', band, level);
        await waitForAnswer(page);
        const options = page.getByTestId('dice-option');
        await expect(options).toHaveCount(4);
        // Let the pop-in animation settle so the boxes are measured at full size.
        await page.waitForTimeout(600);
        const boxes = await options.evaluateAll((els) => els.map((e) => {
          const r = e.getBoundingClientRect();
          return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
        }));
        for (const b of boxes) {
          expect(b.top).toBeGreaterThanOrEqual(0);
          expect(b.bottom).toBeLessThanOrEqual(667);
          expect(b.left).toBeGreaterThanOrEqual(0);
          expect(b.right).toBeLessThanOrEqual(375);
          expect(b.height).toBeGreaterThanOrEqual(96);
          expect(b.width).toBeGreaterThanOrEqual(96);
        }
        // Nothing to scroll to: the page itself does not need scrolling to reach row 2.
        await options.last().click({ trial: true });
      });
    }
  });

  // The whole play area (die card, prompt and every answer) fits without scrolling on small phones.
  for (const phone of [
    { name: 'smallest phone', width: 320, height: 568, minTarget: 72 },
    { name: 'short phone', width: 375, height: 667, minTarget: 96 },
    { name: 'standard phone', width: 390, height: 844, minTarget: 96 },
  ] as const) {
    test.describe(`fit: ${phone.name} (${phone.width}x${phone.height})`, () => {
      test.use({ viewport: { width: phone.width, height: phone.height } });

      for (const [band, level, answers] of [['little', 'easy', 3], ['big', 'medium', 4], ['big', 'hard', 4]] as const) {
        test(`${level}: die card and all ${answers} answers are inside the viewport, no scrolling`, async ({ page }) => {
          await openGame(page, 'launch-dice-flash', band, level);
          // While the dots flash, the card is already fully visible.
          await expect(stage(page)).toHaveAttribute('data-phase', 'flash');
          const inside = async (testId: string, minSize = 0) => {
            const boxes = await page.getByTestId(testId).evaluateAll((els) => els.map((e) => {
              const r = e.getBoundingClientRect();
              return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
            }));
            for (const b of boxes) {
              expect(b.top).toBeGreaterThanOrEqual(0);
              expect(b.bottom).toBeLessThanOrEqual(phone.height);
              expect(b.left).toBeGreaterThanOrEqual(0);
              expect(b.right).toBeLessThanOrEqual(phone.width);
              expect(b.width).toBeGreaterThanOrEqual(minSize);
              expect(b.height).toBeGreaterThanOrEqual(minSize);
            }
            return boxes.length;
          };
          await inside('dice-card');
          await waitForAnswer(page);
          await page.waitForTimeout(600); // let the pop-in animation settle
          await inside('dice-card');
          expect(await inside('dice-option', phone.minTarget)).toBe(answers);
          const overflow = await page.locator('main').evaluate((el) => el.scrollHeight - el.clientHeight);
          expect(overflow).toBeLessThanOrEqual(1);
        });
      }
    });
  }

  test('five right answers finish a set and pay 5 x 2 stars on easy', async ({ page }) => {
    test.setTimeout(60_000);
    await openGame(page, 'launch-dice-flash', 'little', 'easy');
    const before = await stars(page);
    for (let i = 0; i < 5; i++) {
      await waitForAnswer(page);
      await tap(page, Number(await stage(page).getAttribute('data-count')));
    }
    await expect(page.getByTestId('dice-victory')).toBeVisible({ timeout: 10_000 });
    // No die picture at the end of a set: neither the card nor any emoji, just confetti and the victory line.
    await expect(page.getByTestId('dice-card')).toBeHidden();
    await expect(page.getByTestId('dice-dot')).toHaveCount(0);
    await expectNoDiceEmoji(page);
    await expect(stage(page)).toHaveAttribute('data-progress', '5');
    await expect.poll(() => stars(page)).toBe(before + 10);
    // A new set starts on its own.
    await expect(stage(page)).toHaveAttribute('data-progress', '0', { timeout: 10_000 });
  });
});
