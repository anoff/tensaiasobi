import { describe, expect, it } from 'vitest';
import {
  areCharsCompatible,
  getEndChar,
  getStartChar,
  generateOptionsForWord,
  SHIRITORI_LEVELS,
  showShiritoriLabels,
} from './shiritoriLogic';

describe('shiritori character matching', () => {
  it('matches Latin letters case-insensitively after cleaning', () => {
    expect(getStartChar('Apple', 'en')).toBe('A');
    expect(getEndChar('Apple', 'en')).toBe('E');
    expect(areCharsCompatible('E', 'e', 'en')).toBe(true);
  });

  it('strips French accents and ligatures', () => {
    expect(getStartChar('Éléphant', 'fr')).toBe('E');
    expect(getEndChar('œuf', 'fr')).toBe('F');
  });

  it('maps Japanese small kana and long vowels, and treats dakuten as compatible', () => {
    expect(getEndChar('コーヒー', 'ja')).toBe('ヒ');
    expect(getEndChar('にゃ', 'ja')).toBe('や');
    expect(areCharsCompatible('か', 'が', 'ja')).toBe(true);
    expect(areCharsCompatible('は', 'ぱ', 'ja')).toBe(true);
  });

  it('uses Hangul first and last characters as-is', () => {
    expect(getStartChar('사과', 'ko')).toBe('사');
    expect(getEndChar('사과', 'ko')).toBe('과');
  });

  it('generateOptionsForWord returns a matching continuation when the dictionary allows it', () => {
    const dict = { '🍎': 'apple', '🐘': 'elephant', '🐕': 'dog', '🐈': 'cat' };
    const result = generateOptionsForWord('🍎', ['🍎'], 'en', dict);
    expect(result.isGameOver).toBeUndefined();
    expect(result.options.length).toBeGreaterThan(0);
    const starts = result.options.map((emoji) => getStartChar(dict[emoji as keyof typeof dict] ?? '', 'en'));
    expect(starts).toContain('E');
  });
});

describe('Word Chain level labels', () => {
  it('shows words always on easy, after a miss on medium, never on hard', () => {
    expect(SHIRITORI_LEVELS.easy).toEqual({ options: 3, labels: 'always' });
    expect(SHIRITORI_LEVELS.medium).toEqual({ options: 4, labels: 'afterMiss' });
    expect(SHIRITORI_LEVELS.hard).toEqual({ options: 6, labels: 'never' });
  });

  it('showShiritoriLabels reveals medium words only after a miss', () => {
    const show = (level: keyof typeof SHIRITORI_LEVELS, missed: boolean) =>
      showShiritoriLabels(SHIRITORI_LEVELS[level].labels, missed);
    expect(show('easy', false)).toBe(true);
    expect(show('easy', true)).toBe(true);
    expect(show('medium', false)).toBe(false);
    expect(show('medium', true)).toBe(true);
    expect(show('hard', false)).toBe(false);
    expect(show('hard', true)).toBe(false);
  });
});
