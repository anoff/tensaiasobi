import React, { useState, useEffect } from 'react';
import Confetti from 'react-confetti';

type GameLevel = 'easy' | 'medium' | 'hard';

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryMatchProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
}

const ANIMAL_POOL = ['🦁', '🐯', '🐼', '🐨', '🦊', '🐰', '🐸', '🐷', '🐮', '🐔', '🐧', '🦉', '🐻', '🐹', '🐭', '🐱'];

export function MemoryMatch({ playPop, playSuccess, playError }: MemoryMatchProps) {
  const [level, setLevel] = useState<GameLevel>('easy');
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [matches, setMatches] = useState(0);

  const initGame = (currentLevel: GameLevel) => {
    let numPairs = 2; // easy (2x2)
    if (currentLevel === 'medium') numPairs = 6; // (3x4)
    if (currentLevel === 'hard') numPairs = 8; // (4x4)

    // Select random unique animal emojis from the pool
    const selectedAnimals = [...ANIMAL_POOL]
      .sort(() => Math.random() - 0.5)
      .slice(0, numPairs);

    // Create pairs and shuffle them
    const cardsPool = [...selectedAnimals, ...selectedAnimals]
      .sort(() => Math.random() - 0.5)
      .map((emoji, index) => ({
        id: index,
        emoji,
        isFlipped: false,
        isMatched: false,
      }));

    setCards(cardsPool);
    setSelectedCards([]);
    setMatches(0);
    setShowConfetti(false);
  };

  useEffect(() => {
    initGame(level);
  }, [level]);

  const handleCardClick = (cardId: number) => {
    // Ignore clicks if 2 cards are already flipped/processing
    if (selectedCards.length >= 2) return;

    const clickedCard = cards.find((c) => c.id === cardId);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    playPop();

    // Flip card
    const updatedCards = cards.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c));
    setCards(updatedCards);

    const nextSelection = [...selectedCards, cardId];
    setSelectedCards(nextSelection);

    if (nextSelection.length === 2) {
      const [firstId, secondId] = nextSelection;
      const card1 = cards.find((c) => c.id === firstId);
      const card2 = cards.find((c) => c.id === secondId);

      if (card1 && card2 && card1.emoji === card2.emoji) {
        // MATCH FOUND
        setTimeout(() => {
          playSuccess();
          const matchedCards = updatedCards.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          setSelectedCards([]);
          
          const newMatches = matches + 1;
          setMatches(newMatches);

          // Check if all matched
          const totalPairs = level === 'easy' ? 2 : level === 'medium' ? 6 : 8;
          if (newMatches === totalPairs) {
            setShowConfetti(true);
            setTimeout(() => {
              initGame(level);
            }, 3000);
          }
        }, 300);
      } else {
        // NO MATCH
        setTimeout(() => {
          playError();
          const resetCards = updatedCards.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, isFlipped: false } : c
          );
          setCards(resetCards);
          setSelectedCards([]);
        }, 1000);
      }
    }
  };

  const handleLevelChange = (lvl: GameLevel) => {
    playPop();
    setLevel(lvl);
  };

  const getGridCols = () => {
    if (level === 'easy') return 'grid-cols-2 max-w-[240px]';
    if (level === 'medium') return 'grid-cols-3 max-w-[320px]';
    return 'grid-cols-4 max-w-[360px]';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={140}
          recycle={false}
        />
      )}

      {/* Header Info */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">Animal Match! 🐯</h2>
        <p className="text-slate-500 font-extrabold text-sm">Flip cards to match the animal pairs!</p>
      </div>

      {/* Level Selection Tabs */}
      <div className="w-full flex justify-between bg-slate-200/80 p-1.5 rounded-2xl border-2 border-slate-300 gap-1.5 mt-4">
        {(['easy', 'medium', 'hard'] as GameLevel[]).map((lvl) => (
          <button
            key={lvl}
            onClick={() => handleLevelChange(lvl)}
            className={`
              flex-1 py-2 text-sm font-black rounded-xl capitalize border-b-4 transition-all duration-75 outline-none cursor-pointer
              ${
                level === lvl
                  ? 'bg-candy-purple text-white border-purple-700 shadow-sm translate-y-[2px]'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }
            `}
          >
            {lvl}
          </button>
        ))}
      </div>

      {/* Grid Container */}
      <div className="flex-1 flex items-center justify-center my-6 w-full">
        <div className={`grid gap-4 w-full aspect-[4/5] justify-center items-center ${getGridCols()}`}>
          {cards.map((card) => {
            const isOpen = card.isFlipped || card.isMatched;

            return (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={`
                  w-full aspect-square rounded-2xl border-4 text-5xl flex items-center justify-center
                  transition-all duration-300 transform outline-none cursor-pointer relative preserve-3d
                  ${isOpen ? '[transform:rotateY(180deg)]' : ''}
                  ${card.isMatched ? 'bg-emerald-100 border-emerald-400 opacity-80' : ''}
                `}
              >
                {/* Back side */}
                <div
                  className={`
                    absolute inset-0 w-full h-full rounded-xl flex items-center justify-center backface-hidden text-white font-extrabold text-3xl border-slate-300
                    bg-gradient-to-br from-candy-pink to-pink-500 shadow-[0_6px_0_0_#d81b60] border-2
                    ${isOpen ? 'hidden' : 'flex'}
                  `}
                >
                  ❓
                </div>

                {/* Front side */}
                <div
                  className={`
                    absolute inset-0 w-full h-full rounded-xl flex items-center justify-center backface-hidden [transform:rotateY(180deg)] bg-white border-2 border-slate-200
                    ${isOpen ? 'flex shadow-inner' : 'hidden'}
                  `}
                >
                  <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)] select-none">
                    {card.emoji}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-slate-400 font-extrabold text-xs pb-4">
        {showConfetti ? '🎉 Great job! You matched them all!' : 'Tap cards to flip them!'}
      </div>
    </div>
  );
}

export default MemoryMatch;
