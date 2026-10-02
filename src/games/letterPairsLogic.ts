import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';

/**
 * Letter Pairs: find the partner of the big prompt.
 * Latin and Korean:
 * - easy: the very same letter (B → B), pure shape recognition
 * - medium: the other form (B → b, 가 → ㄱ)
 * - hard: a picture whose word starts with that letter (B → 🐻)
 * Japanese (matching identical kana was too trivial):
 * - easy: a simple picture → the hiragana it starts with (🍎 → り)
 * - medium: hiragana → katakana (あ → ア)
 * - hard: hiragana → romaji (し → shi)
 */
export interface LetterPairsRound {
  prompt: string;
  /** What the big prompt shows. */
  promptKind: 'letter' | 'picture';
  /** What the options show: letters, or picture emojis. */
  kind: 'letter' | 'picture';
  answer: string;
  options: string[];
  /** The picture's word, shown once solved (Japanese easy). */
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

/** Pictures a preschooler names without hesitation; each word starts with a plain hiragana. */
export const JA_EASY_PICTURES = [
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

/** Japanese easy: 🍎 → which hiragana does りんご start with? */
function japanesePictureRound(items: Record<string, string>, rand: Rand): LetterPairsRound {
  const emoji = pick(JA_EASY_PICTURES.filter((e) => HIRAGANA.includes(items[e]?.[0])), rand);
  const word = items[emoji];
  const answer = word[0];
  const distractors = shuffle(HIRAGANA.filter((k) => k !== answer)).slice(0, OPTION_COUNT - 1);
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
  if (lang === 'ja') {
    if (level === 'easy') return japanesePictureRound(items, rand);
    if (level === 'hard') return romajiRound();
    return letterRound('medium', lang);
  }
  if (level === 'hard') {
    const round = pictureRound(lang, items, rand);
    if (round) return round;
  }
  return letterRound(level === 'easy' ? 'easy' : 'medium', lang);
}
