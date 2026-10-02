import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';

/**
 * Letter Pairs: find the partner of the big letter.
 * - easy: the very same letter (B → B), pure shape recognition
 * - medium: the other form (B → b, あ → ア, 가 → ㄱ)
 * - hard: a picture whose word starts with that letter (B → 🐻)
 */
export interface LetterPairsRound {
  prompt: string;
  /** What the options show: letters, or picture emojis on hard. */
  kind: 'letter' | 'picture';
  answer: string;
  options: string[];
}

export const LETTER_PAIRS_STARS: Record<GameDifficulty, number> = { easy: 1, medium: 2, hard: 3 };

const LATIN = 'ABCDEFGHIJKLMNOPRSTUVWZ'.split(''); // no Q/X/Y: rare first letters
const HIRAGANA = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわ'.split('');
/** Korean: a basic syllable and the consonant it starts with. */
const HANGUL: Array<[string, string]> = [
  ['가', 'ㄱ'], ['나', 'ㄴ'], ['다', 'ㄷ'], ['라', 'ㄹ'], ['마', 'ㅁ'], ['바', 'ㅂ'], ['사', 'ㅅ'],
  ['아', 'ㅇ'], ['자', 'ㅈ'], ['차', 'ㅊ'], ['카', 'ㅋ'], ['타', 'ㅌ'], ['파', 'ㅍ'], ['하', 'ㅎ'],
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
    kind: 'letter',
    answer: show(prompt),
    options: shuffle(letters.map(show)),
  };
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
  if (level === 'hard') {
    const round = pictureRound(lang, items, rand);
    if (round) return round;
  }
  return letterRound(level === 'easy' ? 'easy' : 'medium', lang);
}
