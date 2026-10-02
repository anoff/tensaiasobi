import type { GameDifficulty } from '../types/game';

/**
 * Syllable Drum: drum once per syllable, then check.
 * Latin-script words are split by hand (automatic hyphenation is wrong too
 * often for a child to trust). French avoids words ending in a silent "e",
 * where spoken and written syllable counts disagree. Japanese counts morae
 * (けーき = 3, ちょうちょ = 3) and Korean counts blocks, both derived from
 * the shared picture dictionary.
 */
export const SYLLABLE_WORDS: Record<'en' | 'de' | 'fr', Record<string, string>> = {
  en: {
    '🐈': 'cat', '🐕': 'dog', '🐟': 'fish', '🏠': 'house', '🐸': 'frog', '🔑': 'key', '☀️': 'sun',
    '🌲': 'tree', '🚗': 'car', '📘': 'book', '🍰': 'cake', '🐄': 'cow', '🦆': 'duck', '🐭': 'mouse',
    '🚂': 'train', '🌟': 'star', '🌙': 'moon', '🐻': 'bear', '🐷': 'pig', '🐳': 'whale', '🐝': 'bee',
    '🦁': 'li·on', '🍎': 'ap·ple', '🦓': 'ze·bra', '🕯️': 'can·dle', '🍒': 'cher·ry', '🍋': 'lem·on',
    '🐼': 'pan·da', '🐧': 'pen·guin', '🐇': 'rab·bit', '🐢': 'tur·tle', '🚀': 'rock·et', '🌈': 'rain·bow',
    '🐯': 'ti·ger', '🐒': 'mon·key', '🐔': 'chick·en', '🤖': 'ro·bot', '🍕': 'piz·za', '🍪': 'cook·ie',
    '🥕': 'car·rot', '🐪': 'cam·el', '🚜': 'trac·tor', '🧩': 'puz·zle', '🎈': 'bal·loon', '🦒': 'gi·raffe',
    '✏️': 'pen·cil', '🐬': 'dol·phin',
    '🍌': 'ba·na·na', '🐘': 'el·e·phant', '🍅': 'to·ma·to', '☂️': 'um·brel·la', '🎻': 'vi·o·lin',
    '🐙': 'oc·to·pus', '🦋': 'but·ter·fly', '🐞': 'la·dy·bug', '🍍': 'pine·ap·ple', '🍓': 'straw·ber·ry',
    '🚲': 'bi·cy·cle', '🐨': 'ko·a·la', '🦖': 'di·no·saur', '🦄': 'u·ni·corn', '🍔': 'ham·bur·ger',
    '🍉': 'wa·ter·mel·on', '🚁': 'hel·i·cop·ter',
  },
  de: {
    '🐕': 'Hund', '🐟': 'Fisch', '🏠': 'Haus', '🍦': 'Eis', '🐸': 'Frosch', '🌲': 'Baum', '📘': 'Buch',
    '🐄': 'Kuh', '🥚': 'Ei', '👒': 'Hut', '🐭': 'Maus', '🚢': 'Schiff', '🚂': 'Zug', '🌟': 'Stern',
    '🌙': 'Mond', '🐻': 'Bär', '🐳': 'Wal', '🍄': 'Pilz', '🦈': 'Hai', '🥛': 'Milch',
    '🦁': 'Lö·we', '🍎': 'Ap·fel', '🐈': 'Kat·ze', '🦉': 'Eu·le', '🍐': 'Bir·ne', '☀️': 'Son·ne',
    '🦓': 'Ze·bra', '🚗': 'Au·to', '🔔': 'Glo·cke', '🍰': 'Ku·chen', '🕯️': 'Ker·ze', '🧀': 'Kä·se',
    '🍒': 'Kir·sche', '👑': 'Kro·ne', '🦆': 'En·te', '🌷': 'Blu·me', '🐼': 'Pan·da', '🐇': 'Ha·se',
    '🎻': 'Gei·ge', '☁️': 'Wol·ke', '🐯': 'Ti·ger', '🐒': 'Af·fe', '🐝': 'Bie·ne', '🍕': 'Piz·za',
    '🧥': 'Ja·cke', '👓': 'Bril·le', '🍯': 'Ho·nig', '🐪': 'Ka·mel', '🚜': 'Trak·tor',
    '🍌': 'Ba·na·ne', '🐘': 'E·le·fant', '🦒': 'Gi·raf·fe', '🍋': 'Zi·tro·ne', '🍈': 'Me·lo·ne',
    '🍅': 'To·ma·te', '🚀': 'Ra·ke·te', '🍓': 'Erd·bee·re', '🥕': 'Ka·rot·te', '🎺': 'Trom·pe·te',
    '🎸': 'Gi·tar·re', '🤖': 'Ro·bo·ter', '🐢': 'Schild·krö·te', '🍍': 'A·na·nas', '🐧': 'Pin·gu·in',
    '🦋': 'Schmet·ter·ling', '🧸': 'Ted·dy·bär',
    '🌈': 'Re·gen·bo·gen',
  },
  fr: {
    '🐈': 'chat', '🐕': 'chien', '🔑': 'clé', '🐺': 'loup', '🚂': 'train', '🐻': 'ours', '🥛': 'lait',
    '🍯': 'miel',
    '🐟': 'pois·son', '🏠': 'mai·son', '🦉': 'hi·bou', '☀️': 'so·leil', '🌲': 'sa·pin', '🛥️': 'ba·teau',
    '✈️': 'a·vion', '🎈': 'bal·lon', '🍰': 'gâ·teau', '🦆': 'ca·nard', '🍇': 'rai·sin', '👒': 'cha·peau',
    '🍋': 'ci·tron', '🍈': 'me·lon', '🐭': 'sou·ris', '🐼': 'pan·da', '🐇': 'la·pin', '🚲': 'vé·lo',
    '🐬': 'dau·phin', '🐷': 'co·chon', '🤖': 'ro·bot', '🎁': 'ca·deau', '🍬': 'bon·bon', '✏️': 'cra·yon',
    '🦈': 're·quin', '🐍': 'ser·pent', '🐧': 'pin·gouin', '🚜': 'trac·teur', '🍪': 'bis·cuit',
    '🐨': 'ko·a·la', '🎻': 'vi·o·lon', '🐌': 'es·car·got', '🍍': 'a·na·nas', '🐘': 'é·lé·phant',
    '🍄': 'cham·pi·gnon', '🦋': 'pa·pi·llon',
  },
};

export const SYLLABLE_STARS: Record<GameDifficulty, number> = { easy: 1, medium: 2, hard: 3 };

/** Allowed syllable counts per level. */
export const SYLLABLE_RANGE: Record<GameDifficulty, [number, number]> = {
  easy: [1, 2],
  medium: [1, 3],
  hard: [2, 4],
};

const SMALL_KANA = 'ぁぃぅぇぉゃゅょゎ';

/** Japanese morae: every kana and ー/っ/ん count; small ゃゅょ join the previous kana. */
export function splitMorae(word: string): string[] {
  const parts: string[] = [];
  for (const char of word) {
    if (SMALL_KANA.includes(char) && parts.length > 0) parts[parts.length - 1] += char;
    else parts.push(char);
  }
  return parts;
}

export function splitSyllables(word: string, lang: string): string[] {
  if (lang === 'ja') return splitMorae(word);
  if (lang === 'ko') return [...word];
  return word.split('·');
}

/** A syllable count with N words is picked with weight min(N, cap). */
const COUNT_WEIGHT_CAP = 8;

export interface SyllableRound {
  emoji: string;
  /** Syllables in order, e.g. ['gi', 'raffe']. */
  parts: string[];
}

/** Every picture word for a language with its syllables, before any level filter. */
export function syllableWords(lang: string, items: Record<string, string>): SyllableRound[] {
  if (lang === 'en' || lang === 'de' || lang === 'fr') {
    return Object.entries(SYLLABLE_WORDS[lang]).map(([emoji, word]) => ({ emoji, parts: splitSyllables(word, lang) }));
  }
  return Object.entries(items)
    .filter(([, word]) => !/[\s-]/.test(word))
    .map(([emoji, word]) => ({ emoji, parts: splitSyllables(word, lang) }));
}

export function generateSyllableRound(
  level: GameDifficulty,
  lang: string,
  items: Record<string, string>,
  previous?: string,
  rand: () => number = Math.random,
): SyllableRound {
  const [min, max] = SYLLABLE_RANGE[level];
  const words = syllableWords(lang, items).filter((w) => w.parts.length >= min && w.parts.length <= max);
  const fresh = words.filter((w) => w.emoji !== previous);
  const pool = fresh.length > 0 ? fresh : words;
  // Weight each syllable count by how many words it has, capped, so long words
  // aren't drowned out by short ones, yet a count with a single word (Japanese
  // き) doesn't come up every other round.
  const byCount = new Map<number, SyllableRound[]>();
  for (const w of pool) byCount.set(w.parts.length, [...(byCount.get(w.parts.length) ?? []), w]);
  const groups = [...byCount.values()];
  const weights = groups.map((g) => Math.min(g.length, COUNT_WEIGHT_CAP));
  let roll = rand() * weights.reduce((a, b) => a + b, 0);
  const group = groups.find((_, i) => (roll -= weights[i]) < 0) ?? groups[groups.length - 1];
  return group[Math.floor(rand() * group.length)];
}
