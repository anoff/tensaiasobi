import { test, expect } from '@playwright/test';
import { generateRound } from '../src/utils/fairSharePicnic';
import type { GameDifficulty } from '../src/types/game';

const ITERATIONS = 500;

test.describe('Fair Share Picnic round generator', () => {
  test('easy rounds always split evenly between exactly 2 friends (2-6 snacks)', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const round = generateRound('easy');
      expect(round.friends).toBe(2);
      expect(round.hasLeftover).toBe(false);
      expect(round.leftoverCount).toBe(0);
      expect(round.totalSnacks).toBeGreaterThanOrEqual(2);
      expect(round.totalSnacks).toBeLessThanOrEqual(6);
      expect(round.totalSnacks % round.friends).toBe(0);
      expect(round.totalSnacks / round.friends).toBe(round.perFriend);
    }
  });

  test('medium rounds always split evenly between 2-3 friends (up to 12 snacks)', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const round = generateRound('medium');
      expect([2, 3]).toContain(round.friends);
      expect(round.hasLeftover).toBe(false);
      expect(round.leftoverCount).toBe(0);
      expect(round.totalSnacks).toBeLessThanOrEqual(12);
      expect(round.totalSnacks % round.friends).toBe(0);
      expect(round.totalSnacks / round.friends).toBe(round.perFriend);
    }
  });

  test('hard rounds always split evenly between 3-4 friends (up to 20 snacks), leftovers are intentional', () => {
    let sawLeftover = false;
    let sawNoLeftover = false;

    for (let i = 0; i < ITERATIONS; i++) {
      const round = generateRound('hard');
      expect([3, 4]).toContain(round.friends);
      expect(round.totalSnacks).toBeLessThanOrEqual(20);
      expect(round.perFriend).toBeGreaterThan(0);

      // The friend-shareable portion of the snacks (total minus any
      // intentional leftover) must always be a whole-number multiple of the
      // friend count.
      const shareable = round.totalSnacks - round.leftoverCount;
      expect(shareable % round.friends).toBe(0);
      expect(shareable / round.friends).toBe(round.perFriend);

      if (round.hasLeftover) {
        sawLeftover = true;
        // A genuine leftover must be a positive amount smaller than the
        // number of friends (otherwise it could be shared evenly too).
        expect(round.leftoverCount).toBeGreaterThan(0);
        expect(round.leftoverCount).toBeLessThan(round.friends);
      } else {
        sawNoLeftover = true;
        expect(round.leftoverCount).toBe(0);
      }
    }

    // Sanity check that both leftover and non-leftover hard rounds occur.
    expect(sawLeftover).toBe(true);
    expect(sawNoLeftover).toBe(true);
  });

  test('every difficulty produces a positive per-friend share and snack emoji', () => {
    const difficulties: GameDifficulty[] = ['easy', 'medium', 'hard'];
    for (const difficulty of difficulties) {
      for (let i = 0; i < 50; i++) {
        const round = generateRound(difficulty);
        expect(round.perFriend).toBeGreaterThan(0);
        expect(round.snackEmoji.length).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('Fair Share Picnic E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Verify launcher, difficulty selector, and basic game elements', async ({ page }) => {
    const launcher = page.getByTestId('launch-fair-share-picnic');
    await expect(launcher).toBeVisible();
    await launcher.click();

    await expect(page.getByTestId('difficulty-easy')).toBeVisible();
    await expect(page.getByTestId('difficulty-medium')).toBeVisible();
    await expect(page.getByTestId('difficulty-hard')).toBeVisible();

    // Easy mode always has exactly 2 plates.
    const plates = page.getByTestId('picnic-plate');
    await expect(plates).toHaveCount(2);
    await expect(page.getByTestId('picnic-basket')).toBeVisible();
  });

  test('Verify plates are at least 96px', async ({ page }) => {
    const launcher = page.getByTestId('launch-fair-share-picnic');
    await launcher.click();

    const plates = page.getByTestId('picnic-plate');
    const count = await plates.count();
    for (let i = 0; i < count; i++) {
      const box = await plates.nth(i).boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(96);
        expect(box.height).toBeGreaterThanOrEqual(96);
      }
    }
  });

  test('Verify a snack can be dragged from the basket to a plate', async ({ page }) => {
    const launcher = page.getByTestId('launch-fair-share-picnic');
    await launcher.click();

    const snack = page.getByTestId('picnic-snack').first();
    await expect(snack).toBeVisible();

    const plate = page.getByTestId('picnic-plate').first();
    await snack.dragTo(plate);

    // The plate should now contain at least one snack.
    await expect(plate.getByTestId('picnic-snack')).toHaveCount(1);
  });
});
