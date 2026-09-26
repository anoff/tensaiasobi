import { describe, expect, it } from 'vitest';
import {
  areCharsCompatible,
  getEndChar,
  getStartChar,
  generateOptionsForWord,
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
