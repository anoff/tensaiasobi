import { describe, expect, it } from 'vitest';
import type { GameDifficulty } from '../types/game';
import { seededRand } from '../utils/random';
import { en } from '../locales/en';
import { de } from '../locales/de';
import { fr } from '../locales/fr';
import { ja } from '../locales/ja';
import { ko } from '../locales/ko';
import { COMPARE_MAX, generateCompareRound, symbolFor } from './crocodileCompareLogic';
import { LOOK_ALIKES, generateLetterPairsRound, toKatakana, toRomaji, type LetterPairsRound } from './letterPairsLogic';
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
  const LATIN_LANGS = ['en', 'de', 'fr'] as const;
  const HIRAGANA_RE = /^[\u3041-\u3093]$/;
  const KATAKANA_RE = /^[\u30a1-\u30f3]$/;

  /** Every round: three distinct letter bubbles, one of them the answer, and never a picture. */
  function expectLetterRound(r: LetterPairsRound) {
    expect(r.options).toHaveLength(3);
    expect(new Set(r.options).size).toBe(3);
    expect(r.options).toContain(r.answer);
    expect(Object.keys(r)).toEqual(['prompt', 'answer', 'options']);
    for (const shown of [r.prompt, ...r.options]) {
      expect(Object.keys(en.anlautGame.items)).not.toContain(shown);
      expect(shown).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  }

  it('maps hiragana to katakana and romaji', () => {
    expect(toKatakana('あ')).toBe('ア');
    expect(toKatakana('ね')).toBe('ネ');
    expect(toRomaji('し')).toBe('shi');
    expect(toRomaji('つ')).toBe('tsu');
  });

  it('Latin easy: upper → lower case', () => {
    for (const lang of LATIN_LANGS) {
      for (let i = 0; i < 200; i++) {
        const r = generateLetterPairsRound('easy', lang);
        expectLetterRound(r);
        expect(r.prompt).toMatch(/^[A-Z]$/);
        expect(r.answer).toBe(r.prompt.toLowerCase());
        for (const o of r.options) expect(o).toMatch(/^[a-z]$/);
      }
    }
  });

  it('Latin medium: lower → upper case', () => {
    for (const lang of LATIN_LANGS) {
      for (let i = 0; i < 200; i++) {
        const r = generateLetterPairsRound('medium', lang);
        expectLetterRound(r);
        expect(r.prompt).toMatch(/^[a-z]$/);
        expect(r.answer).toBe(r.prompt.toUpperCase());
        for (const o of r.options) expect(o).toMatch(/^[A-Z]$/);
      }
    }
  });

  it('Latin hard: upper → lower case against its look-alikes (b/d/p/q, m/n, u/n, i/l)', () => {
    expect(LOOK_ALIKES).toEqual({
      b: ['d', 'p', 'q'], d: ['b', 'p', 'q'], p: ['b', 'd', 'q'], q: ['b', 'd', 'p'],
      m: ['n'], n: ['m', 'u'], u: ['n'], i: ['l'], l: ['i'],
    });
    const prompts = new Set<string>();
    for (const lang of LATIN_LANGS) {
      for (let i = 0; i < 300; i++) {
        const r = generateLetterPairsRound('hard', lang);
        expectLetterRound(r);
        prompts.add(r.prompt);
        expect(r.answer).toBe(r.prompt.toLowerCase());
        for (const o of r.options) expect(o).toMatch(/^[a-z]$/);
        const twins = LOOK_ALIKES[r.answer];
        expect(twins, r.prompt).toBeDefined();
        // At least one wrong bubble is a look-alike; b/d/p/q rounds are all look-alikes.
        const wrong = r.options.filter((o) => o !== r.answer);
        expect(wrong.some((o) => twins.includes(o)), `${r.prompt}: ${r.options}`).toBe(true);
        if (twins.length >= 2) expect(wrong.every((o) => twins.includes(o))).toBe(true);
      }
    }
    expect([...prompts].sort()).toEqual(['B', 'D', 'I', 'L', 'M', 'N', 'P', 'Q', 'U']);
  });

  it('Japanese: hiragana → katakana, katakana → hiragana, hiragana → romaji', () => {
    for (let i = 0; i < 200; i++) {
      const easy = generateLetterPairsRound('easy', 'ja');
      expectLetterRound(easy);
      expect(easy.prompt).toMatch(HIRAGANA_RE);
      expect(easy.answer).toBe(toKatakana(easy.prompt));
      for (const o of easy.options) expect(o).toMatch(KATAKANA_RE);

      const medium = generateLetterPairsRound('medium', 'ja');
      expectLetterRound(medium);
      expect(medium.prompt).toMatch(KATAKANA_RE);
      expect(toKatakana(medium.answer)).toBe(medium.prompt);
      for (const o of medium.options) expect(o).toMatch(HIRAGANA_RE);

      const hard = generateLetterPairsRound('hard', 'ja');
      expectLetterRound(hard);
      expect(hard.prompt).toMatch(HIRAGANA_RE);
      expect(hard.answer).toBe(toRomaji(hard.prompt));
      for (const o of hard.options) expect(o).toMatch(/^[a-z]+$/);
    }
  });

  it('Korean: same syllable, syllable → first consonant, consonant → syllable', () => {
    for (let i = 0; i < 100; i++) {
      const easy = generateLetterPairsRound('easy', 'ko');
      expectLetterRound(easy);
      expect(easy.answer).toBe(easy.prompt);

      const medium = generateLetterPairsRound('medium', 'ko');
      expectLetterRound(medium);
      expect(medium.prompt).toMatch(/^[가-힣]$/);
      expect(medium.answer).toMatch(/^[ㄱ-ㅎ]$/);

      const hard = generateLetterPairsRound('hard', 'ko');
      expectLetterRound(hard);
      expect(hard.prompt).toMatch(/^[ㄱ-ㅎ]$/);
      expect(hard.answer).toMatch(/^[가-힣]$/);
    }
  });

  it('is reproducible with a seed', () => {
    for (const lang of ['en', 'ja', 'ko'] as const) {
      for (const level of LEVELS) {
        expect(generateLetterPairsRound(level, lang, seededRand(7))).toEqual(generateLetterPairsRound(level, lang, seededRand(7)));
      }
    }
  });
});

describe('First Sound hard (missing letter) gaps', () => {
  it('the gap is always a plain letter the choices can show', () => {
    for (const lang of Object.keys(DICTS) as Array<keyof typeof DICTS>) {
      for (let i = 0; i < 300; i++) {
        const r = generateMissingLetterRound(lang, items(lang))!;
        if (lang === 'en' || lang === 'de' || lang === 'fr') expect(r.answer, `${lang} ${r.word}`).toMatch(/^[A-Z]$/);
      }
    }
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

describe('First Sound hard (missing letter)', () => {
  it('has words for every language, and the gap is answerable with three letters', () => {
    const gapPositions = new Set<number>();
    for (const lang of Object.keys(DICTS) as Array<keyof typeof DICTS>) {
      expect(missingLetterCandidates(lang, items(lang)).length).toBeGreaterThan(5);
      for (let i = 0; i < 100; i++) {
        const r = generateMissingLetterRound(lang, items(lang))!;
        expect([...r.word][r.gapIndex]).toBe(r.answer);
        expect(r.options).toContain(r.answer);
        expect(new Set(r.options).size).toBe(r.options.length);
        expect(r.options).toHaveLength(3);
        gapPositions.add(r.gapIndex);
      }
    }
    // Not just the first letter: that is what easy and medium already ask.
    expect([...gapPositions].some((i) => i > 0)).toBe(true);
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

  it('every hand-split word fits some level', () => {
    const longest = Math.max(...Object.values(SYLLABLE_RANGE).map(([, max]) => max));
    for (const words of Object.values(SYLLABLE_WORDS)) {
      for (const word of Object.values(words)) expect(word.split('·').length, word).toBeLessThanOrEqual(longest);
    }
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
