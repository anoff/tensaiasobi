import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';

/**
 * Letter Pairs: find the partner of the big prompt.
 * English, German, French:
 * - easy: a simple picture → the letter it starts with (🍎 → A)
 * - medium: upper → lower case (B → b)
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

export const LETTER_PAIRS_STARS: Record<GameDifficulty, number> = { easy: 1, medium: 2, hard: 3 };

const LATIN = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split(''); // no Q/X/Y: rare first letters
const HIRAGANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ'.split('');
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

/** Pictures a preschooler names without hesitation (easy picture → first letter). */
export const EASY_PICTURES = [
  '🍎', '🐈', '🐕', '🐟', '🦒', '🐸', '🍉', '🚗', '🐄', '🦀', '🥚', '🌷', '🍑', '🐇', '🍓', '🍅',
  '🐢', '☂️', '🌈', '🌟', '☁️', '🌙', '🐯', '🐒', '🐙', '🐻', '🐬', '🐝', '🍄', '❄️', '🍊', '🥕',
  '👓', '🐍', '🦈', '🍐', '🏠', '🐭', '🦉',
];

const OPTION_COUNT = 3;

type Rand = () => number;

function pick<T>(items: readonly T[], rand: Rand): T {
  return items[Math.floor(rand() * items.length)];
}

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

function letterRound(level: 'easy' | 'medium', lang: string): LetterPairsRound {
  const pool = letterPool(lang);
  const letters = shuffle([...pool]).slice(0, OPTION_COUNT);
  const prompt = letters[0];
  const show = level === 'easy' ? (l: string) => l : (l: string) => partner(l, lang);
  return {
    prompt,
    promptKind: 'letter',
    kind: 'letter',
    answer: show(prompt),
    options: shuffle(letters.map(show)),
  };
}

/** Spellings whose first letter isn't the first sound (cherry, ship, Schnecke, chat, phone, thumb, knee). */
const MISLEADING_START = /^(ch|sh|sch|ph|th|kn|wh)/i;

/** Pictures usable on easy: the word starts with a plain letter of the pool and sounds like it. */
export function easyPictures(lang: string, items: Record<string, string>): string[] {
  const pool = letterPool(lang);
  return EASY_PICTURES.filter((emoji) => {
    const word = items[emoji];
    if (!word) return false;
    // Accented starts (éléphant) are left out on purpose: É is not on the letter bubbles.
    const first = lang === 'ja' ? word[0] : word[0].toUpperCase();
    return pool.includes(first) && (lang === 'ja' || !MISLEADING_START.test(word));
  });
}

/** Easy: 🍎 → which letter does the word start with? (A, or り in Japanese) */
function pictureToLetterRound(lang: string, items: Record<string, string>, rand: Rand): LetterPairsRound {
  const emoji = pick(easyPictures(lang, items), rand);
  const raw = items[emoji];
  const answer = startLetter(raw, lang);
  // Show the word the way it is written in a picture book: capitalised in Latin script.
  const word = lang === 'ja' ? raw : answer + raw.slice(1);
  const distractors = shuffle(letterPool(lang).filter((k) => k !== answer)).slice(0, OPTION_COUNT - 1);
  return { prompt: emoji, promptKind: 'picture', kind: 'letter', answer, options: shuffle([answer, ...distractors]), word };
}

/** Japanese hard: し → shi. */
function romajiRound(): LetterPairsRound {
  const kana = shuffle([...HIRAGANA]).slice(0, OPTION_COUNT);
  return { prompt: kana[0], promptKind: 'letter', kind: 'letter', answer: toRomaji(kana[0]), options: shuffle(kana.map(toRomaji)) };
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
  const chosen = shuffle(letters).slice(0, OPTION_COUNT);
  const pictures = chosen.map((letter) => pick(byLetter.get(letter)!, rand));
  return {
    prompt: chosen[0],
    promptKind: 'letter',
    kind: 'picture',
    answer: pictures[0],
    options: shuffle(pictures),
  };
}

export function generateLetterPairsRound(
  level: GameDifficulty,
  lang: string,
  items: Record<string, string>,
  rand: Rand = Math.random,
): LetterPairsRound {
  if (level === 'easy' && lang !== 'ko') return pictureToLetterRound(lang, items, rand);
  if (lang === 'ja') {
    return level === 'hard' ? romajiRound() : letterRound('medium', lang);
  }
  if (level === 'hard') {
    const round = pictureRound(lang, items, rand);
    if (round) return round;
  }
  return letterRound(level === 'easy' ? 'easy' : 'medium', lang);
}
