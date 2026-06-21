import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useTranslation } from '../hooks/useTranslation';

interface EmojiItem {
  emoji: string;
  isOdd: boolean;
}

interface OddOneOutProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
}

const CATEGORIES: Record<string, string[]> = {
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦆', '🦉'],
  fruits: ['🍎', '🍌', '🍇', '🍓', '🍉', '🍒', '🍍', '🍑', '🥝', '🍊', '🍋', '🍐', '🥭', '🥥'],
  vehicles: ['🚗', '🚓', '🚲', '✈️', '🚀', '🚢', '🚂', '🚁', '🚜', '🚒', '🚌', '🏍️', '🚕', '🛥️'],
  sports: ['⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🏒', '🏹', '🛹', '🎳'],
  instruments: ['🎸', '🎺', '🎻', '🎹', '🥁', '🎷', '🪗', '🪘', '🔔'],
  clothing: ['👕', '👖', '👗', '🧥', '🧦', '👟', '👒', '🕶️', '👜', '👑', '🧤', '🧣'],
};

export function OddOneOut({ playPop, playSuccess, playError }: OddOneOutProps) {
  const [items, setItems] = useState<EmojiItem[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const { t } = useTranslation();

  const [streak, setStreak] = useState(() => {
    const saved = localStorage.getItem('odd_streak');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('odd_highscore');
    return saved ? parseInt(saved, 10) : 0;
  });

  const generatePuzzle = () => {
    const keys = Object.keys(CATEGORIES);
    // Pick main category
    const mainCatIndex = Math.floor(Math.random() * keys.length);
    const mainCatKey = keys[mainCatIndex];
    
    // Pick odd category
    let oddCatKey = mainCatKey;
    while (oddCatKey === mainCatKey) {
      const oddCatIndex = Math.floor(Math.random() * keys.length);
      oddCatKey = keys[oddCatIndex];
    }

    const mainEmojis = [...CATEGORIES[mainCatKey]];
    const oddEmojis = [...CATEGORIES[oddCatKey]];

    // Select 3 unique emojis from main category
    const chosenMain: string[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = Math.floor(Math.random() * mainEmojis.length);
      chosenMain.push(mainEmojis.splice(idx, 1)[0]);
    }

    // Select 1 emoji from odd category
    const chosenOdd = oddEmojis[Math.floor(Math.random() * oddEmojis.length)];

    const puzzleItems: EmojiItem[] = [
      ...chosenMain.map((emoji) => ({ emoji, isOdd: false })),
      { emoji: chosenOdd, isOdd: true },
    ];

    // Shuffle
    setItems(puzzleItems.sort(() => Math.random() - 0.5));
    setSelectedEmoji(null);
    setIsCorrect(null);
  };

  useEffect(() => {
    generatePuzzle();
  }, []);

  const handleEmojiSelect = (item: EmojiItem) => {
    if (selectedEmoji !== null) return;
    
    setSelectedEmoji(item.emoji);
    
    if (item.isOdd) {
      setIsCorrect(true);
      setShowConfetti(true);
      playSuccess();

      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('odd_streak', newStreak.toString());

      if (newStreak > highScore) {
        setHighScore(newStreak);
        localStorage.setItem('odd_highscore', newStreak.toString());
      }

      setTimeout(() => {
        setShowConfetti(false);
        generatePuzzle();
      }, 1800);
    } else {
      setIsCorrect(false);
      playError();
      setStreak(0);
      localStorage.setItem('odd_streak', '0');

      setTimeout(() => {
        setSelectedEmoji(null);
        setIsCorrect(null);
      }, 1000);
    }
  };

  const buttonBackgrounds = [
    'bg-amber-100 hover:bg-amber-200 border-amber-300 shadow-[0_8px_0_0_#d97706]',
    'bg-rose-100 hover:bg-rose-200 border-rose-300 shadow-[0_8px_0_0_#e11d48]',
    'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 shadow-[0_8px_0_0_#059669]',
    'bg-violet-100 hover:bg-violet-200 border-violet-300 shadow-[0_8px_0_0_#7c3aed]',
  ];

  const activeShadows = [
    'shadow-[0_2px_0_0_#d97706]',
    'shadow-[0_2px_0_0_#e11d48]',
    'shadow-[0_2px_0_0_#059669]',
    'shadow-[0_2px_0_0_#7c3aed]',
  ];

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

      {/* Header Info */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.oddOneOut.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">{t.oddOneOut.subtitle}</p>
        
        {/* Streak Counters */}
        <div className="flex gap-4 items-center justify-center pt-1">
          <span className="bg-amber-100 text-amber-600 font-extrabold px-4 py-1 rounded-full border-2 border-amber-300 text-xs shadow-sm">
            ✨ {streak}
          </span>
          <span className="bg-indigo-100 text-indigo-600 font-extrabold px-4 py-1 rounded-full border-2 border-indigo-300 text-xs shadow-sm">
            🏆 {highScore}
          </span>
        </div>
      </div>

      {/* 2x2 Grid */}
      <div className="flex-1 flex items-center justify-center my-8 w-full max-w-sm">
        <div className="grid grid-cols-2 gap-6 w-full aspect-square">
          {items.map((item, idx) => {
            const isThisSelected = selectedEmoji === item.emoji;
            const bgClass = buttonBackgrounds[idx % buttonBackgrounds.length];
            const activeShadowClass = activeShadows[idx % activeShadows.length];

            let stateClass = bgClass;
            let shadowClass = '';

            if (isThisSelected) {
              if (isCorrect === true) {
                stateClass = 'bg-emerald-400 border-emerald-500 text-white scale-95 translate-y-[6px]';
                shadowClass = 'shadow-[0_2px_0_0_#059669]';
              } else if (isCorrect === false) {
                stateClass = 'bg-red-400 border-red-500 text-white scale-95 translate-y-[6px] animate-shake';
                shadowClass = 'shadow-[0_2px_0_0_#b91c1c]';
              }
            }

            return (
              <button
                key={item.emoji}
                disabled={selectedEmoji !== null}
                onClick={() => handleEmojiSelect(item)}
                className={`
                  w-full h-full rounded-[2.5rem] border-4 flex items-center justify-center
                  text-7xl md:text-8xl transition-all duration-75 cursor-pointer outline-none
                  select-none active:translate-y-[6px]
                  ${stateClass}
                  ${shadowClass || `active:${activeShadowClass}`}
                `}
              >
                <span className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.15)] transform active:scale-95 transition-transform duration-75">
                  {item.emoji}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-slate-400 font-extrabold text-xs pb-4 text-center">
        {t.oddOneOut.help}
      </div>
    </div>
  );
}

export default OddOneOut;
