import { useState, useMemo } from 'react';
import Confetti from 'react-confetti';
import KidButton from '../components/KidButton';
import { useTranslation } from '../hooks/useTranslation';

interface AnlautGameProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
}

// 63 child-friendly emoji keys
const EMOJI_ITEMS: string[] = [
  '🦁', '🍎', '🍌', '🐈', '🐕', '🐘', '🐟', '🦒', '🏠', '🍦', '🐸', '🔑', '🦉', '🍐', '☀️', '🌲',
  '🍉', '🦓', '🚗', '🛥️', '✈️', '🎈', '🔔', '📘', '🍰', '🕯️', '🧀', '🍒', '🐄', '🦀', '👑', '🦆',
  '🥚', '🌷', '🍇', '👒', '🍋', '🍈', '🐭', '🧅', '🐼', '🍑', '🐧', '🍍', '🐇', '🐌', '🍓', '🍅',
  '🐢', '☂️', '🎻', '🐺', '🚢', '🚂', '🚁', '🚀', '🚲', '🌈', '🌟', '☁️', '🌙', '🐯', '🐒'
];

const getSafeLocalStorage = (key: string, defaultValue: number): number => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? parseInt(saved, 10) : defaultValue;
  } catch (e) {
    console.error('Error reading localStorage key', key, e);
    return defaultValue;
  }
};

const setSafeLocalStorage = (key: string, value: number) => {
  try {
    localStorage.setItem(key, value.toString());
  } catch (e) {
    console.error('Error writing localStorage key', key, e);
  }
};

const generateOptions = (
  item: string,
  lang: string,
  itemsDict: Record<string, string>
): string[] => {
  const word = itemsDict[item] || '';
  if (!word) return [];

  const correctChar = lang === 'ja' ? word[0] : word[0].toUpperCase();

  // Collect all starting characters of all items in this language dictionary
  const allWords = Object.values(itemsDict) as string[];
  const allStartingChars = Array.from(
    new Set(
      allWords
        .filter(Boolean)
        .map((w) => (lang === 'ja' ? w[0] : w[0].toUpperCase()))
    )
  );

  const wrongOptionsSet = new Set<string>();
  const fallbackLetters =
    lang === 'ja'
      ? [
          'あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ',
          'さ', 'し', 'す', 'せ', 'そ', 'た', 'ち', 'つ', 'て', 'と',
          'な', 'に', 'ぬ', 'ね', 'の', 'は', 'ひ', 'ふ', 'へ', 'ほ',
          'ま', 'み', 'む', 'め', 'も', 'や', 'ゆ', 'よ', 'ら', 'り',
          'る', 'れ', 'ろ', 'わ',
        ]
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  while (wrongOptionsSet.size < 2) {
    const candidates = allStartingChars.length >= 3 ? allStartingChars : fallbackLetters;
    const randomChar = candidates[Math.floor(Math.random() * candidates.length)];
    if (randomChar !== correctChar && randomChar) {
      wrongOptionsSet.add(randomChar);
    }
  }

  return [correctChar, ...Array.from(wrongOptionsSet)].sort(() => Math.random() - 0.5);
};

export function AnlautGame({ playPop, playSuccess, playError }: AnlautGameProps) {
  const { language, t } = useTranslation();

  const [currentItem, setCurrentItem] = useState<string>(() => {
    const randomIndex = Math.floor(Math.random() * EMOJI_ITEMS.length);
    return EMOJI_ITEMS[randomIndex];
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

  const [streak, setStreak] = useState(() => getSafeLocalStorage('anlaut_streak', 0));
  const [highScore, setHighScore] = useState(() => getSafeLocalStorage('anlaut_highscore', 0));

  // Compute options dynamically using useMemo to avoid setState in useEffect
  const options = useMemo(() => {
    return generateOptions(currentItem, language, t.anlautGame.items as Record<string, string>);
  }, [currentItem, language, t.anlautGame.items]);

  const itemsDict = t.anlautGame.items as Record<string, string>;
  const rawWord = itemsDict[currentItem] || '';
  const displayWord =
    language === 'ja' ? rawWord : rawWord.charAt(0).toUpperCase() + rawWord.slice(1);

  const correctChar = language === 'ja' ? displayWord[0] : displayWord[0].toUpperCase();

  const handleOptionSelect = (opt: string) => {
    if (selectedOption !== null) return; // Prevent clicking during feedback animation

    setSelectedOption(opt);

    if (opt === correctChar) {
      setIsCorrect(true);
      setShowConfetti(true);
      playSuccess();

      const newStreak = streak + 1;
      setStreak(newStreak);
      setSafeLocalStorage('anlaut_streak', newStreak);

      if (newStreak > highScore) {
        setHighScore(newStreak);
        setSafeLocalStorage('anlaut_highscore', newStreak);
      }
    } else {
      setIsCorrect(false);
      playError();
      setStreak(0);
      setSafeLocalStorage('anlaut_streak', 0);

      // Reset after 1s so they can try again
      setTimeout(() => {
        setSelectedOption(null);
        setIsCorrect(null);
      }, 1000);
    }
  };

  const handleContinue = () => {
    playPop();
    setShowConfetti(false);

    // Pick next item (guaranteeing it's different if possible)
    let nextItem = currentItem;
    if (EMOJI_ITEMS.length > 1) {
      while (nextItem === currentItem) {
        const idx = Math.floor(Math.random() * EMOJI_ITEMS.length);
        nextItem = EMOJI_ITEMS[idx];
      }
    } else {
      nextItem = EMOJI_ITEMS[0];
    }

    setCurrentItem(nextItem);
    setSelectedOption(null);
    setIsCorrect(null);
    setHintUsed(false);
  };

  // Help format the word before correct answer
  const getPlaceholderWord = () => {
    if (isCorrect) {
      return displayWord;
    }
    if (hintUsed) {
      return '..' + displayWord.slice(1);
    }
    // Dotted representation
    return displayWord
      .split('')
      .map((char) => (char === ' ' ? ' ' : '_'))
      .join(' ');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={120}
          recycle={false}
        />
      )}

      {/* Header Panel */}
      <div className="text-center space-y-2 w-full">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
          {t.anlautGame.title}
        </h2>
        <p className="text-slate-500 font-extrabold text-sm px-4">
          {t.anlautGame.subtitle}
        </p>

        {/* Counters */}
        <div className="flex gap-4 items-center justify-center pt-1">
          <span className="bg-amber-100 text-amber-600 font-extrabold px-4 py-1.5 rounded-full border-2 border-amber-300 text-sm shadow-sm flex items-center gap-1.5 animate-pulse">
            ✨ {streak}
          </span>
          <span className="bg-indigo-100 text-indigo-600 font-extrabold px-4 py-1.5 rounded-full border-2 border-indigo-300 text-sm shadow-sm">
            🏆 {highScore}
          </span>
        </div>
      </div>

      {/* Emoji and Word display area */}
      <div className="flex-1 flex flex-col items-center justify-center my-6 space-y-6 w-full">
        {/* Emoji Card */}
        <div className="bg-white border-4 border-slate-200 rounded-[3rem] w-48 h-48 flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105 active:scale-95">
          <span className="text-8xl md:text-9xl drop-shadow-[0_8px_8px_rgba(0,0,0,0.15)] animate-bounce-subtle">
            {currentItem}
          </span>
        </div>

        {/* Word Display Box */}
        <div className="min-h-16 flex items-center justify-center py-2 px-6 bg-slate-100/60 rounded-2xl border-2 border-dashed border-slate-300 w-full max-w-xs">
          <span
            className={`font-black tracking-wider text-center select-none ${
              isCorrect
                ? 'text-5xl md:text-6xl text-emerald-600 animate-bounce'
                : hintUsed
                ? 'text-4xl md:text-5xl text-slate-600'
                : 'text-3xl md:text-4xl text-slate-400 font-mono'
            }`}
          >
            {getPlaceholderWord()}
          </span>
        </div>

        {/* Hint button */}
        {!isCorrect && !hintUsed && (
          <KidButton
            color="yellow"
            size="sm"
            onClick={() => {
              playPop();
              setHintUsed(true);
            }}
            className="shadow-[0_4px_0_0_#d97706] active:translate-y-[3px]"
          >
            {t.anlautGame.hint}
          </KidButton>
        )}
      </div>

      {/* Bubble Options or Continue Button */}
      <div className="w-full flex flex-col items-center gap-4 pb-4">
        {isCorrect ? (
          <div className="w-full max-w-sm flex justify-center animate-pop-in">
            <KidButton
              color="green"
              size="lg"
              onClick={handleContinue}
              className="w-full rounded-2xl uppercase tracking-wider"
            >
              {t.anlautGame.continue}
            </KidButton>
          </div>
        ) : (
          <div className="w-full grid grid-cols-3 gap-4 max-w-sm">
            {options.map((opt) => {
              const isThisSelected = selectedOption === opt;

              let bubbleColorClass =
                'from-sky-300/40 via-sky-400/70 to-sky-600/90 shadow-[0_10px_20px_rgba(14,165,233,0.3),_inset_0_4px_12px_rgba(255,255,255,0.6)] border-sky-400';

              if (isThisSelected) {
                if ((isCorrect as boolean) === true) {
                  bubbleColorClass =
                    'from-emerald-300 via-emerald-400 to-emerald-600 shadow-[0_4px_10px_rgba(16,185,129,0.4)] border-emerald-400 scale-95 duration-100';
                } else if (isCorrect === false) {
                  bubbleColorClass =
                    'from-red-300 via-red-400 to-red-600 shadow-[0_4px_10px_rgba(239,68,68,0.4)] border-red-400 animate-shake scale-95 duration-100';
                }
              }

              return (
                <button
                  key={opt}
                  disabled={selectedOption !== null}
                  onClick={() => handleOptionSelect(opt)}
                  className={`
                    relative w-full aspect-square rounded-full flex items-center justify-center
                    text-4xl md:text-5xl font-black text-white border-4 transition-all duration-150
                    bg-gradient-to-br hover:scale-105 active:scale-95 outline-none cursor-pointer
                    ${bubbleColorClass}
                  `}
                >
                  {/* Bubble reflection effect */}
                  <div className="absolute top-3 left-4 w-1/4 h-1/8 bg-white/60 rounded-full -rotate-12 pointer-events-none" />
                  <div className="absolute bottom-2 right-4 w-1/8 h-1/8 bg-white/20 rounded-full pointer-events-none" />

                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {!isCorrect && (
          <div className="text-slate-400 font-extrabold text-xs text-center">
            {t.anlautGame.help}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnlautGame;
