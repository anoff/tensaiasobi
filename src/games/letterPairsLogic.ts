import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';
import { CHOICE_STARS } from '../utils/difficulty';
import { pick, type Rand } from '../utils/random';
import { HIRAGANA } from '../utils/kana';

/**
 * Letter Pairs: find the partner shape of the big letter. Letters only, no
 * pictures (picture → first letter is First Sound's job).
 * English, German, French:
 * - easy: upper → lower case (B → b)
 * - medium: lower → upper case (b → B)
 * - hard: upper → lower case against look-alikes (B → b among d, p, q)
 * Japanese:
 * - easy: hiragana → katakana (あ → ア)
 * - medium: katakana → hiragana (ア → あ)
 * - hard: hiragana → romaji (し → shi)
 * Korean: syllable → same syllable, then → its first consonant (가 → ㄱ),
 * then first consonant → syllable (ㄱ → 가).
 */
export interface LetterPairsRound {
  prompt: string;
  answer: string;
  options: string[];
}

export const LETTER_PAIRS_STARS = CHOICE_STARS;

export const OPTION_COUNT = 3;

export const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Lower-case shapes a child mixes up: mirrored or turned (b/d/p/q), one hump more or less (m/n), upside down (u/n), a stick (i/l). */
export const LOOK_ALIKES: Record<string, string[]> = {
  b: ['d', 'p', 'q'],
  d: ['b', 'p', 'q'],
  p: ['b', 'd', 'q'],
  q: ['b', 'd', 'p'],
  m: ['n'],
  n: ['m', 'u'],
  u: ['n'],
  i: ['l'],
  l: ['i'],
};

/** Korean: a basic syllable and the consonant it starts with. */
const HANGUL: Array<[string, string]> = [
  ['가', 'ㄱ'], ['나', 'ㄴ'], ['다', 'ㄷ'], ['라', 'ㄹ'], ['마', 'ㅁ'], ['바', 'ㅂ'], ['사', 'ㅅ'],
  ['아', 'ㅇ'], ['자', 'ㅈ'], ['차', 'ㅊ'], ['카', 'ㅋ'], ['타', 'ㅌ'], ['파', 'ㅍ'], ['하', 'ㅎ'],
];

/** Hepburn romaji for the hiragana pool. */
const ROMAJI: Record<string, string> = {
  あ: 'a', い: 'i', う: 'u', え: 'e', お: 'o', か: 'ka', き: 'ki', く: 'ku', け: 'ke', こ: 'ko',
  さ: 'sa', し: 'shi', す: 'su', せ: 'se', そ: 'so', た: 'ta', ち: 'chi', つ: 'tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no', は: 'ha', ひ: 'hi', ふ: 'fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo', や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro', わ: 'wa',
};

/** Katakana sits exactly 0x60 above hiragana. */
export function toKatakana(kana: string): string {
  return String.fromCharCode(kana.charCodeAt(0) + 0x60);
}

export function toRomaji(kana: string): string {
  return ROMAJI[kana] ?? kana;
}

/** Three letters from the pool; the first is the prompt, each shown through `show` on the bubbles. */
function pairRound(pool: string[], showPrompt: (l: string) => string, showOption: (l: string) => string, rand: Rand): LetterPairsRound {
  const letters = shuffle(pool, rand).slice(0, OPTION_COUNT);
  return {
    prompt: showPrompt(letters[0]),
    answer: showOption(letters[0]),
    options: shuffle(letters.map(showOption), rand),
  };
}

/** Latin hard: B → b, with its look-alikes as the wrong bubbles (topped up at random for m, u, i, l). */
function lookAlikeRound(rand: Rand): LetterPairsRound {
  const answer = pick(Object.keys(LOOK_ALIKES), rand);
  const twins = shuffle(LOOK_ALIKES[answer], rand).slice(0, OPTION_COUNT - 1);
  const rest = shuffle(
    LATIN.map((l) => l.toLowerCase()).filter((l) => l !== answer && !twins.includes(l)),
    rand,
  ).slice(0, OPTION_COUNT - 1 - twins.length);
  return { prompt: answer.toUpperCase(), answer, options: shuffle([answer, ...twins, ...rest], rand) };
}

const same = (l: string) => l;
const syllables = HANGUL.map(([syllable]) => syllable);
const consonantOf = (syllable: string) => HANGUL.find(([s]) => s === syllable)?.[1] ?? syllable;

export function generateLetterPairsRound(level: GameDifficulty, lang: string, rand: Rand = Math.random): LetterPairsRound {
  if (lang === 'ja') {
    if (level === 'easy') return pairRound(HIRAGANA, same, toKatakana, rand);
    if (level === 'medium') return pairRound(HIRAGANA, toKatakana, same, rand);
    return pairRound(HIRAGANA, same, toRomaji, rand);
  }
  if (lang === 'ko') {
    if (level === 'easy') return pairRound(syllables, same, same, rand);
    if (level === 'medium') return pairRound(syllables, same, consonantOf, rand);
    return pairRound(syllables, consonantOf, same, rand);
  }
  if (level === 'easy') return pairRound(LATIN, same, (l) => l.toLowerCase(), rand);
  if (level === 'medium') return pairRound(LATIN, (l) => l.toLowerCase(), same, rand);
  return lookAlikeRound(rand);
}
