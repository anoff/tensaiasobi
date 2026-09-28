import { useState, useMemo } from 'react';
import GameConfetti from '../components/GameConfetti';
import KidButton from '../components/KidButton';
import StreakBadge from '../components/StreakBadge';
import { useTranslation } from '../hooks/useTranslation';
import { useStreak } from '../hooks/useStreak';
import { shuffle } from '../utils/shuffle';
import { NotebookChoice, NotebookSheet } from '../components/Notebook';
import { useGameFX } from '../hooks/gameFXContext';

// 63 child-friendly emoji keys
const EMOJI_ITEMS: string[] = [
  '🦁', '🍎', '🍌', '🐈', '🐕', '🐘', '🐟', '🦒', '🏠', '🍦', '🐸', '🔑', '🦉', '🍐', '☀️', '🌲',
  '🍉', '🦓', '🚗', '🛥️', '✈️', '🎈', '🔔', '📘', '🍰', '🕯️', '🧀', '🍒', '🐄', '🦀', '👑', '🦆',
  '🥚', '🌷', '🍇', '👒', '🍋', '🍈', '🐭', '🧅', '🐼', '🍑', '🐧', '🍍', '🐇', '🐌', '🍓', '🍅',
  '🐢', '☂️', '🎻', '🐺', '🚢', '🚂', '🚁', '🚀', '🚲', '🌈', '🌟', '☁️', '🌙', '🐯', '🐒',
  '🐙', '🐨', '🐻', '🐷', '🐔', '🐬', '🐳', '🐝', '🦋', '🐞', '🤖', '👻', '🎁', '🍄', '❄️', '🎸',
  '🍕', '🍩', '🍪', '🍬', '🍊', '🥕', '⛵', '🧥', '🥜', '📓', '🎺', '🐪', '🔍', '🧱', '🧸', '✏️', '🧣', '👓', '🥛', '🦖', '🦄', '🦈', '🐍', '🍟', '🍔', '🌽', '🍯', '🛸', '🚜', '🎒', '🧩'
];

const generateOptions = (
  item: string,
  lang: string,
  itemsDict: Record<string, string>
): string[] => {
  const word = itemsDict[item] || '';
  if (!word) return [];

  const correctChar = lang === 'ja' ? word[0] : word[0].toUpperCase();


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
      : lang === 'ko'
      ? [
          '가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하',
          '고', '노', '도', '로', '모', '보', '소', '오', '조', '초', '코', '토', '포', '호',
          '구', '누', '두', '루', '무', '부', '수', '우', '주', '추', '쿠', '투', '푸', '후',
        ]
      : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  while (wrongOptionsSet.size < 2) {
    const candidates = allStartingChars.length >= 3 ? allStartingChars : fallbackLetters;
    const randomChar = candidates[Math.floor(Math.random() * candidates.length)];
    if (randomChar !== correctChar && randomChar) {
      wrongOptionsSet.add(randomChar);
    }
  }

  return shuffle([correctChar, ...Array.from(wrongOptionsSet)]);
};

export function AnlautGame() {
  const { playPop, playSuccess, playError, onStarEarned, challengeMode } = useGameFX();
  const { language, t } = useTranslation();

  const [currentItem, setCurrentItem] = useState<string>(() => {
    const randomIndex = Math.floor(Math.random() * EMOJI_ITEMS.length);
    return EMOJI_ITEMS[randomIndex];
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [showContinue, setShowContinue] = useState<boolean>(false);

  const { streak, highScore, registerCorrect, resetStreak } = useStreak('anlaut');


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
      onStarEarned?.(2);

      registerCorrect();
      // Let the green wash on the chosen line land before swapping in Continue.
      setTimeout(() => setShowContinue(true), 700);
    } else {
      setIsCorrect(false);
      playError();
      resetStreak();

      if (challengeMode) {
        setTimeout(() => {
          let nextItem = currentItem;
          if (EMOJI_ITEMS.length > 1) {
            while (nextItem === currentItem) {
              const idx = Math.floor(Math.random() * EMOJI_ITEMS.length);
              nextItem = EMOJI_ITEMS[idx];
            }
          }
          setCurrentItem(nextItem);
          setSelectedOption(null);
          setIsCorrect(null);
          setHintUsed(false);
        }, 1500);
      } else {
        // Reset after 1s so they can try again
        setTimeout(() => {
          setSelectedOption(null);
          setIsCorrect(null);
        }, 1000);
      }
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
    setShowContinue(false);
  };


  const getPlaceholderWord = () => {
    if (isCorrect) {
      return displayWord;
    }
    if (hintUsed) {
      return '..' + displayWord.slice(1);
    }

    return displayWord
      .split('')
      .map((char) => (char === ' ' ? ' ' : '_'))
      .join(' ');
  };

  return (
    <div className="flex-1 flex flex-col items-center gap-3 p-4 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <GameConfetti pieces={120} />
      )}

      {/* Header Panel */}
      <div className="text-center space-y-1 w-full">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
          {t.anlautGame.title}
        </h2>
        <p className="text-slate-500 font-extrabold text-sm px-4">
          {t.anlautGame.subtitle}
        </p>
        <StreakBadge streak={streak} highScore={highScore} size="sm" />
      </div>

      <NotebookSheet className="flex-1 flex flex-col items-center gap-3 p-4">
        {/* Hint button */}
        {!isCorrect && !hintUsed && (
          <button
            type="button"
            data-testid="anlaut-hint"
            onClick={() => {
              playPop();
              setHintUsed(true);
            }}
            className="absolute top-3 right-3 px-3 py-2 rounded-xl bg-butter border-2 border-amber-300 border-b-4 text-sm font-black text-ink active:translate-y-[2px] outline-none cursor-pointer"
          >
            {t.anlautGame.hint}
          </button>
        )}

        {/* Picture */}
        <span className="text-7xl md:text-8xl leading-none pt-2 drop-shadow-[0_6px_6px_rgba(0,0,0,0.12)]">
          {currentItem}
        </span>

        {/* Word line */}
        <div className="min-h-14 flex items-center justify-center w-full border-b-4 border-dashed border-ink/20">
          <span
            className={`font-black tracking-wider text-center select-none ${
              isCorrect
                ? 'text-5xl text-emerald-600 animate-pop-in'
                : hintUsed
                ? 'text-4xl text-ink/70'
                : 'text-3xl text-ink/35 font-mono'
            }`}
          >
            {getPlaceholderWord()}
          </span>
        </div>

        {/* Letter lines or Continue */}
        <div className="flex-1 w-full flex flex-col justify-end gap-2">
          {showContinue ? (
            <KidButton
              color="green"
              size="lg"
              onClick={handleContinue}
              className="w-full rounded-2xl uppercase tracking-wider animate-pop-in"
            >
              {t.anlautGame.continue}
            </KidButton>
          ) : (
            options.map((opt) => (
              <NotebookChoice
                key={opt}
                state={selectedOption !== opt ? 'idle' : isCorrect ? 'correct' : 'wrong'}
                disabled={selectedOption !== null}
                onClick={() => handleOptionSelect(opt)}
                testId="anlaut-option"
              >
                {opt}
              </NotebookChoice>
            ))
          )}
        </div>
      </NotebookSheet>
    </div>
  );
}

export default AnlautGame;
