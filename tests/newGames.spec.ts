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
    // The crocodile points up (no hint) until the round is solved.
    const croc = page.getByTestId('compare-croc');
    await expect(croc).toHaveAttribute('style', /rotate\(90deg\)/);
    await page.locator(`[data-testid="compare-symbol-option"][data-symbol="${symbol}"]`).click();
    await expect(page.getByTestId('compare-symbol')).toHaveText(symbol!);
    // Then it turns to the bigger side, or keeps pointing up on "=".
    if (symbol === '=') await expect(croc).toHaveAttribute('style', /rotate\(90deg\)/);
    else await expect(croc).not.toHaveAttribute('style', /rotate/);
  });
});

test.describe('Letter Pairs', () => {
  test('letter shapes only: upper → lower, lower → upper, then look-alikes', async ({ page }) => {
    await openGame(page, 'launch-letter-pairs', 'little', 'easy');
    const prompt = page.getByTestId('letter-pairs-prompt');
    await expect(prompt).toHaveText(/^[A-Z]$/);
    const partner = await prompt.getAttribute('data-answer');
    expect(partner).toMatch(/^[a-z]$/);
    await page.locator(`[data-testid="letter-pairs-option"][data-value="${partner}"]`).click();
    await expect(page.locator(`[data-testid="letter-pairs-option"][data-value="${partner}"]`)).toBeDisabled();

    await page.getByTestId('difficulty-medium').click();
    await expect(prompt).toHaveText(/^[a-z]$/);
    const upper = await prompt.getAttribute('data-answer');
    expect(upper).toMatch(/^[A-Z]$/);
    await expect(page.getByTestId('letter-pairs-option')).toHaveText([/^[A-Z]$/, /^[A-Z]$/, /^[A-Z]$/]);

    await openGame(page, 'launch-letter-pairs', 'big', 'hard');
    await expect(page.getByTestId('letter-pairs-option')).toHaveCount(3);
    await expect(prompt).toHaveText(/^[BDPQMNUIL]$/);
    const options = await page.getByTestId('letter-pairs-option').allInnerTexts();
    const answer = await prompt.getAttribute('data-answer');
    const twins: Record<string, string> = { b: 'dpq', d: 'bpq', p: 'bdq', q: 'bdp', m: 'n', n: 'mu', u: 'n', i: 'l', l: 'i' };
    expect(options.some((o) => o !== answer && twins[answer!].includes(o))).toBe(true);
  });
});

test.describe('Letter Pairs in Japanese', () => {
  test('hiragana → katakana, katakana → hiragana, hiragana → romaji', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('lang-dropdown-trigger').click();
    await page.getByTestId('lang-select-ja').click();
    await openGame(page, 'launch-letter-pairs', 'little', 'easy');
    const prompt = page.getByTestId('letter-pairs-prompt');
    await expect(prompt).toHaveText(/^[\u3041-\u3093]$/);
    expect(await prompt.getAttribute('data-answer')).toMatch(/^[\u30a1-\u30f3]$/);
    const answer = await prompt.getAttribute('data-answer');
    await page.locator(`[data-testid="letter-pairs-option"][data-value="${answer}"]`).click();
    await expect(page.locator(`[data-testid="letter-pairs-option"][data-value="${answer}"]`)).toBeDisabled();

    await page.getByTestId('difficulty-medium').click();
    await expect(prompt).toHaveText(/^[\u30a1-\u30f3]$/);
    expect(await prompt.getAttribute('data-answer')).toMatch(/^[\u3041-\u3093]$/);

    await openGame(page, 'launch-letter-pairs', 'big', 'hard');
    await expect(prompt).toHaveText(/^[\u3041-\u3093]$/);
    expect(await prompt.getAttribute('data-answer')).toMatch(/^[a-z]+$/);
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

test.describe('First Sound levels (Missing Letter is its hard level)', () => {
  test('Missing Letter is gone from the menu; First Sound stays school only', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('age-mode-little').click();
    await expect(page.getByTestId('launch-anlaut')).toHaveCount(0);
    await page.getByTestId('age-mode-big').click();
    await expect(page.getByTestId('launch-anlaut')).toBeVisible();
    await expect(page.getByTestId('launch-missing-letter')).toHaveCount(0);
  });

  test('medium keeps the first-letter rounds; hard fills the missing letter', async ({ page }) => {
    await openGame(page, 'launch-anlaut', 'big');
    await expect(page.getByTestId('difficulty-medium')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('difficulty-easy')).toBeDisabled();
    await expect(page.getByTestId('anlaut-option')).toHaveCount(3);
    await expect(page.getByTestId('missing-letter-word')).toHaveCount(0);

    await page.getByTestId('difficulty-hard').click();
    await expect(page.getByTestId('anlaut-option')).toHaveCount(0);
    const word = page.getByTestId('missing-letter-word');
    const answer = await word.getAttribute('data-answer');
    await expect(page.getByTestId('missing-letter-option')).toHaveCount(3);
    await page.locator(`[data-testid="missing-letter-option"][data-value="${answer}"]`).click();
    await expect(page.getByTestId('missing-letter-gap')).toHaveText(answer!);
    await expect(word).toHaveText(await word.getAttribute('data-word') as string);
    // Hard keeps feeding First Sound's own streak keys.
    await expect.poll(() => page.evaluate(() => localStorage.getItem('anlaut_streak'))).toBe('1');

    await page.getByTestId('difficulty-medium').click();
    await expect(page.getByTestId('anlaut-option')).toHaveCount(3);
  });

  test('hard: a wrong letter moves on to a new word', async ({ page }) => {
    await openGame(page, 'launch-anlaut', 'big', 'hard');
    const word = page.getByTestId('missing-letter-word');
    const before = `${await word.getAttribute('data-word')}|${await word.getAttribute('data-answer')}`;
    const answer = await word.getAttribute('data-answer');
    await page.locator(`[data-testid="missing-letter-option"]:not([data-value="${answer}"])`).first().click();
    await expect.poll(async () => `${await word.getAttribute('data-word')}|${await word.getAttribute('data-answer')}`).not.toBe(before);
  });
});
