import { test, expect, type Page } from '@playwright/test';
import { openGame } from './ageLevels';

async function stars(page: Page) {
  return Number((await page.getByTestId('stars-total').innerText()).replace(/\D/g, '') || '0');
}

test.describe('Crocodile Compare', () => {
  test('easy: tapping the bigger fruit group earns a star', async ({ page }) => {
    await openGame(page, 'launch-crocodile-compare', 'little', 'easy');
    const bigger = await page.getByTestId('compare-stage').getAttribute('data-bigger');
    const smaller = bigger === 'left' ? 'right' : 'left';
    await page.getByTestId(`compare-${smaller}`).click();
    await expect(page.getByTestId(`compare-${smaller}`)).toHaveClass(/animate-shake/);
    await expect(page.getByTestId(`compare-${smaller}`)).not.toHaveClass(/animate-shake/);
    await page.getByTestId(`compare-${bigger}`).click();
    await expect(page.getByTestId('compare-symbol')).toHaveText(/[<>]/);
  });

  test('hard: pick the right symbol, equality included', async ({ page }) => {
    await openGame(page, 'launch-crocodile-compare', 'big', 'hard');
    await expect(page.getByTestId('compare-symbol-option')).toHaveCount(3);
    const symbol = await page.getByTestId('compare-stage').getAttribute('data-symbol');
    await page.locator(`[data-testid="compare-symbol-option"][data-symbol="${symbol}"]`).click();
    await expect(page.getByTestId('compare-symbol')).toHaveText(symbol!);
  });
});

test.describe('Letter Pairs', () => {
  test('easy finds the same letter, medium the partner, hard a picture', async ({ page }) => {
    await openGame(page, 'launch-letter-pairs', 'little', 'easy');
    const prompt = page.getByTestId('letter-pairs-prompt');
    const answer = await prompt.getAttribute('data-answer');
    expect(answer).toBe((await prompt.innerText()).trim());
    await page.locator(`[data-testid="letter-pairs-option"][data-value="${answer}"]`).click();

    await page.getByTestId('difficulty-medium').click();
    const partner = await page.getByTestId('letter-pairs-prompt').getAttribute('data-answer');
    expect(partner).toBe(partner!.toLowerCase());
    await page.locator(`[data-testid="letter-pairs-option"][data-value="${partner}"]`).click();
    await expect(page.locator(`[data-testid="letter-pairs-option"][data-value="${partner}"]`)).toBeDisabled();

    await openGame(page, 'launch-letter-pairs', 'big', 'hard');
    await expect(page.getByTestId('letter-pairs-option')).toHaveCount(3);
  });
});

test.describe('Letter Pairs in Japanese', () => {
  test('easy shows a picture and reveals its word; hard asks for romaji', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('lang-dropdown-trigger').click();
    await page.getByTestId('lang-select-ja').click();
    await openGame(page, 'launch-letter-pairs', 'little', 'easy');
    const prompt = page.getByTestId('letter-pairs-prompt');
    await expect(prompt).toHaveAttribute('data-prompt-kind', 'picture');
    const answer = await prompt.getAttribute('data-answer');
    await page.locator(`[data-testid="letter-pairs-option"][data-value="${answer}"]`).click();
    await expect(page.getByTestId('letter-pairs-word')).toContainText(answer!);

    await openGame(page, 'launch-letter-pairs', 'big', 'hard');
    expect(await page.getByTestId('letter-pairs-prompt').getAttribute('data-answer')).toMatch(/^[a-z]+$/);
  });
});

test.describe('Pattern Train', () => {
  test('tapping the missing wagon fills the gap', async ({ page }) => {
    await openGame(page, 'launch-pattern-train', 'little', 'easy');
    const answer = await page.getByTestId('pattern-stage').getAttribute('data-answer');
    await expect(page.getByTestId('pattern-gap')).toHaveText('?');
    await page.locator(`[data-testid="pattern-option"][data-value="${answer}"]`).click();
    await expect(page.getByTestId('pattern-gap')).toHaveText(answer!);
  });

  test('hard offers four wagons', async ({ page }) => {
    await openGame(page, 'launch-pattern-train', 'big', 'hard');
    await expect(page.getByTestId('pattern-option')).toHaveCount(4);
  });
});

test.describe('Syllable Drum', () => {
  test('drumming the right number of beats solves the word', async ({ page }) => {
    await openGame(page, 'launch-syllable-drum', 'little', 'easy');
    const before = await stars(page);
    const count = Number(await page.getByTestId('syllable-stage').getAttribute('data-syllables'));
    for (let i = 0; i < count; i++) await page.getByTestId('syllable-drum').click();
    await expect(page.getByTestId('syllable-beats')).toHaveAttribute('data-beats', String(count));
    await page.getByTestId('syllable-check').click();
    await expect(page.getByTestId('syllable-word')).toBeVisible();
    await expect.poll(() => stars(page)).toBeGreaterThan(before);
  });

  test('help shrinks with the level: split word, whole word, picture only', async ({ page }) => {
    await openGame(page, 'launch-syllable-drum', 'little', 'easy');
    const count = Number(await page.getByTestId('syllable-stage').getAttribute('data-syllables'));
    await expect(page.getByTestId('syllable-part')).toHaveCount(count);

    await page.getByTestId('difficulty-medium').click();
    await expect(page.getByTestId('syllable-word')).toBeVisible();
    await expect(page.getByTestId('syllable-part')).toHaveCount(0);

    await openGame(page, 'launch-syllable-drum', 'big', 'hard');
    await expect(page.getByTestId('syllable-word')).toHaveCount(0);
  });

  test('a wrong count on medium clears the beats and shows the hint', async ({ page }) => {
    await openGame(page, 'launch-syllable-drum', 'little', 'medium');
    const count = Number(await page.getByTestId('syllable-stage').getAttribute('data-syllables'));
    for (let i = 0; i < count + 1; i++) await page.getByTestId('syllable-drum').click();
    await page.getByTestId('syllable-check').click();
    await expect(page.getByTestId('syllable-beats')).toHaveAttribute('data-beats', '0');
    await expect(page.getByTestId('syllable-beats').locator('span')).toHaveCount(count);
  });
});

test.describe('Missing Letter', () => {
  test('school only; picking the missing letter completes the word', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await expect(page.getByTestId('launch-missing-letter')).toHaveCount(0);

    await openGame(page, 'launch-missing-letter', 'big', 'medium');
    const word = page.getByTestId('missing-letter-word');
    const answer = await word.getAttribute('data-answer');
    await expect(page.getByTestId('missing-letter-option')).toHaveCount(3);
    await page.locator(`[data-testid="missing-letter-option"][data-value="${answer}"]`).click();
    await expect(page.getByTestId('missing-letter-gap')).toHaveText(answer!);
    await expect(word).toHaveText(await word.getAttribute('data-word') as string);
  });

  test('hard offers four letters', async ({ page }) => {
    await openGame(page, 'launch-missing-letter', 'big', 'hard');
    await expect(page.getByTestId('missing-letter-option')).toHaveCount(4);
  });
});
