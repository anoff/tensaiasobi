import { describe, expect, it } from 'vitest';
import type { GameDifficulty } from '../types/game';
import { en } from '../locales/en';
import { de } from '../locales/de';
import { fr } from '../locales/fr';
import { ja } from '../locales/ja';
import { ko } from '../locales/ko';
import { COMPARE_MAX, generateCompareRound, symbolFor } from './crocodileCompareLogic';
import { JA_EASY_PICTURES, generateLetterPairsRound, startLetter, toKatakana, toRomaji } from './letterPairsLogic';
import { generatePatternRound } from './patternTrainLogic';
import { generateMissingLetterRound, missingLetterCandidates } from './missingLetterLogic';
import { SYLLABLE_RANGE, SYLLABLE_WORDS, generateSyllableRound, splitMorae, syllableWords } from './syllableDrumLogic';

const LEVELS: GameDifficulty[] = ['easy', 'medium', 'hard'];
const DICTS = { en, de, fr, ja, ko } as const;
const items = (lang: keyof typeof DICTS) => DICTS[lang].anlautGame.items as Record<string, string>;

describe('Crocodile Compare', () => {
  it('easy/medium never tie, stay in range, and name the bigger side', () => {
    for (const level of ['easy', 'medium'] as const) {
      for (let i = 0; i < 300; i++) {
        const r = generateCompareRound(level);
        expect(r.left.value).not.toBe(r.right.value);
        expect(Math.max(r.left.value, r.right.value)).toBeLessThanOrEqual(COMPARE_MAX[level]);
        expect(Math.min(r.left.value, r.right.value)).toBeGreaterThanOrEqual(1);
        expect(r.bigger).toBe(r.left.value > r.right.value ? 'left' : 'right');
      }
    }
  });

  it('hard uses all three symbols and sums add up', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const r = generateCompareRound('hard');
      seen.add(r.symbol);
      expect(r.symbol).toBe(symbolFor(r.left.value, r.right.value));
      for (const side of [r.left, r.right]) {
        expect(side.value).toBeGreaterThanOrEqual(1);
        expect(side.value).toBeLessThanOrEqual(99);
        if (side.addends) expect(side.addends[0] + side.addends[1]).toBe(side.value);
      }
    }
    expect([...seen].sort()).toEqual(['<', '=', '>']);
  });
});

describe('Letter Pairs', () => {
  it('maps hiragana to katakana', () => {
    expect(toKatakana('あ')).toBe('ア');
    expect(toKatakana('ね')).toBe('ネ');
  });

  it('always offers three distinct options containing the answer', () => {
    for (const lang of ['en', 'de', 'fr', 'ko'] as const) {
      for (const level of LEVELS) {
        for (let i = 0; i < 50; i++) {
          const r = generateLetterPairsRound(level, lang, items(lang));
          expect(r.options).toHaveLength(3);
          expect(new Set(r.options).size).toBe(3);
          expect(r.options).toContain(r.answer);
          if (level === 'easy') expect(r.answer).toBe(r.prompt);
          if (level === 'hard') {
            expect(r.kind).toBe('picture');
            expect(startLetter(items(lang)[r.answer], lang)).toBe(r.prompt);
            for (const o of r.options.filter((o) => o !== r.answer)) {
              expect(startLetter(items(lang)[o], lang)).not.toBe(r.prompt);
            }
          }
        }
      }
    }
  });

  it('Japanese: picture → first hiragana, hiragana → katakana, hiragana → romaji', () => {
    for (const emoji of JA_EASY_PICTURES) {
      expect(items('ja')[emoji], emoji).toMatch(/^[あ-わ]/);
    }
    for (let i = 0; i < 100; i++) {
      const easy = generateLetterPairsRound('easy', 'ja', items('ja'));
      expect(easy.promptKind).toBe('picture');
      expect(JA_EASY_PICTURES).toContain(easy.prompt);
      expect(easy.answer).toBe(items('ja')[easy.prompt][0]);
      expect(easy.word).toBe(items('ja')[easy.prompt]);

      const medium = generateLetterPairsRound('medium', 'ja', items('ja'));
      expect(medium.answer).toBe(toKatakana(medium.prompt));

      const hard = generateLetterPairsRound('hard', 'ja', items('ja'));
      expect(hard.answer).toBe(toRomaji(hard.prompt));
      expect(hard.answer).toMatch(/^[a-z]+$/);

      for (const r of [easy, medium, hard]) {
        expect(r.options).toHaveLength(3);
        expect(new Set(r.options).size).toBe(3);
        expect(r.options).toContain(r.answer);
      }
    }
    expect(toRomaji('し')).toBe('shi');
    expect(toRomaji('つ')).toBe('tsu');
  });
});

describe('Pattern Train', () => {
  it('the answer continues the pattern and appears once among the options', () => {
    for (const level of LEVELS) {
      for (let i = 0; i < 200; i++) {
        const r = generatePatternRound(level);
        expect(r.wagons[r.gapIndex]).toBe(r.answer);
        expect(r.options.filter((o) => o === r.answer)).toHaveLength(1);
        expect(new Set(r.options).size).toBe(r.options.length);
        expect(r.options).toHaveLength(level === 'hard' ? 4 : 3);
        if (level !== 'hard') expect(r.gapIndex).toBe(r.wagons.length - 1);
      }
    }
  });
});

describe('Missing Letter', () => {
  it('has words for every language and level, and the gap is answerable', () => {
    for (const lang of Object.keys(DICTS) as Array<keyof typeof DICTS>) {
      for (const level of LEVELS) {
        expect(missingLetterCandidates(level, lang, items(lang)).length).toBeGreaterThan(5);
        for (let i = 0; i < 50; i++) {
          const r = generateMissingLetterRound(level, lang, items(lang))!;
          expect([...r.word][r.gapIndex]).toBe(r.answer);
          expect(r.options).toContain(r.answer);
          expect(new Set(r.options).size).toBe(r.options.length);
          expect(r.options).toHaveLength(level === 'hard' ? 4 : 3);
          if (level === 'easy') expect(r.gapIndex).toBe(0);
        }
      }
    }
  });
});

describe('Syllable Drum', () => {
  it('counts Japanese morae the way children clap them', () => {
    expect(splitMorae('ぺんぎん')).toHaveLength(4);
    expect(splitMorae('けーき')).toHaveLength(3);
    expect(splitMorae('ちょうちょ')).toEqual(['ちょ', 'う', 'ちょ']);
  });

  it('hand-split words only use emojis from the picture dictionary', () => {
    for (const lang of ['en', 'de', 'fr'] as const) {
      for (const emoji of Object.keys(SYLLABLE_WORDS[lang])) {
        expect(items(lang)[emoji], `${lang} ${emoji}`).toBeDefined();
      }
    }
  });

  it('never repeats a word twice in a row, and a lone short word stays rare (Japanese き)', () => {
    for (const lang of Object.keys(DICTS) as Array<keyof typeof DICTS>) {
      let previous: string | undefined;
      for (let i = 0; i < 300; i++) {
        const r = generateSyllableRound('easy', lang, items(lang), previous);
        expect(r.emoji).not.toBe(previous);
        previous = r.emoji;
      }
    }
    let tree = 0;
    let previous: string | undefined;
    for (let i = 0; i < 1000; i++) {
      const r = generateSyllableRound('easy', 'ja', items('ja'), previous);
      if (r.emoji === '🌲') tree++;
      previous = r.emoji;
    }
    expect(tree).toBeLessThan(200);
  });

  it('every level has words in every language and respects its range', () => {
    for (const lang of Object.keys(DICTS) as Array<keyof typeof DICTS>) {
      expect(syllableWords(lang, items(lang)).length).toBeGreaterThan(20);
      for (const level of LEVELS) {
        const [min, max] = SYLLABLE_RANGE[level];
        for (let i = 0; i < 50; i++) {
          const r = generateSyllableRound(level, lang, items(lang));
          expect(r.parts.length).toBeGreaterThanOrEqual(min);
          expect(r.parts.length).toBeLessThanOrEqual(max);
        }
      }
    }
  });
});
