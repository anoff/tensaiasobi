import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Confetti from 'react-confetti';
import KidButton from '../components/KidButton';
import { useTranslation } from '../hooks/useTranslation';

interface ShiritoriProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
  onStarEarned?: (amount: number) => void;
}

// 88 child-friendly emojis from translation dictionary
const EMOJI_ITEMS: string[] = [
  '🦁', '🍎', '🍌', '🐈', '🐕', '🐘', '🐟', '🦒', '🏠', '🍦', '🐸', '🔑', '🦉', '🍐', '☀️', '🌲',
  '🍉', '🦓', '🚗', '🛥️', '✈️', '🎈', '🔔', '📘', '🍰', '🕯️', '🧀', '🍒', '🐄', '🦀', '👑', '🦆',
  '🥚', '🌷', '🍇', '👒', '🍋', '🍈', '🐭', '🧅', '🐼', '🍑', '🐧', '🍍', '🐇', '🐌', '🍓', '🍅',
  '🐢', '☂️', '🎻', '🐺', '🚢', '🚂', '🚁', '🚀', '🚲', '🌈', '🌟', '☁️', '🌙', '🐯', '🐒',
  '🐙', '🐨', '🐻', '🐷', '🐔', '🐬', '🐳', '🐝', '🦋', '🐞', '🤖', '👻', '🎁', '🍄', '❄️', '🎸',
  '🍕', '🍩', '🍪', '🍬', '🍊', '🥕', '⛵', '🥜', '📓', '🎺', '🐪', '🔍', '🧱', '🧸', '✏️', '🧣', '👓', '🥛', '🦖', '🦄', '🦈', '🐍', '🍟', '🍔', '🌽', '🍯', '🛸', '🚜', '🎒', '🧩'
];

// Helper to read localStorage safely
const getSafeLocalStorage = (key: string, defaultValue: number): number => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved, 10) : defaultValue;
  } catch (e) {
    console.error('Error reading localStorage key', key, e);
    return defaultValue;
  }
};

// Helper to write localStorage safely
const setSafeLocalStorage = (key: string, value: number) => {
  try {
    localStorage.setItem(key, value.toString());
  } catch (e) {
    console.error('Error writing localStorage key', key, e);
  }
};

// Clean Western words for first/last character matching
const cleanWesternWord = (word: string): string => {
  return word.toLowerCase().replace(/[^a-zäöüßа-я]/g, '');
};

// Get the start character of a word depending on the language
const getStartChar = (word: string, lang: string): string => {
  if (!word) return '';
  if (lang === 'ja') {
    return word[0];
  }
  const cleaned = cleanWesternWord(word);
  return cleaned.length > 0 ? cleaned[0].toUpperCase() : '';
};

// Get the end character of a word depending on the language
const getEndChar = (word: string, lang: string): string => {
  if (!word) return '';
  if (lang === 'ja') {
    let trimmed = word;
    // Strip trailing long vowel signs (ー) for matching
    while (trimmed.endsWith('ー') && trimmed.length > 1) {
      trimmed = trimmed.slice(0, -1);
    }
    const last = trimmed[trimmed.length - 1];
    
    // Normalize small characters to their standard counterpart
    const smallToBig: Record<string, string> = {
      'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お',
      'っ': 'つ',
      'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
      'ゎ': 'わ'
    };
    return smallToBig[last] || last;
  }
  const cleaned = cleanWesternWord(word);
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

// Checks compatibility between ending char of previous word and starting char of next word
const areCharsCompatible = (endChar: string, startChar: string, lang: string): boolean => {
  if (!endChar || !startChar) return false;
  if (lang === 'ja') {
    const base1 = KANA_BASE_MAP[endChar] || endChar;
    const base2 = KANA_BASE_MAP[startChar] || startChar;
    return base1 === base2;
  }
  return endChar.toUpperCase() === startChar.toUpperCase();
};

// Check if an emoji is a "safe" play (has at least one other starting word, doesn't end in 'ん')
const isSafeWord = (emoji: string, lang: string, itemsDict: Record<string, string>): boolean => {
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

// Get a random starting word that is safe
const getStartWord = (lang: string, itemsDict: Record<string, string>): string => {
  const safeItems = EMOJI_ITEMS.filter(emoji => isSafeWord(emoji, lang, itemsDict));
  if (safeItems.length > 0) {
    return safeItems[Math.floor(Math.random() * safeItems.length)];
  }
  return EMOJI_ITEMS[Math.floor(Math.random() * EMOJI_ITEMS.length)];
};

interface GeneratedOptions {
  options: string[];
  isGameOver?: boolean;
}

// Generate options based on current word's ending character (pure function outside render)
const generateOptionsForWord = (
  currentEmoji: string,
  currentChain: string[],
  lang: string,
  itemsDict: Record<string, string>
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

  // 3. Select 8 distinct distractors
  const shuffledDistractors = [...distractorCandidates].sort(() => Math.random() - 0.5);
  const selectedDistractors = shuffledDistractors.slice(0, 8);

  // Japanese specific: If in Japanese mode, sometimes include a 'ん' ending word as a distractor/trap if possible
  if (lang === 'ja' && Math.random() < 0.25) {
    const nEndingCandidates = matchingCandidates.filter(emoji => getEndChar(itemsDict[emoji] || '', 'ja') === 'ん');
    if (nEndingCandidates.length > 0) {
      const trapEmoji = nEndingCandidates[Math.floor(Math.random() * nEndingCandidates.length)];
      // Replace one distractor with the trap
      const optsList = [correctEmoji, trapEmoji, ...selectedDistractors.slice(0, 7)].sort(() => Math.random() - 0.5);
      return { options: optsList };
    }
  }

  if (correctEmoji) {
    const optsList = [correctEmoji, ...selectedDistractors].sort(() => Math.random() - 0.5);
    return { options: optsList };
  } else {
    return { options: [], isGameOver: true };
  }
};

// Panda play choice selection (pure function outside render)
const getPandaPlayChoice = (
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

export function Shiritori({ playPop, playSuccess, playError, onStarEarned }: ShiritoriProps) {
  const { language, t } = useTranslation();
  
  // Memoized items dictionary
  const itemsDict = useMemo(() => {
    return (t.anlautGame.items || {}) as Record<string, string>;
  }, [t.anlautGame.items]);

  // Initial values computed once on mount
  const startEmoji = useMemo(() => {
    return getStartWord(language, itemsDict);
  }, [language, itemsDict]);

  const initialOptions = useMemo(() => {
    return generateOptionsForWord(startEmoji, [startEmoji], language, itemsDict).options;
  }, [startEmoji, language, itemsDict]);

  // Core Game State
  const [mode, setMode] = useState<'solo' | 'panda'>('solo');
  const [chain, setChain] = useState<string[]>(() => [startEmoji]);
  const [options, setOptions] = useState<string[]>(() => initialOptions);
  
  // Interaction/Animation Feedback State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [shakeOption, setShakeOption] = useState<string | null>(null);

  // Panda Co-op Turn State
  const [turn, setTurn] = useState<'player' | 'panda'>('player');
  const [pandaSpeech, setPandaSpeech] = useState<string>('');
  const [pandaState, setPandaState] = useState<'idle' | 'thinking' | 'talking'>('idle');

  // Game End States
  const [isNRuleLost, setIsNRuleLost] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);

  // High Scores
  const [streak, setStreak] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => getSafeLocalStorage('shiritori_highscore', 0));

  const chainEndRef = useRef<HTMLDivElement>(null);

  // Initialize or restart the game
  const initGame = useCallback((selectedMode: 'solo' | 'panda') => {
    const startEmoji = getStartWord(language, itemsDict);
    setChain([startEmoji]);
    setStreak(0);
    setMode(selectedMode);
    setTurn('player');
    setIsNRuleLost(false);
    setIsGameOver(false);
    setSelectedOption(null);
    setIsCorrect(null);
    setShowConfetti(false);
    setShakeOption(null);
    
    if (selectedMode === 'panda') {
      setPandaState('talking');
      setPandaSpeech(t.shiritori.yourTurn);
    } else {
      setPandaState('idle');
      setPandaSpeech('');
    }

    const result = generateOptionsForWord(startEmoji, [startEmoji], language, itemsDict);
    if (result.isGameOver) {
      setIsGameOver(true);
    } else {
      setOptions(result.options);
    }
  }, [language, itemsDict, t.shiritori.yourTurn]);

  // Auto-scroll the chain view as new cards are added
  useEffect(() => {
    if (chainEndRef.current) {
      chainEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
    }
  }, [chain]);

  // Panda plays its turn
  const handlePandaPlay = useCallback((currentChain: string[]) => {
    const pandaChoice = getPandaPlayChoice(currentChain, language, itemsDict);

    if (pandaChoice) {
      const nextChain = [...currentChain, pandaChoice];
      setChain(nextChain);
      playPop();

      setPandaState('talking');
      setPandaSpeech(t.shiritori.pandaPlayed.replace('{word}', itemsDict[pandaChoice]));
      
      setTurn('player');
      setSelectedOption(null);
      setIsCorrect(null);

      // Check if Panda choice ends in 'ん' (should not happen due to safety checks, but as fallback)
      const endingChar = getEndChar(itemsDict[pandaChoice] || '', language);
      if (language === 'ja' && endingChar === 'ん') {
        setIsNRuleLost(true);
        setIsGameOver(true);
        return;
      }

      const result = generateOptionsForWord(pandaChoice, nextChain, language, itemsDict);
      if (result.isGameOver) {
        setIsGameOver(true);
      } else {
        setOptions(result.options);
      }
    } else {
      // Panda gets stuck! Child wins!
      setShowConfetti(true);
      setIsGameOver(true);
      setPandaState('talking');
      setPandaSpeech("Oh! I'm stuck! You win! 🏆");
    }
  }, [language, itemsDict, t.shiritori.pandaPlayed, playPop]);

  // Handle Player Selection
  const handleOptionSelect = (emoji: string) => {
    if (selectedOption !== null || turn !== 'player') return;

    const currentWord = itemsDict[chain[chain.length - 1]] || '';
    const targetEnd = getEndChar(currentWord, language);
    const selectedWord = itemsDict[emoji] || '';
    const selectedStart = getStartChar(selectedWord, language);

    if (areCharsCompatible(targetEnd, selectedStart, language)) {
      // CORRECT MATCH!
      setSelectedOption(emoji);
      setIsCorrect(true);
      
      const newChain = [...chain, emoji];
      setChain(newChain);

      const newStreak = streak + 1;
      setStreak(newStreak);

      // Check for High Score
      if (newStreak > highScore) {
        setHighScore(newStreak);
        setSafeLocalStorage('shiritori_highscore', newStreak);
      }

      // Check Japanese 'ん' Game Over Rule
      const endingChar = getEndChar(selectedWord, language);
      if (language === 'ja' && endingChar === 'ん') {
        playError();
        setIsNRuleLost(true);
        setIsGameOver(true);
        return;
      }

      // Successful connection
      playSuccess();
      onStarEarned?.(2);

      // Confetti on milestone achievements
      if (newStreak % 5 === 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }

      if (mode === 'panda') {
        setTurn('panda');
        setPandaState('thinking');
        setPandaSpeech(t.shiritori.pandaTurn);
        
        // Trigger Panda play after delay
        setTimeout(() => {
          handlePandaPlay(newChain);
        }, 1500);
      } else {
        // Solo Mode continues immediately
        setTimeout(() => {
          setSelectedOption(null);
          setIsCorrect(null);
          const result = generateOptionsForWord(emoji, newChain, language, itemsDict);
          if (result.isGameOver) {
            setIsGameOver(true);
          } else {
            setOptions(result.options);
          }
        }, 1000);
      }
    } else {
      // INCORRECT MATCH
      playError();
      setStreak(0);
      setShakeOption(emoji);
      setTimeout(() => setShakeOption(null), 500);
    }
  };

  // Highlight word letters for educational visualization
  const renderHighlightedWord = (emoji: string) => {
    const word = itemsDict[emoji] || '';
    if (!word) return '';

    if (language === 'ja') {
      // For Japanese, highlight first and last hiragana character
      // We skip trailing long vowels 'ー' for end highlight, but we show the whole word
      let trimmed = word;
      while (trimmed.endsWith('ー') && trimmed.length > 1) {
        trimmed = trimmed.slice(0, -1);
      }
      const rawEndC = trimmed[trimmed.length - 1];
      const endIdx = word.lastIndexOf(rawEndC);

      return (
        <span className="flex items-center justify-center font-black tracking-widest text-3xl md:text-4xl text-slate-700">
          {word.split('').map((char, index) => {
            let colorClass = '';
            let animClass = '';
            if (index === 0) {
              colorClass = 'text-emerald-500 font-extrabold';
            } else if (index === endIdx) {
              colorClass = 'text-candy-pink font-extrabold';
              animClass = 'animate-pulse';
            }
            return (
              <span key={index} className={`${colorClass} ${animClass}`}>
                {char}
              </span>
            );
          })}
        </span>
      );
    } else {
      // English/German highlight first and last letter
      const cleaned = cleanWesternWord(word);
      if (!cleaned) return <span className="font-black text-3xl">{word}</span>;

      const firstLetterIdx = word.toLowerCase().indexOf(cleaned[0]);
      const lastLetterIdx = word.toLowerCase().lastIndexOf(cleaned[cleaned.length - 1]);

      return (
        <span className="flex items-center justify-center font-black tracking-wider text-3xl md:text-4xl text-slate-700 capitalize">
          {word.split('').map((char, index) => {
            let colorClass = '';
            let animClass = '';
            if (index === firstLetterIdx) {
              colorClass = 'text-emerald-500';
            } else if (index === lastLetterIdx) {
              colorClass = 'text-candy-pink';
              animClass = 'animate-pulse';
            }
            return (
              <span key={index} className={`${colorClass} ${animClass}`}>
                {char}
              </span>
            );
          })}
        </span>
      );
    }
  };

  const activeEmoji = chain[chain.length - 1];
  const activeWord = useMemo(() => (activeEmoji ? itemsDict[activeEmoji] || '' : ''), [activeEmoji, itemsDict]);
  const targetLetter = useMemo(() => (activeEmoji ? getEndChar(activeWord, language) : ''), [activeEmoji, activeWord, language]);

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={150}
          recycle={false}
        />
      )}

      {/* Header Panel */}
      <div className="text-center space-y-2 w-full">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
          {t.shiritori.title}
        </h2>
        <div className="flex justify-center gap-2 mb-1">
          <button
            onClick={() => { playPop(); initGame('solo'); }}
            className={`px-4 py-1.5 rounded-full font-black text-sm border-2 transition-all ${
              mode === 'solo'
                ? 'bg-candy-blue text-white border-sky-500 shadow-[0_2px_0_0_#0284c7]'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.shiritori.soloMode}
          </button>
          <button
            onClick={() => { playPop(); initGame('panda'); }}
            className={`px-4 py-1.5 rounded-full font-black text-sm border-2 transition-all ${
              mode === 'panda'
                ? 'bg-candy-purple text-white border-purple-500 shadow-[0_2px_0_0_#7c3aed]'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.shiritori.playWithPanda}
          </button>
        </div>

        {/* Counters */}
        <div className="flex gap-4 items-center justify-center pt-1">
          <span className="bg-amber-100 text-amber-600 font-extrabold px-4 py-1 rounded-full border-2 border-amber-300 text-xs shadow-sm flex items-center gap-1.5 animate-pulse">
            ✨ {t.shiritori.streak}: {streak}
          </span>
          <span className="bg-indigo-100 text-indigo-600 font-extrabold px-4 py-1 rounded-full border-2 border-indigo-300 text-xs shadow-sm">
            🏆 {t.shiritori.highScore}: {highScore}
          </span>
        </div>
      </div>

      {/* Scrolling Chain Track */}
      <div className="w-full bg-white/70 border-2 border-slate-200/80 rounded-3xl p-3 my-3 shadow-inner overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
        <div className="flex items-center gap-2 min-w-max px-2 py-1">
          {chain.map((emoji, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className={`flex flex-col items-center justify-center bg-white border-2 border-slate-200 rounded-2xl w-14 h-14 shadow-sm hover:scale-105 transition-transform duration-200 relative ${
                  index === chain.length - 1 ? 'ring-4 ring-candy-pink/50 border-candy-pink' : ''
                }`}
              >
                <span className="text-3xl">{emoji}</span>
                <span className="text-[9px] text-slate-400 font-bold max-w-[50px] truncate text-center leading-none mt-1">
                  {itemsDict[emoji]}
                </span>
                {index === chain.length - 1 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                  </span>
                )}
              </div>
              {index < chain.length - 1 && (
                <span className="text-slate-300 font-black text-xl">➔</span>
              )}
            </div>
          ))}
          <div ref={chainEndRef} />
        </div>
      </div>

      {/* Main Interactive Stage */}
      {isGameOver ? (
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm space-y-6 my-4 p-6 bg-white border-4 border-slate-200 rounded-[3rem] shadow-xl animate-pop-in">
          {isNRuleLost ? (
            <>
              <span className="text-8xl animate-bounce">🦁❌</span>
              <h3 className="text-2xl font-black text-red-500 text-center">
                {t.shiritori.nRuleLost}
              </h3>
              <p className="text-slate-500 text-center font-extrabold text-sm px-4">
                {t.shiritori.nRuleWarning}
              </p>
            </>
          ) : (
            <>
              <span className="text-8xl">🏆🐼</span>
              <h3 className="text-2xl font-black text-emerald-600 text-center">
                {t.shiritori.victory}
              </h3>
              <p className="text-slate-500 text-center font-extrabold text-sm px-4">
                {t.shiritori.congrats}
              </p>
            </>
          )}

          <KidButton
            color={isNRuleLost ? 'orange' : 'green'}
            size="lg"
            onClick={() => initGame(mode)}
            className="w-full rounded-2xl"
          >
            {t.shiritori.playAgain}
          </KidButton>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center my-2 space-y-4 w-full">
          {/* Panda Bubble in Panda Mode */}
          {mode === 'panda' && (
            <div className="flex items-center gap-3 w-full max-w-xs animate-pop-in mb-2">
              <div className={`w-16 h-16 rounded-full border-4 border-purple-200 bg-white flex items-center justify-center text-4xl shadow-md transition-transform duration-300 ${
                pandaState === 'thinking' ? 'animate-bounce' : 'hover:rotate-12'
              }`}>
                🐼
              </div>
              <div className="relative bg-white border-2 border-purple-200 rounded-2xl py-2 px-4 shadow-md flex-1">
                {/* Speech Bubble Arrow */}
                <div className="absolute left-[-9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-l-2 border-b-2 border-purple-200 rotate-45" />
                <span className="text-xs font-black text-purple-700 leading-tight block">
                  {pandaSpeech}
                </span>
              </div>
            </div>
          )}

          {/* Active Word Card */}
          <div
            data-testid="active-card"
            data-word={activeWord}
            data-emoji={activeEmoji}
            className="bg-white border-4 border-slate-200 rounded-[2.5rem] p-6 w-full max-w-xs flex flex-col items-center justify-center shadow-lg relative"
          >
            <span className="text-8xl drop-shadow-[0_8px_8px_rgba(0,0,0,0.1)] animate-bounce-subtle">
              {activeEmoji}
            </span>
            <div className="mt-4 text-center">
              {renderHighlightedWord(activeEmoji)}
            </div>

            {/* Target Letter Indicator Badge */}
            <div className="absolute bottom-[-15px] bg-candy-pink text-white font-black px-4 py-1.5 rounded-full border-2 border-white text-sm shadow-md animate-pulse">
              ➔ {targetLetter}
            </div>
          </div>

          {/* Guide Helper Text */}
          <div className="text-slate-400 font-extrabold text-xs text-center max-w-xs pt-4">
            {t.shiritori.help}
          </div>
        </div>
      )}

      {/* Bubble Options */}
      {!isGameOver && (
        <div className="w-full flex flex-col items-center gap-4 pb-4">
          <div className="w-full grid grid-cols-3 gap-4 max-w-sm">
            {options.map((opt) => {
              const isThisSelected = selectedOption === opt;
              const isShaking = shakeOption === opt;

              let bubbleColorClass =
                'from-sky-300/40 via-sky-400/70 to-sky-600/90 shadow-[0_10px_20px_rgba(14,165,233,0.25),_inset_0_4px_12px_rgba(255,255,255,0.6)] border-sky-400';

              if (isThisSelected) {
                if (isCorrect) {
                  bubbleColorClass =
                    'from-emerald-300 via-emerald-400 to-emerald-600 shadow-[0_4px_10px_rgba(16,185,129,0.4)] border-emerald-400 scale-95 duration-100';
                }
              } else if (isShaking) {
                bubbleColorClass =
                  'from-red-300 via-red-400 to-red-600 shadow-[0_4px_10px_rgba(239,68,68,0.4)] border-red-400 scale-95 duration-100';
              }

              return (
                <button
                  key={opt}
                  data-testid="shiritori-option"
                  data-word={itemsDict[opt] || ''}
                  data-emoji={opt}
                  disabled={selectedOption !== null || turn !== 'player'}
                  onClick={() => handleOptionSelect(opt)}
                  className={`
                    relative w-full aspect-square rounded-full flex items-center justify-center
                    border-4 transition-all duration-150 bg-gradient-to-br hover:scale-105 active:scale-95 
                    outline-none cursor-pointer overflow-hidden ${bubbleColorClass} ${
                      isShaking ? 'animate-shake' : ''
                    }
                  `}
                >
                  {/* Bubble reflection effect */}
                  <div className="absolute top-2.5 left-3 w-1/4 h-1/8 bg-white/60 rounded-full -rotate-12 pointer-events-none" />
                  <div className="absolute bottom-2 right-3.5 w-1/8 h-1/8 bg-white/20 rounded-full pointer-events-none" />

                  <span className="text-5xl drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]">{opt}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Shiritori;
