import { test, expect, type Page } from '@playwright/test';
import { openGame } from './ageLevels';

async function stars(page: Page) {
  return Number((await page.getByTestId('stars-total').innerText()).replace(/\D/g, '') || '0');
}

const stage = (page: Page) => page.getByTestId('simon-stage');
const animal = (page: Page, i: number) => page.locator(`[data-testid="simon-animal"][data-animal="${i}"]`);

async function waitForTurn(page: Page) {
  await expect(stage(page)).toHaveAttribute('data-phase', 'turn', { timeout: 20_000 });
}

async function sequence(page: Page) {
  return (await stage(page).getAttribute('data-sequence'))!.split(',').map(Number);
}

/** Tap the whole current sequence back. */
async function repeat(page: Page) {
  for (const a of await sequence(page)) await animal(page, a).click();
}

/** An animal that is not the next one in the sequence. */
async function wrongAnimal(page: Page) {
  const seq = await sequence(page);
  const input = Number(await stage(page).getAttribute('data-input'));
  return (seq[input] + 1) % 4;
}

test.describe('Simon Lights', () => {
  test('easy: always 4 big animals, watch then your turn, and taps are ignored while watching', async ({ page }) => {
    await openGame(page, 'launch-simon-lights', 'little', 'easy');
    await expect(page.getByTestId('simon-animal')).toHaveCount(4);
    for (const h of await page.getByTestId('simon-animal').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(h).toBeGreaterThanOrEqual(96);
    }
    // Easy starts at 2 steps. The watch state is its own banner state.
    await expect(stage(page)).toHaveAttribute('data-length', '2');
    await expect(stage(page)).toHaveAttribute('data-phase', 'watch');
    await expect(page.getByTestId('simon-banner')).toHaveAttribute('data-state', 'watch');
    // At least one animal glows while the sequence plays.
    await expect(page.locator('[data-testid="simon-animal"][data-lit="true"]').first()).toBeVisible();

    // Taps do nothing while watching.
    await animal(page, 0).click({ force: true });
    await animal(page, 1).click({ force: true });
    await expect(stage(page)).toHaveAttribute('data-input', '0');
    await expect(stage(page)).toHaveAttribute('data-phase', 'watch');

    await waitForTurn(page);
    await expect(page.getByTestId('simon-banner')).toHaveAttribute('data-state', 'turn');
  });

  test('easy: a whole run grows 2, 3, 4 steps and pays 2 stars, in under a minute', async ({ page }) => {
    test.setTimeout(60_000);
    await openGame(page, 'launch-simon-lights', 'little', 'easy');
    const before = await stars(page);
    const started = Date.now();
    for (const length of [2, 3, 4]) {
      await waitForTurn(page);
      await expect(stage(page)).toHaveAttribute('data-length', String(length));
      await repeat(page);
    }
    await expect(stage(page)).toHaveAttribute('data-phase', 'complete');
    expect(Date.now() - started).toBeLessThan(60_000);
    await expect.poll(() => stars(page)).toBe(before + 2);
    // A new run starts over at 2 steps.
    await expect(stage(page)).toHaveAttribute('data-length', '2', { timeout: 10_000 });
  });

  test('easy: a miss replays the same sequence slowly; two misses on a step highlight the right animal', async ({ page }) => {
    await openGame(page, 'launch-simon-lights', 'little', 'easy');
    await waitForTurn(page);
    const seq = await sequence(page);
    const before = await stars(page);

    // Miss on step 0, twice.
    for (let miss = 1; miss <= 2; miss++) {
      await animal(page, await wrongAnimal(page)).click();
      await expect(stage(page)).toHaveAttribute('data-phase', 'miss');
      await expect(stage(page)).toHaveAttribute('data-misses', String(miss));
      await expect(stage(page)).toHaveAttribute('data-phase', 'watch', { timeout: 5_000 });
      await expect(stage(page)).toHaveAttribute('data-speed', 'replay');
      expect(await sequence(page)).toEqual(seq);
      await waitForTurn(page);
    }
    // The next correct animal is highlighted and only that one.
    await expect(animal(page, seq[0])).toHaveAttribute('data-hint', 'true');
    await expect(page.locator('[data-testid="simon-animal"][data-hint="true"]')).toHaveCount(1);
    await repeat(page);
    expect(await stars(page)).toBe(before);
  });

  test('medium starts at 3 steps with the same four animals', async ({ page }) => {
    await openGame(page, 'launch-simon-lights', 'big', 'medium');
    await expect(page.getByTestId('simon-animal')).toHaveCount(4);
    await expect(stage(page)).toHaveAttribute('data-length', '3');
    await expect(stage(page)).toHaveAttribute('data-speed', 'medium');
  });

  test('hard: a miss starts a new sequence of the same length, no stars, no game over', async ({ page }) => {
    await openGame(page, 'launch-simon-lights', 'big', 'hard');
    await expect(page.getByTestId('simon-animal')).toHaveCount(4);
    await expect(stage(page)).toHaveAttribute('data-length', '4');
    await waitForTurn(page);
    const seq = await sequence(page);
    const before = await stars(page);

    await animal(page, await wrongAnimal(page)).click();
    await expect(stage(page)).toHaveAttribute('data-phase', 'miss');
    await expect(stage(page)).toHaveAttribute('data-phase', 'watch', { timeout: 5_000 });
    await expect(stage(page)).toHaveAttribute('data-length', '4');
    await expect(stage(page)).toHaveAttribute('data-speed', 'hard');
    expect(await sequence(page)).not.toEqual(seq);
    await waitForTurn(page);
    expect(await stars(page)).toBe(before);
  });

  test('hard: a whole run grows 4 to 8 steps and pays 10 stars', async ({ page }) => {
    test.setTimeout(120_000);
    await openGame(page, 'launch-simon-lights', 'big', 'hard');
    const before = await stars(page);
    for (const length of [4, 5, 6, 7, 8]) {
      await waitForTurn(page);
      await expect(stage(page)).toHaveAttribute('data-length', String(length));
      await repeat(page);
    }
    await expect(stage(page)).toHaveAttribute('data-phase', 'complete');
    await expect.poll(() => stars(page)).toBe(before + 10);
  });

  test('tapping the same animal twice quickly restarts its glow instead of reusing the first one', async ({ page }) => {
    await openGame(page, 'launch-simon-lights', 'big', 'medium');
    // Switch levels until the sequence starts with the same animal twice (only the data attribute is needed). Medium and hard have 3+ steps, so two taps do not finish the run.
    for (let i = 0; i < 40; i++) {
      const seq = await sequence(page);
      if (seq[0] === seq[1]) break;
      await page.getByTestId(i % 2 === 0 ? 'difficulty-hard' : 'difficulty-medium').click();
    }
    const seq = await sequence(page);
    test.skip(seq[0] !== seq[1], 'no sequence with a leading double came up');
    await waitForTurn(page);

    const tile = animal(page, seq[0]);
    await tile.click();
    await expect(tile).toHaveAttribute('data-lit', 'true');
    const firstTile = await tile.elementHandle();
    await tile.click();
    // The second tap counted, and the tile was re-mounted, so the bounce animation starts over.
    await expect(stage(page)).toHaveAttribute('data-input', '2');
    expect(await firstTile!.evaluate((el) => el.isConnected)).toBe(false);
    await expect(tile).toHaveAttribute('data-lit', 'true');
  });
});
