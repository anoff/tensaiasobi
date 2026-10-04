import { test, expect, type Page } from '@playwright/test';
import { openGame } from './ageLevels';
import { hasTrait, type Trait } from '../src/games/animalGenieLogic';

/** Answer every question truthfully for `secret` until the genie guesses. */
async function answerUntilGuess(page: Page, secret: string) {
  const stage = page.getByTestId('genie-stage');
  for (let i = 0; i < 20; i++) {
    const phase = await stage.getAttribute('data-phase');
    if (phase !== 'ask') return phase;
    const trait = (await page.getByTestId('genie-question').getAttribute('data-trait')) as Trait;
    const count = await page.getByTestId('genie-question-count').innerText();
    await page.getByTestId(hasTrait(secret, trait) ? 'genie-yes' : 'genie-no').click();
    await expect(page.getByTestId('genie-question-count')).not.toHaveText(count).catch(() => undefined);
  }
  return stage.getAttribute('data-phase');
}

test.describe('Animal Genie', () => {
  test('finds the animal from truthful answers, fading out the others on easy', async ({ page }) => {
    await openGame(page, 'launch-animal-genie', 'little', 'easy');
    await expect(page.getByTestId('genie-animal')).toHaveCount(10);
    await page.getByTestId('genie-ready').click();

    const secret = '🐄';
    const firstTrait = (await page.getByTestId('genie-question').getAttribute('data-trait')) as Trait;
    await page.getByTestId(hasTrait(secret, firstTrait) ? 'genie-yes' : 'genie-no').click();
    // Animals that no longer fit fade out; the secret stays in.
    await expect(page.locator('[data-testid="genie-animal"][data-out="true"]').first()).toBeVisible();
    await expect(page.locator(`[data-testid="genie-animal"][data-animal="${secret}"]`)).toHaveAttribute('data-out', 'false');

    expect(await answerUntilGuess(page, secret)).toBe('guess');
    await expect(page.getByTestId('genie-guess')).toHaveAttribute('data-animal', secret);
    await page.getByTestId('genie-guess-yes').click();
    await expect(page.getByTestId('genie-stage')).toHaveAttribute('data-phase', 'found');
    await page.getByTestId('genie-again').click();
    await expect(page.getByTestId('genie-stage')).toHaveAttribute('data-phase', 'think');
  });

  test('after three wrong guesses the child wins and shows their animal', async ({ page }) => {
    await openGame(page, 'launch-animal-genie', 'big', 'hard');
    // Hard keeps the field hidden while asking.
    await page.getByTestId('genie-ready').click();
    await expect(page.getByTestId('genie-animal')).toHaveCount(0);

    for (let round = 0; round < 3; round++) {
      // Always "not sure" — the genie has to guess blind and keeps missing.
      while ((await page.getByTestId('genie-stage').getAttribute('data-phase')) === 'ask') {
        await page.getByTestId('genie-unsure').click();
      }
      await expect(page.getByTestId('genie-stage')).toHaveAttribute('data-phase', 'guess');
      await page.getByTestId('genie-guess-no').click();
    }
    await expect(page.getByTestId('genie-stage')).toHaveAttribute('data-phase', 'stumped');
    await page.locator('[data-testid="genie-animal"][data-animal="🐙"]').click();
    await expect(page.getByTestId('genie-stage')).toHaveAttribute('data-phase', 'revealed');
  });
});
