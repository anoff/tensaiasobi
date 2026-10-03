import { shuffle } from '../utils/shuffle';

// 88 child-friendly emojis from translation dictionary
export const EMOJI_ITEMS: string[] = [
  '🦁', '🍎', '🍌', '🐈', '🐕', '🐘', '🐟', '🦒', '🏠', '🍦', '🐸', '🔑', '🦉', '🍐', '☀️', '🌲',
  '🍉', '🦓', '🚗', '🛥️', '✈️', '🎈', '🔔', '📘', '🍰', '🕯️', '🧀', '🍒', '🐄', '🦀', '👑', '🦆',
  '🥚', '🌷', '🍇', '👒', '🍋', '🍈', '🐭', '🧅', '🐼', '🍑', '🐧', '🍍', '🐇', '🐌', '🍓', '🍅',
  '🐢', '☂️', '🎻', '🐺', '🚢', '🚂', '🚁', '🚀', '🚲', '🌈', '🌟', '☁️', '🌙', '🐯', '🐒',
  '🐙', '🐨', '🐻', '🐷', '🐔', '🐬', '🐳', '🐝', '🦋', '🐞', '🤖', '👻', '🎁', '🍄', '❄️', '🎸',
  '🍕', '🍩', '🍪', '🍬', '🍊', '🥕', '⛵', '🥜', '📓', '🎺', '🐪', '🔍', '🧱', '🧸', '✏️', '🧣', '👓', '🥛', '🦖', '🦄', '🦈', '🐍', '🍟', '🍔', '🌽', '🍯', '🛸', '🚜', '🎒', '🧩'
];

// Clean Western words for first/last character matching
export const cleanWesternWord = (word: string, lang?: string): string => {
  let cleaned = word.toLowerCase();
  if (lang === 'fr') {
    cleaned = cleaned
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/œ/g, 'oe')
      .replace(/æ/g, 'ae');
  }
  return cleaned.replace(/[^a-zäöüßа-я]/g, '');
};


export const getStartChar = (word: string, lang: string): string => {
  if (!word) return '';
  if (lang === 'ja' || lang === 'ko') {
    return word[0];
  }
  const cleaned = cleanWesternWord(word, lang);
  return cleaned.length > 0 ? cleaned[0].toUpperCase() : '';
};


export const getEndChar = (word: string, lang: string): string => {
  if (!word) return '';
  if (lang === 'ja') {
    let trimmed = word;
    // Strip trailing long vowel signs (ー) for matching
    while (trimmed.endsWith('ー') && trimmed.length > 1) {
      trimmed = trimmed.slice(0, -1);
    }
    const last = trimmed[trimmed.length - 1];
    

    const smallToBig: Record<string, string> = {
      'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
      'っ': 'つ',
      'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
      'ゎ': 'わ'
    };
    return smallToBig[last] || last;
  }
  if (lang === 'ko') {
    return word[word.length - 1];
  }
  const cleaned = cleanWesternWord(word, lang);
  return cleaned.length > 0 ? cleaned[cleaned.length - 1].toUpperCase() : '';
};

// Normalized base kana mapping for Japanese dakuten/handakuten to make matching child-friendly
const KANA_BASE_MAP: Record<string, string> = {
  'が': 'か', 'ぎ': 'き', 'ぐ': 'く', 'げ': 'け', 'ご': 'こ',
  'ざ': 'さ', 'じ': 'し', 'ず': 'す', 'ぜ': 'せ', 'ぞ': 'そ',
  'だ': 'た', 'ぢ': 'ち', 'づ': 'つ', 'で': 'て', 'ど': 'と',
  'ば': 'は', 'び': 'ひ', 'ぶ': 'ふ', 'べ': 'へ', 'ぼ': 'ほ',
  'ぱ': 'は', 'ぴ': 'ひ', 'ぷ': 'ふ', 'ぺ': 'へ', 'ぽ': 'ほ',
};


export const areCharsCompatible = (endChar: string, startChar: string, lang: string): boolean => {
  if (!endChar || !startChar) return false;
  if (lang === 'ja') {
    const base1 = KANA_BASE_MAP[endChar] || endChar;
    const base2 = KANA_BASE_MAP[startChar] || startChar;
    return base1 === base2;
  }
  return endChar.toUpperCase() === startChar.toUpperCase();
};

// Check if an emoji is a "safe" play (has at least one other starting word, doesn't end in 'ん')
export const isSafeWord = (emoji: string, lang: string, itemsDict: Record<string, string>): boolean => {
  const word = itemsDict[emoji] || '';
  if (!word) return false;
  const endChar = getEndChar(word, lang);
  if (lang === 'ja' && endChar === 'ん') return false;

  return EMOJI_ITEMS.some(other => {
    if (other === emoji) return false;
    const otherWord = itemsDict[other] || '';
    if (!otherWord) return false;
    const otherStart = getStartChar(otherWord, lang);
    
    // In Japanese, a continuation is only safe if it does not end in 'ん' itself
    if (lang === 'ja') {
      const otherEnd = getEndChar(otherWord, lang);
      if (otherEnd === 'ん') return false;
    }

    return areCharsCompatible(endChar, otherStart, lang);
  });
};


export const getStartWord = (lang: string, itemsDict: Record<string, string>): string => {
  const safeItems = EMOJI_ITEMS.filter(emoji => isSafeWord(emoji, lang, itemsDict));
  if (safeItems.length > 0) {
    return safeItems[Math.floor(Math.random() * safeItems.length)];
  }
  return EMOJI_ITEMS[Math.floor(Math.random() * EMOJI_ITEMS.length)];
};

/**
 * Word Chain levels. The old board was always nine unlabeled pictures, so the
 * child had to name nine emojis *and* spell their first letters. Now the
 * school start (medium) is four labeled pictures; only hard drops the words.
 */
export const SHIRITORI_LEVELS: Record<'easy' | 'medium' | 'hard', { options: number; labels: boolean }> = {
  easy: { options: 3, labels: true },
  medium: { options: 4, labels: true },
  hard: { options: 6, labels: false },
};

interface GeneratedOptions {
  options: string[];
  isGameOver?: boolean;
}

// Generate options based on current word's ending character (pure function outside render)
export const generateOptionsForWord = (
  currentEmoji: string,
  currentChain: string[],
  lang: string,
  itemsDict: Record<string, string>,
  optionCount = 9
): GeneratedOptions => {
  const word = itemsDict[currentEmoji] || '';
  const endChar = getEndChar(word, lang);
  
  // 1. Find all candidates that match the ending character
  const matchingCandidates = EMOJI_ITEMS.filter(emoji => {
    if (currentChain.includes(emoji)) return false;
    const val = itemsDict[emoji] || '';
    return areCharsCompatible(endChar, getStartChar(val, lang), lang);
  });

  // 2. Select a correct option (prioritize safe ones to avoid dead ends)
  let correctEmoji = '';
  const safeMatches = matchingCandidates.filter(emoji => isSafeWord(emoji, lang, itemsDict));
  
  if (safeMatches.length > 0) {
    correctEmoji = safeMatches[Math.floor(Math.random() * safeMatches.length)];
  } else if (matchingCandidates.length > 0) {
    correctEmoji = matchingCandidates[Math.floor(Math.random() * matchingCandidates.length)];
  } else {
    const resetMatchingCandidates = EMOJI_ITEMS.filter(emoji => {
      const val = itemsDict[emoji] || '';
      return areCharsCompatible(endChar, getStartChar(val, lang), lang);
    });
    if (resetMatchingCandidates.length > 0) {
      correctEmoji = resetMatchingCandidates[Math.floor(Math.random() * resetMatchingCandidates.length)];
    }
  }

  // 3. Select distractors (words that start with a different letter)
  const distractorCandidates = EMOJI_ITEMS.filter(emoji => {
    if (emoji === correctEmoji) return false;
    const val = itemsDict[emoji] || '';
    return !areCharsCompatible(endChar, getStartChar(val, lang), lang);
  });

  // 3. Fill the remaining slots with distinct distractors
  const selectedDistractors = shuffle(distractorCandidates).slice(0, optionCount - 1);

  // Japanese specific: on the bigger boards, sometimes include a 'ん' ending word as a trap
  if (lang === 'ja' && optionCount >= 6 && Math.random() < 0.25) {
    const nEndingCandidates = matchingCandidates.filter(emoji => getEndChar(itemsDict[emoji] || '', 'ja') === 'ん');
    if (nEndingCandidates.length > 0) {
      const trapEmoji = nEndingCandidates[Math.floor(Math.random() * nEndingCandidates.length)];

      const optsList = shuffle([correctEmoji, trapEmoji, ...selectedDistractors.slice(0, optionCount - 2)]);
      return { options: optsList };
    }
  }

  if (correctEmoji) {
    const optsList = shuffle([correctEmoji, ...selectedDistractors]);
    return { options: optsList };
  } else {
    return { options: [], isGameOver: true };
  }
};

// Panda play choice selection (pure function outside render)
export const getPandaPlayChoice = (
  currentChain: string[],
  lang: string,
  itemsDict: Record<string, string>
): string => {
  const currentEmoji = currentChain[currentChain.length - 1];
  const word = itemsDict[currentEmoji] || '';
  const endChar = getEndChar(word, lang);

  const pandaCandidates = EMOJI_ITEMS.filter(emoji => {
    if (currentChain.includes(emoji)) return false;
    const val = itemsDict[emoji] || '';
    return areCharsCompatible(endChar, getStartChar(val, lang), lang);
  });

  const safePandaCandidates = pandaCandidates.filter(emoji => isSafeWord(emoji, lang, itemsDict));

  if (safePandaCandidates.length > 0) {
    return safePandaCandidates[Math.floor(Math.random() * safePandaCandidates.length)];
  } else if (pandaCandidates.length > 0) {
    return pandaCandidates[Math.floor(Math.random() * pandaCandidates.length)];
  }
  return '';
};

