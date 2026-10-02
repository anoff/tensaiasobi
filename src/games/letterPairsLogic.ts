import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';
import { CHOICE_STARS } from '../utils/difficulty';
import { pick, type Rand } from '../utils/random';
import { HIRAGANA } from '../utils/kana';

/**
 * Letter Pairs: find the partner of the big prompt.
 * English, German, French (shape first, then sound):
 * - easy: upper → lower case (B → b)
 * - medium: a simple picture → the letter it starts with (🍎 → A)
 * - hard: a letter → a picture whose word starts with it (B → 🐻)
 * Japanese:
 * - easy: a simple picture → the hiragana it starts with (🍎 → り)
 * - medium: hiragana → katakana (あ → ア)
 * - hard: hiragana → romaji (し → shi)
 * Korean keeps same letter → first consonant (가 → ㄱ) → picture.
 */
export interface LetterPairsRound {
  prompt: string;
  /** What the big prompt shows. */
  promptKind: 'letter' | 'picture';
  /** What the options show: letters, or picture emojis. */
  kind: 'letter' | 'picture';
  answer: string;
  options: string[];
  /** The picture's word, shown once solved (easy picture rounds). */
  word?: string;
}

export const LETTER_PAIRS_STARS = CHOICE_STARS;

const LATIN = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split(''); // no Q/X/Y: rare first letters
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

/** Pictures a preschooler names without hesitation (picture → first letter). */
export const EASY_PICTURES = [
  '🍎', '🐈', '🐕', '🐟', '🦒', '🐸', '🍉', '🚗', '🐄', '🦀', '🥚', '🌷', '🍑', '🐇', '🍓', '🍅',
  '🐢', '☂️', '🌈', '🌟', '☁️', '🌙', '🐯', '🐒', '🐙', '🐻', '🐬', '🐝', '🍄', '❄️', '🍊', '🥕',
  '👓', '🐍', '🦈', '🍐', '🏠', '🐭', '🦉',
];

const OPTION_COUNT = 3;

/** Katakana sits exactly 0x60 above hiragana. */
export function toKatakana(kana: string): string {
  return String.fromCharCode(kana.charCodeAt(0) + 0x60);
}

export function toRomaji(kana: string): string {
  return ROMAJI[kana] ?? kana;
}

/** First letter as a child would name it: É → E, が → か is kept apart on purpose. */
export function startLetter(word: string, lang: string): string {
  if (!word) return '';
  if (lang === 'ja' || lang === 'ko') return word[0];
  return word.normalize('NFD').replace(/[̀-ͯ]/g, '')[0].toUpperCase();
}

function letterPool(lang: string): string[] {
  if (lang === 'ja') return HIRAGANA;
  if (lang === 'ko') return HANGUL.map(([syllable]) => syllable);
  return LATIN;
}

function partner(letter: string, lang: string): string {
  if (lang === 'ja') return toKatakana(letter);
  if (lang === 'ko') return HANGUL.find(([syllable]) => syllable === letter)?.[1] ?? letter;
  return letter.toLowerCase();
}

/** Same letter (Korean easy) or its partner form (B → b, あ → ア, 가 → ㄱ). */
function letterRound(mode: 'same' | 'partner', lang: string, rand: Rand): LetterPairsRound {
  const letters = shuffle(letterPool(lang), rand).slice(0, OPTION_COUNT);
  const prompt = letters[0];
  const show = mode === 'same' ? (l: string) => l : (l: string) => partner(l, lang);
  return {
    prompt,
    promptKind: 'letter',
    kind: 'letter',
    answer: show(prompt),
    options: shuffle(letters.map(show), rand),
  };
}

/**
 * Spellings whose first letter isn't the first sound a child hears:
 * cherry, ship, phone, thumb, knee, wrist; Ei, Eule, Stern, Pfirsich;
 * chat, hibou (silent h), ours, oiseau, auto.
 */
const MISLEADING_START: Record<string, RegExp> = {
  en: /^(ch|sh|ph|th|kn|wh|wr)/i,
  de: /^(sch|ch|ph|ei|eu|äu|st|sp|pf)/i,
  fr: /^(ch|ph|h|ou|oi|au|eau)/i,
};

/** Pictures usable for picture → first letter: the word starts with a plain letter of the pool and sounds like it. */
export function easyPictures(lang: string, items: Record<string, string>): string[] {
  const pool = letterPool(lang);
  const misleading = MISLEADING_START[lang];
  return EASY_PICTURES.filter((emoji) => {
    const word = items[emoji];
    if (!word) return false;
    // Accented starts (éléphant) are left out on purpose: É is not on the letter bubbles.
    const first = lang === 'ja' ? word[0] : word[0].toUpperCase();
    return pool.includes(first) && !misleading?.test(word);
  });
}

/** 🍎 → which letter does the word start with? (A, or り in Japanese) */
function pictureToLetterRound(lang: string, items: Record<string, string>, rand: Rand): LetterPairsRound {
  const emoji = pick(easyPictures(lang, items), rand);
  const raw = items[emoji];
  const answer = startLetter(raw, lang);
  // Show the word the way it is written in a picture book: capitalised in Latin script.
  const word = lang === 'ja' ? raw : answer + raw.slice(1);
  const distractors = shuffle(letterPool(lang).filter((k) => k !== answer), rand).slice(0, OPTION_COUNT - 1);
  return { prompt: emoji, promptKind: 'picture', kind: 'letter', answer, options: shuffle([answer, ...distractors], rand), word };
}

/** Japanese hard: し → shi. */
function romajiRound(rand: Rand): LetterPairsRound {
  const kana = shuffle(HIRAGANA, rand).slice(0, OPTION_COUNT);
  return { prompt: kana[0], promptKind: 'letter', kind: 'letter', answer: toRomaji(kana[0]), options: shuffle(kana.map(toRomaji), rand) };
}

function pictureRound(lang: string, items: Record<string, string>, rand: Rand): LetterPairsRound | null {
  const pool = letterPool(lang);
  const byLetter = new Map<string, string[]>();
  for (const [emoji, word] of Object.entries(items)) {
    const letter = startLetter(word, lang);
    if (!pool.includes(letter)) continue;
    byLetter.set(letter, [...(byLetter.get(letter) ?? []), emoji]);
  }
  const letters = [...byLetter.keys()];
  if (letters.length < OPTION_COUNT) return null;
  const chosen = shuffle(letters, rand).slice(0, OPTION_COUNT);
  const pictures = chosen.map((letter) => pick(byLetter.get(letter)!, rand));
  return {
    prompt: chosen[0],
    promptKind: 'letter',
    kind: 'picture',
    answer: pictures[0],
    options: shuffle(pictures, rand),
  };
}

export function generateLetterPairsRound(
  level: GameDifficulty,
  lang: string,
  items: Record<string, string>,
  rand: Rand = Math.random,
): LetterPairsRound {
  if (lang === 'ja') {
    if (level === 'easy') return pictureToLetterRound(lang, items, rand);
    return level === 'hard' ? romajiRound(rand) : letterRound('partner', lang, rand);
  }
  if (lang === 'ko') {
    if (level === 'easy') return letterRound('same', lang, rand);
    if (level === 'medium') return letterRound('partner', lang, rand);
  } else {
    if (level === 'easy') return letterRound('partner', lang, rand);
    if (level === 'medium') return pictureToLetterRound(lang, items, rand);
  }
  return pictureRound(lang, items, rand) ?? letterRound('partner', lang, rand);
}
