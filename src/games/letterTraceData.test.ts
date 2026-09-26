import { describe, expect, it } from 'vitest';
import { LEVEL_DATA, LEVELS_BY_LANGUAGE, type LetterLevel } from './letterTraceData';

describe('letterTraceData', () => {
  it('has at least one letter with strokes for every level', () => {
    const levels: LetterLevel[] = ['latin', 'hiragana', 'katakana', 'hangul'];
    for (const level of levels) {
      expect(LEVEL_DATA[level].length).toBeGreaterThan(0);
      expect(LEVEL_DATA[level].every((letter) => letter.strokes.length > 0)).toBe(true);
      expect(LEVEL_DATA[level].every((letter) => letter.strokes.every((s) => s.points.length >= 2))).toBe(true);
    }
  });

  it('maps each language to scripts that exist in LEVEL_DATA', () => {
    for (const levels of Object.values(LEVELS_BY_LANGUAGE)) {
      expect(levels.length).toBeGreaterThan(0);
      for (const level of levels) {
        expect(LEVEL_DATA[level].length).toBeGreaterThan(0);
      }
    }
  });
});
