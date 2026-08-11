import { useState, useMemo } from 'react';
import GameConfetti from '../components/GameConfetti';
import KidButton from '../components/KidButton';
import StreakBadge from '../components/StreakBadge';
import { useTranslation } from '../hooks/useTranslation';
import { useStreak } from '../hooks/useStreak';
import { shuffle } from '../utils/shuffle';
import type { GameProps } from '../types/game';
import AnswerBubble from '../components/AnswerBubble';

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

export function AnlautGame({ playPop, playSuccess, playError, onStarEarned, challengeMode }: GameProps) {
  const { language, t } = useTranslation();

  const [currentItem, setCurrentItem] = useState<string>(() => {
    const randomIndex = Math.floor(Math.random() * EMOJI_ITEMS.length);
    return EMOJI_ITEMS[randomIndex];
  });

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [hintUsed, setHintUsed] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);

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
    <div className="flex-1 flex flex-col items-center justify-between p-6 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <GameConfetti pieces={120} />
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
        <StreakBadge streak={streak} highScore={highScore} />
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

              return (
                <AnswerBubble
                  key={opt}
                  selected={isThisSelected}
                  correct={isCorrect}
                  disabled={selectedOption !== null}
                  onClick={() => handleOptionSelect(opt)}
                  testId="anlaut-option"
                  className="text-4xl md:text-5xl font-black text-white"
                >
                  {opt}
                </AnswerBubble>
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
