import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';
import { CHOICE_STARS } from '../utils/difficulty';
import { pick, type Rand } from '../utils/random';

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

export const MISSING_LETTER_STARS = CHOICE_STARS;

const LATIN_VOWELS = 'AEIOU'.split('');
const LATIN_CONSONANTS = 'BCDFGHKLMNPRSTVWZ'.split('');
const HIRAGANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん'.split('');
const SMALL_KANA = 'ぁぃぅぇぉっゃゅょゎー';

const LENGTHS: Record<'latin' | 'ja' | 'ko', Record<GameDifficulty, [number, number]>> = {
  latin: { easy: [3, 5], medium: [3, 5], hard: [5, 8] },
  ja: { easy: [2, 3], medium: [2, 4], hard: [3, 5] },
  ko: { easy: [2, 3], medium: [2, 3], hard: [3, 4] },
};

type Script = 'latin' | 'ja' | 'ko';

function scriptOf(lang: string): Script {
  return lang === 'ja' ? 'ja' : lang === 'ko' ? 'ko' : 'latin';
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

/** Where the gap may go: easy only blanks the first letter, other levels any plain letter. */
function gapPositions(chars: string[], level: GameDifficulty, script: Script): number[] {
  return chars
    .map((c, i) => (blankable(c, script) ? i : -1))
    .filter((i) => i >= 0 && (level !== 'easy' || i === 0));
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
      // Single words only; accented letters may show but are never the gap.
      const readable = chars.every((c) => blankable(c, script) || (script === 'latin' && /^[A-ZÄÖÜÉÈÊÀÂÇÎÏÔŒ]$/.test(c)) || (script === 'ja' && SMALL_KANA.includes(c)));
      // ŒUF on easy would blank Œ, which is not a letter on the choices.
      return readable && gapPositions(chars, level, script).length > 0;
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

  const gapIndex = pick(gapPositions(chars, level, script), rand);
  const answer = chars[gapIndex];

  const optionCount = level === 'hard' ? 4 : 3;
  // Latin distractors stay in the answer's class (vowel vs consonant) so the child has to listen, not guess.
  const pool = distractorPool(answer, script, items).filter((c) => c !== answer);
  const options = shuffle([answer, ...shuffle(pool, rand).slice(0, optionCount - 1)], rand);

  return { emoji, word, gapIndex, answer, options };
}
