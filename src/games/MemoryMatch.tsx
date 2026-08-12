import { useState, useEffect } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { shuffle } from '../utils/shuffle';
import { starMultiplier } from '../utils/difficulty';


interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const ANIMAL_POOL = ['🦁', '🐯', '🐼', '🐨', '🦊', '🐰', '🐸', '🐷', '🐮', '🐔', '🐧', '🦉', '🐻', '🐹', '🐭', '🐱'];

export function MemoryMatch({ playPop, playSuccess, playError, onStarEarned }: GameProps) {
  const [level, setLevel] = useState<GameDifficulty>('easy');
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [matches, setMatches] = useState(0);
  const { t } = useTranslation();

  const initGame = (currentLevel: GameDifficulty) => {
    let numPairs = 2; // easy (2x2)
    if (currentLevel === 'medium') numPairs = 6; // (3x4)
    if (currentLevel === 'hard') numPairs = 8; // (4x4)


    const selectedAnimals = shuffle(ANIMAL_POOL).slice(0, numPairs);


    const cardsPool = shuffle([...selectedAnimals, ...selectedAnimals])
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initGame(level);
  }, [level]);

  const handleCardClick = (cardId: number) => {
    // Ignore clicks if 2 cards are already flipped/processing
    if (selectedCards.length >= 2) return;

    const clickedCard = cards.find((c) => c.id === cardId);
    if (!clickedCard || clickedCard.isFlipped || clickedCard.isMatched) return;

    playPop();


    const updatedCards = cards.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c));
    setCards(updatedCards);

    const nextSelection = [...selectedCards, cardId];
    setSelectedCards(nextSelection);

    if (nextSelection.length === 2) {
      const [firstId, secondId] = nextSelection;
      const card1 = cards.find((c) => c.id === firstId);
      const card2 = cards.find((c) => c.id === secondId);

      if (card1 && card2 && card1.emoji === card2.emoji) {

        setTimeout(() => {
          playSuccess();
          const matchedCards = updatedCards.map((c) =>
            c.id === firstId || c.id === secondId ? { ...c, isMatched: true } : c
          );
          setCards(matchedCards);
          setSelectedCards([]);
          
          const newMatches = matches + 1;
          setMatches(newMatches);


          const totalPairs = level === 'easy' ? 2 : level === 'medium' ? 6 : 8;
          if (newMatches === totalPairs) {
            setShowConfetti(true);
            // Award 4 stars × level multiplier
            const multiplier = starMultiplier(level);
            onStarEarned?.(4 * multiplier);
            setTimeout(() => {
              initGame(level);
            }, 3000);
          }
        }, 300);
      } else {

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

  const handleLevelChange = (lvl: GameDifficulty) => {
    playPop();
    setLevel(lvl);
  };

  const getGridLayout = () => {
    if (level === 'easy') return { columns: 2, maxWidth: 'max-w-[240px]' };
    if (level === 'medium') return { columns: 3, maxWidth: 'max-w-[320px]' };
    return { columns: 4, maxWidth: 'max-w-[360px]' };
  };
  const gridLayout = getGridLayout();

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-6 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <GameConfetti pieces={140} />
      )}

      {/* Header Info */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.memoryMatch.title}</h2>
        <p className="text-slate-500 font-extrabold text-sm">{t.memoryMatch.subtitle}</p>
      </div>

      {/* Level Selection Tabs */}
      <DifficultySelector
        selected={level}
        options={['easy', 'medium', 'hard']}
        onChange={handleLevelChange}
        className="mt-4"
      />

      {/* Grid Container */}
      <div className="flex-1 flex items-center justify-center my-6 w-full">
        <div
          className={`grid gap-4 w-full justify-center items-center ${gridLayout.maxWidth}`}
          style={{ gridTemplateColumns: `repeat(${gridLayout.columns}, minmax(0, 1fr))` }}
        >
          {cards.map((card) => {
            const isOpen = card.isFlipped || card.isMatched;

            return (
              <button
                key={card.id}
                data-testid="memory-card"
                onClick={() => handleCardClick(card.id)}
                className={`
                  w-full aspect-square rounded-2xl border-4 text-5xl flex items-center justify-center
                  transition-all duration-300 transform outline-none cursor-pointer relative
                  ${card.isMatched ? 'bg-emerald-100 border-emerald-400 opacity-80' : ''}
                `}
              >
                {isOpen ? (
                  <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)] select-none">
                    {card.emoji}
                  </span>
                ) : (
                  <span className="text-white font-extrabold text-3xl">
                    ❓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="text-slate-400 font-extrabold text-xs pb-4 text-center">
        {showConfetti ? t.memoryMatch.victory : t.memoryMatch.help}
      </div>
    </div>
  );
}

export default MemoryMatch;
