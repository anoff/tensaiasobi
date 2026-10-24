import { shuffle } from '../utils/shuffle';
import { CHOICE_STARS } from '../utils/difficulty';
import { pick, type Rand } from '../utils/random';

/**
 * Missing letter, First Sound's hard level: a picture, its short word with one
 * gap anywhere, three letters to fill it (M_USE). The word list is the shared
 * picture dictionary. These are the rounds the old Missing Letter game showed
 * on its school default level (medium).
 */
export interface MissingLetterRound {
  emoji: string;
  /** Word as displayed (Latin words are upper-cased). */
  word: string;
  gapIndex: number;
  answer: string;
  options: string[];
}

/** The hard-level star rate of the pick-one games. */
export const MISSING_LETTER_STARS = CHOICE_STARS.hard;

const LATIN_VOWELS = 'AEIOU'.split('');
const LATIN_CONSONANTS = 'BCDFGHKLMNPRSTVWZ'.split('');
const HIRAGANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわん'.split('');
const SMALL_KANA = 'ぁぃぅぇぉっゃゅょゎー';

/** Word lengths in letters: short words, so the gap is findable by sounding the word out. */
const LENGTHS: Record<'latin' | 'ja' | 'ko', [number, number]> = {
  latin: [3, 5],
  ja: [2, 4],
  ko: [2, 3],
};

const OPTION_COUNT = 3;

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

/** Where the gap may go: any plain letter. */
function gapPositions(chars: string[], script: Script): number[] {
  return chars.map((c, i) => (blankable(c, script) ? i : -1)).filter((i) => i >= 0);
}

export function missingLetterCandidates(
  lang: string,
  items: Record<string, string>,
): Array<[string, string]> {
  const script = scriptOf(lang);
  const [min, max] = LENGTHS[script];
  return Object.entries(items)
    .map(([emoji, word]) => [emoji, displayWord(word, lang)] as [string, string])
    .filter(([, word]) => {
      const chars = [...word];
      if (chars.length < min || chars.length > max) return false;
      // Single words only; accented letters may show but are never the gap.
      const readable = chars.every((c) => blankable(c, script) || (script === 'latin' && /^[A-ZÄÖÜÉÈÊÀÂÇÎÏÔŒ]$/.test(c)) || (script === 'ja' && SMALL_KANA.includes(c)));
      return readable && gapPositions(chars, script).length > 0;
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
  lang: string,
  items: Record<string, string>,
  rand: Rand = Math.random,
): MissingLetterRound | null {
  const script = scriptOf(lang);
  const candidates = missingLetterCandidates(lang, items);
  if (candidates.length === 0) return null;
  const [emoji, word] = pick(candidates, rand);
  const chars = [...word];

  const gapIndex = pick(gapPositions(chars, script), rand);
  const answer = chars[gapIndex];

  // Latin distractors stay in the answer's class (vowel vs consonant) so the child has to listen, not guess.
  const pool = distractorPool(answer, script, items).filter((c) => c !== answer);
  const options = shuffle([answer, ...shuffle(pool, rand).slice(0, OPTION_COUNT - 1)], rand);

  return { emoji, word, gapIndex, answer, options };
}
