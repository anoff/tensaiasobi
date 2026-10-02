import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';

/**
 * Missing Letter: a picture, its word with one gap, three or four letters to
 * fill it (M_USE). The word list is the shared picture dictionary.
 * - easy: the first letter is missing (a step up from First Sound)
 * - medium: any letter, short words, 3 choices
 * - hard: any letter, longer words, 4 choices, vowels compete with vowels
 */
export interface MissingLetterRound {
  emoji: string;
  /** Word as displayed (Latin words are upper-cased). */
  word: string;
  gapIndex: number;
  answer: string;
  options: string[];
}

export const MISSING_LETTER_STARS: Record<GameDifficulty, number> = { easy: 1, medium: 2, hard: 3 };

const LATIN_VOWELS = 'AEIOU'.split('');
const LATIN_CONSONANTS = 'BCDFGHKLMNPRSTVWZ'.split('');
const HIRAGANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん'.split('');
const SMALL_KANA = 'ぁぃぅぇぉっゃゅょゎー';

const LENGTHS: Record<'latin' | 'ja' | 'ko', Record<GameDifficulty, [number, number]>> = {
  latin: { easy: [3, 5], medium: [3, 5], hard: [5, 8] },
  ja: { easy: [2, 3], medium: [2, 4], hard: [3, 5] },
  ko: { easy: [2, 3], medium: [2, 3], hard: [3, 4] },
};

type Rand = () => number;
type Script = 'latin' | 'ja' | 'ko';

function scriptOf(lang: string): Script {
  return lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : 'latin';
}

function pick<T>(items: readonly T[], rand: Rand): T {
  return items[Math.floor(rand() * items.length)];
}

/** Letters that may be blanked: plain A–Z, full-size kana, any Hangul block. */
function blankable(char: string, script: Script): boolean {
  if (script === 'latin') return /^[A-Z]$/.test(char);
  if (script === 'ja') return HIRAGANA.includes(char) && !SMALL_KANA.includes(char);
  return /^[가-힣]$/.test(char);
}

export function displayWord(word: string, lang: string): string {
  return scriptOf(lang) === 'latin' ? word.toLocaleUpperCase(lang) : word;
}

export function missingLetterCandidates(
  level: GameDifficulty,
  lang: string,
  items: Record<string, string>,
): Array<[string, string]> {
  const script = scriptOf(lang);
  const [min, max] = LENGTHS[script][level];
  return Object.entries(items)
    .map(([emoji, word]) => [emoji, displayWord(word, lang)] as [string, string])
    .filter(([, word]) => {
      const chars = [...word];
      if (chars.length < min || chars.length > max) return false;
      // Single words only, and every letter must be one a child could pick.
      return chars.every((c) => blankable(c, script) || (script === 'latin' && /^[A-ZÄÖÜÉÈÊÀÂÇÎÏÔŒ]$/.test(c)) || (script === 'ja' && SMALL_KANA.includes(c)));
    });
}

function distractorPool(answer: string, script: Script, items: Record<string, string>): string[] {
  if (script === 'latin') {
    return LATIN_VOWELS.includes(answer) ? LATIN_VOWELS : LATIN_CONSONANTS;
  }
  if (script === 'ja') return HIRAGANA;
  // Korean: syllables from the other picture words.
  return [...new Set(Object.values(items).flatMap((w) => [...w]).filter((c) => blankable(c, 'ko')))];
}

export function generateMissingLetterRound(
  level: GameDifficulty,
  lang: string,
  items: Record<string, string>,
  rand: Rand = Math.random,
): MissingLetterRound | null {
  const script = scriptOf(lang);
  const candidates = missingLetterCandidates(level, lang, items);
  if (candidates.length === 0) return null;
  const [emoji, word] = pick(candidates, rand);
  const chars = [...word];

  const positions = chars
    .map((c, i) => (blankable(c, script) ? i : -1))
    .filter((i) => i >= 0 && (level === 'easy' ? i === 0 : true));
  const gapIndex = positions.length > 0 ? pick(positions, rand) : 0;
  const answer = chars[gapIndex];

  const optionCount = level === 'hard' ? 4 : 3;
  // Latin distractors stay in the answer's class (vowel vs consonant) so the child has to listen, not guess.
  const pool = distractorPool(answer, script, items).filter((c) => c !== answer);
  const options = shuffle([answer, ...shuffle(pool).slice(0, optionCount - 1)]);

  return { emoji, word, gapIndex, answer, options };
}
