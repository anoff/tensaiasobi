import { useState, useEffect, useRef } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { shuffle } from '../utils/shuffle';

// Precomputed Dobble card index decks (one shared symbol per pair of cards)
const DECK_EASY: number[][] = [[16,17,18,19,20],[0,1,2,3,20],[4,5,6,7,20],[8,9,10,11,20],[12,13,14,15,20],[0,4,8,12,16],[1,5,9,13,16],[2,6,10,14,16],[3,7,11,15,16],[0,5,10,15,17],[1,4,11,14,17],[2,7,8,13,17],[3,6,9,12,17],[0,6,11,13,18],[1,7,10,12,18],[2,4,9,15,18],[3,5,8,14,18],[0,7,9,14,19],[1,6,8,15,19],[2,5,11,12,19],[3,4,10,13,19]];
const DECK_MEDIUM: number[][] = [[25,26,27,28,29,30],[0,1,2,3,4,30],[5,6,7,8,9,30],[10,11,12,13,14,30],[15,16,17,18,19,30],[20,21,22,23,24,30],[0,5,10,15,20,25],[1,6,11,16,21,25],[2,7,12,17,22,25],[3,8,13,18,23,25],[4,9,14,19,24,25],[0,6,12,18,24,26],[1,7,13,19,20,26],[2,8,14,15,21,26],[3,9,10,16,22,26],[4,5,11,17,23,26],[0,7,14,16,23,27],[1,8,10,17,24,27],[2,9,11,18,20,27],[3,5,12,19,21,27],[4,6,13,15,22,27],[0,8,11,19,22,28],[1,9,12,15,23,28],[2,5,13,16,24,28],[3,6,14,17,20,28],[4,7,10,18,21,28],[0,9,13,17,21,29],[1,5,14,18,22,29],[2,6,10,19,23,29],[3,7,11,15,24,29],[4,8,12,16,20,29]];
const DECK_HARD: number[][] = [[49,50,51,52,53,54,55,56],[0,1,2,3,4,5,6,56],[7,8,9,10,11,12,13,56],[14,15,16,17,18,19,20,56],[21,22,23,24,25,26,27,56],[28,29,30,31,32,33,34,56],[35,36,37,38,39,40,41,56],[42,43,44,45,46,47,48,56],[0,7,14,21,28,35,42,49],[1,8,15,22,29,36,43,49],[2,9,16,23,30,37,44,49],[3,10,17,24,31,38,45,49],[4,11,18,25,32,39,46,49],[5,12,19,26,33,40,47,49],[6,13,20,27,34,41,48,49],[0,8,16,24,32,40,48,50],[1,9,17,25,33,41,42,50],[2,10,18,26,34,35,43,50],[3,11,19,27,28,36,44,50],[4,12,20,21,29,37,45,50],[5,13,14,22,30,38,46,50],[6,7,15,23,31,39,47,50],[0,9,18,27,29,38,47,51],[1,10,19,21,30,39,48,51],[2,11,20,22,31,40,42,51],[3,12,14,23,32,41,43,51],[4,13,15,24,33,35,44,51],[5,7,16,25,34,36,45,51],[6,8,17,26,28,37,46,51],[0,10,20,23,33,36,46,52],[1,11,14,24,34,37,47,52],[2,12,15,25,28,38,48,52],[3,13,16,26,29,39,42,52],[4,7,17,27,30,40,43,52],[5,8,18,21,31,41,44,52],[6,9,19,22,32,35,45,52],[0,11,15,26,30,41,45,53],[1,12,16,27,31,35,46,53],[2,13,17,21,32,36,47,53],[3,7,18,22,33,37,48,53],[4,8,19,23,34,38,42,53],[5,9,20,24,28,39,43,53],[6,10,14,25,29,40,44,53],[0,12,17,22,34,39,44,54],[1,13,18,23,28,40,45,54],[2,7,19,24,29,41,46,54],[3,8,20,25,30,35,47,54],[4,9,14,26,31,36,48,54],[5,10,15,27,32,37,42,54],[6,11,16,21,33,38,43,54],[0,13,19,25,31,37,43,55],[1,7,20,26,32,38,44,55],[2,8,14,27,33,39,45,55],[3,9,15,21,34,40,46,55],[4,10,16,22,28,41,47,55],[5,11,17,23,29,35,48,55],[6,12,18,24,30,36,42,55]];

function generateDobbleDeck(q: number): number[][] {
  if (q === 4) return DECK_EASY;
  if (q === 5) return DECK_MEDIUM;
  return DECK_HARD;
}
// Child-friendly emojis for play
const EMOJI_POOL = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦆', '🦉', '🐙',
  '🐝', '🐞', '🦋', '🦖', '🦕', '🐢', '🐠', '🐬', '🦄', '🍎', '🍌', '🍉', '🍇', '🍓', '🍒', '🍍', '🍑', '🍊', '🍋', '🥝',
  '🥑', '🥕', '🌽', '🍕', '🍔', '🍟', '🍩', '🍪', '🧁', '🍿', '🍦', '🚗', '🚓', '🚒', '🚜', '🚲', '🚀', '🛸', '✈️', '🚢',
  '🚂', '🚁', '🎈', '🎁', '🎨', '🎸', '👑', '🔑', '🔔', '💎', '⚽', '🏀', '🎾', '🎲', '🧩', '🧸', '🕶️', '❤️', '⭐', '🌈',
  '🔥', '⚡', '🍀', '☀️', '🌙', '☁️', '❄️', '🌲', '🌸', '🍄', '👻', '🤖'
];

interface CardEmoji {
  emoji: string;
  x: number;      // % offset from center
  y: number;      // % offset from center
  rotation: number; // degrees
  scale: number;    // scale factor
}

interface DobbleCard {
  id: number;
  emojis: CardEmoji[];
}

function getCardLayout(emojis: string[], q: number): CardEmoji[] {
  const layout: CardEmoji[] = [];
  const numEmojis = q + 1;


  layout.push({
    emoji: emojis[0],
    x: (Math.random() - 0.5) * 6, // slight center jitter (+/- 3%)
    y: (Math.random() - 0.5) * 6,
    rotation: Math.floor(Math.random() * 360),
    scale: q === 4 ? 1.05 + Math.random() * 0.2 : 0.85 + Math.random() * 0.35 // larger for easy
  });


  const numOuter = numEmojis - 1;
  const radius = q === 4 ? 26 : q === 5 ? 31 : 33; // base radius in % to prevent overflow

  for (let i = 0; i < numOuter; i++) {
    const baseAngle = (2 * Math.PI * i) / numOuter;

    const angleJitter = (Math.random() - 0.5) * 0.22; // ~ +/- 6 degrees
    const angle = baseAngle + angleJitter;

    const radialJitter = (Math.random() - 0.5) * 4; // +/- 2%
    const r = radius + radialJitter;

    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    layout.push({
      emoji: emojis[i + 1],
      x,
      y,
      rotation: Math.floor(Math.random() * 360),
      scale: q === 4 ? 1.05 + Math.random() * 0.2 : 0.85 + Math.random() * 0.35 // larger for easy
    });
  }

  // Shuffle order to avoid DOM z-index bias
  return shuffle(layout);
}

function buildShuffledDeck(q: number): DobbleCard[] {
  const indicesDeck = generateDobbleDeck(q);
  const numUniqueEmojis = q * q + q + 1;
  const chosenEmojis = shuffle(EMOJI_POOL).slice(0, numUniqueEmojis);

  const cards: DobbleCard[] = indicesDeck.map((indices, cardId) => {
    const cardEmojis = indices.map((idx) => chosenEmojis[idx]);
    return {
      id: cardId,
      emojis: getCardLayout(cardEmojis, q)
    };
  });

  return shuffle(cards);
}


function findMatch(cardA: DobbleCard, cardB: DobbleCard): string {
  const setA = new Set(cardA.emojis.map(e => e.emoji));
  for (const item of cardB.emojis) {
    if (setA.has(item.emoji)) {
      return item.emoji;
    }
  }
  return '';
}

type Mode = 'solo_time' | 'solo_zen';

type EmojiMatchProps = GameProps;

export function EmojiMatch({ playPop, playSuccess, playError, onStarEarned, challengeMode }: EmojiMatchProps) {
  const { t } = useTranslation();


  const [gameStarted, setGameStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');
  const [mode, setMode] = useState<Mode>('solo_zen');


  const [deck, setDeck] = useState<DobbleCard[]>([]);
  const [deckIndex, setDeckIndex] = useState(0);
  const [cardA, setCardA] = useState<DobbleCard | null>(null);
  const [cardB, setCardB] = useState<DobbleCard | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [matchedEmoji, setMatchedEmoji] = useState<string | null>(null);
  const [shakeCard, setShakeCard] = useState<'A' | 'B' | null>(null);
  
  // Rotational key to trigger slide/fade animations on card swap
  const [cardAKey, setCardAKey] = useState(0);
  const [cardBKey, setCardBKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getQ = (diff: GameDifficulty) => {
    if (diff === 'easy') return 4;   // 5 emojis
    if (diff === 'medium') return 5; // 6 emojis
    return 7;                        // 8 emojis
  };

  const getStars = (diff: GameDifficulty) => {
    if (diff === 'easy') return 1;
    if (diff === 'medium') return 2;
    return 3;
  };

  const loadHighScore = (diff: GameDifficulty, gameMode: Mode) => {
    try {
      const saved = localStorage.getItem(`dobble_high_${gameMode}_${diff}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  };

  const saveHighScore = (diff: GameDifficulty, gameMode: Mode, val: number) => {
    try {
      localStorage.setItem(`dobble_high_${gameMode}_${diff}`, val.toString());
    } catch (e) {
      console.error('Error saving highscore', e);
    }
  };

  const [highScore, setHighScore] = useState(0);


  const initGame = (diff: GameDifficulty, gMode: Mode) => {
    const q = getQ(diff);
    const newDeck = buildShuffledDeck(q);
    
    setDeck(newDeck);
    setScore(0);
    setStreak(0);
    setCombo(0);
    setIsGameOver(false);
    setShowConfetti(false);
    setMatchedEmoji(null);


    setHighScore(loadHighScore(diff, gMode));

    setCardA(newDeck[0]);
    setCardB(newDeck[1]);
    setDeckIndex(2);
    if (gMode === 'solo_time') {
      const startSecs = diff === 'medium' ? 45 : 50;
      setTimeLeft(startSecs);
    }

    setGameStarted(true);
  };


  useEffect(() => {
    if (gameStarted && mode === 'solo_time' && !isGameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsGameOver(true);
            playError();
            if (timerRef.current) clearInterval(timerRef.current);
            

            const currentHigh = loadHighScore(difficulty, mode);
            if (score > currentHigh) {
              saveHighScore(difficulty, mode, score);
              setHighScore(score);
              setShowConfetti(true);
              playSuccess();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, mode, isGameOver, score, difficulty, playError, playSuccess]);


  const drawCard = (currentDeck: DobbleCard[], index: number) => {
    if (index >= currentDeck.length) {

      const q = getQ(difficulty);
      const recycled = buildShuffledDeck(q);
      setDeck(recycled);
      setDeckIndex(1);
      return recycled[0];
    }
    setDeckIndex(index + 1);
    return currentDeck[index];
  };


  const handleSoloTap = (emoji: string, cardSource: 'A' | 'B') => {
    if (isGameOver || !cardA || !cardB || matchedEmoji) return;

    const correctMatch = findMatch(cardA, cardB);

    if (emoji === correctMatch) {
      // Correct!
      setMatchedEmoji(emoji);
      playSuccess();


      const starsEarned = getStars(difficulty);
      onStarEarned?.(starsEarned);


      const newScore = score + 1;
      setScore(newScore);

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak % 5 === 0) {
        setCombo(newStreak);
        setTimeout(() => setCombo(0), 1000);
      }


      if (mode === 'solo_time') {
        const bonus = difficulty === 'medium' ? 2 : 3;
        setTimeLeft((t) => Math.min(t + bonus, 99));
      }


      if (mode === 'solo_zen') {
        const currentHigh = loadHighScore(difficulty, mode);
        if (newScore > currentHigh) {
          saveHighScore(difficulty, mode, newScore);
          setHighScore(newScore);
        }
      }


      setTimeout(() => {
        setMatchedEmoji(null);
        
        // Classic rule: Card B becomes old Card A, Card A draws a new one
        setCardB(cardA);
        setCardBKey(prev => prev + 1);
        
        const nextCard = drawCard(deck, deckIndex);
        setCardA(nextCard);
        setCardAKey(prev => prev + 1);
      }, 500);
    } else {
      // Wrong!
      playError();
      setStreak(0);
      setShakeCard(cardSource);
      

      if (mode === 'solo_time') {
        const penalty = difficulty === 'medium' ? 3 : 4;
        setTimeLeft((t) => Math.max(t - penalty, 0));
      }

      if (challengeMode) {
        setTimeout(() => {
          setShakeCard(null);
          // Classic rule: Card B becomes old Card A, Card A draws a new one
          setCardB(cardA);
          setCardBKey(prev => prev + 1);
          
          const nextCard = drawCard(deck, deckIndex);
          setCardA(nextCard);
          setCardAKey(prev => prev + 1);
        }, 1500);
      } else {
        setTimeout(() => setShakeCard(null), 500);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between w-full h-full select-none max-w-lg mx-auto relative">
      {showConfetti && (
        <GameConfetti pieces={140} />
      )}

      {!gameStarted ? (
        // Mode & Difficulty Selection screen
        <div className="flex-1 flex flex-col justify-center items-center w-full p-4 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-4xl font-black text-slate-800 tracking-tight">{t.emojiMatch.title}</h2>
            <p className="text-slate-500 font-extrabold text-sm">{t.emojiMatch.subtitle}</p>
          </div>

          {/* Difficulty selector */}
          <div className="w-full space-y-2">
            <span className="text-slate-400 font-black text-xs uppercase tracking-wider block text-center">
              1. {t.shapeTrace.victory.includes('🎉') ? 'Difficulty' : 'Schwierigkeit / 難易度'}
            </span>
            <DifficultySelector
              selected={difficulty}
              options={['easy', 'medium', 'hard']}
              onChange={(diff) => { playPop(); setDifficulty(diff); }}
            />
          </div>

          {/* Game Modes selector */}
          <div className="w-full space-y-3 pt-2">
            <span className="text-slate-400 font-black text-xs uppercase tracking-wider block text-center">
              2. Choose Mode
            </span>

            {/* Solo Zen Mode */}
            <button
              data-testid="start-solo-zen"
              onClick={() => { playPop(); setMode('solo_zen'); initGame(difficulty, 'solo_zen'); }}
              className="w-full py-4 bg-white hover:bg-slate-50 border-4 border-slate-300 rounded-[2rem] shadow-[0_8px_0_0_#cbd5e1] font-black text-slate-700 text-lg flex items-center justify-center gap-3 transition-all active:translate-y-[6px] active:shadow-[0_2px_0_0_#cbd5e1] outline-none cursor-pointer"
            >
              <span>😌</span> {t.emojiMatch.soloZen}
            </button>

            {/* Solo Time Attack Mode (Disabled on Easy) */}
            {difficulty !== 'easy' ? (
              <button
                data-testid="start-solo-time"
                onClick={() => { playPop(); setMode('solo_time'); initGame(difficulty, 'solo_time'); }}
                className="w-full py-4 bg-white hover:bg-slate-50 border-4 border-candy-orange/80 rounded-[2rem] shadow-[0_8px_0_0_#ff8f00] font-black text-orange-600 text-lg flex items-center justify-center gap-3 transition-all active:translate-y-[6px] active:shadow-[0_2px_0_0_#ff8f00] outline-none cursor-pointer animate-pulse"
              >
                <span>⚡</span> {t.emojiMatch.soloTime}
              </button>
            ) : (
              <div className="w-full py-4 bg-slate-100 border-4 border-slate-200 border-dashed rounded-[2rem] font-bold text-slate-400 text-sm flex items-center justify-center gap-2 cursor-not-allowed">
                <span>🔒</span> {t.emojiMatch.soloTime} ({t.emojiMatch.easy} - Zen Only)
              </div>
            )}

          </div>
        </div>
      ) : (

        <div className="flex-1 flex flex-col justify-between w-full p-4 relative">
          
          {/* Header Stats */}
          <div className="w-full flex justify-between items-center bg-white/70 backdrop-blur-sm px-4 py-2 border-2 border-slate-200 rounded-2xl shadow-sm z-20">
            <button
              onClick={() => { playPop(); setGameStarted(false); }}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-xs rounded-full cursor-pointer outline-none transition-colors"
            >
              ⬅️ Exit
            </button>

            <div className="flex items-center gap-3">
              {mode === 'solo_time' && (
                <div className={`px-3 py-1 font-black text-sm rounded-full border-2 ${timeLeft <= 10 ? 'bg-red-100 text-red-600 border-red-300 animate-bounce' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                  ⏰ {timeLeft}{t.emojiMatch.seconds}
                </div>
              )}
              <div className="font-extrabold text-sm text-slate-600">
                ✨ {t.emojiMatch.score}{score}
              </div>
              <div className="font-extrabold text-sm text-slate-400">
                🏆 {t.emojiMatch.highScore}{highScore}
              </div>
            </div>
          </div>

          {/* Time Attack progress bar */}
          {mode === 'solo_time' && !isGameOver && (
            <div className="w-full h-2.5 bg-slate-200 rounded-full mt-2 overflow-hidden border">
              <div
                style={{ width: `${Math.min((timeLeft / (difficulty === 'medium' ? 45 : 50)) * 100, 100)}%` }}
                className={`h-full transition-all duration-300 ${timeLeft <= 10 ? 'bg-red-500 animate-pulse' : 'bg-candy-orange'}`}
              />
            </div>
          )}

          {/* Game Over Screen Overlay */}
          {isGameOver && (
            <div className="absolute inset-0 bg-sky-50/90 backdrop-blur-md flex flex-col justify-center items-center p-6 rounded-3xl z-40 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-4xl font-black text-slate-800">{t.emojiMatch.gameOver}</h3>
                <p className="text-slate-500 font-extrabold text-lg">
                  {t.emojiMatch.score} {score} {t.emojiMatch.points}
                </p>
                {score >= highScore && score > 0 && (
                  <p className="text-candy-pink font-black text-xl animate-bounce">
                    🎉 New High Score! 🎉
                  </p>
                )}
              </div>

              <button
                onClick={() => { playPop(); initGame(difficulty, mode); }}
                className="px-8 py-3 bg-candy-purple hover:bg-purple-400 text-white font-black text-lg rounded-2xl shadow-[0_6px_0_0_#9c27b0] border-2 border-purple-500 active:translate-y-[4px] active:shadow-[0_2px_0_0_#9c27b0] cursor-pointer outline-none"
              >
                🔄 {t.emojiMatch.playAgain}
              </button>

              <button
                onClick={() => { playPop(); setGameStarted(false); }}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-black text-sm rounded-xl cursor-pointer outline-none transition-colors"
              >
                Menu
              </button>
            </div>
          )}

          {/* Emojis matching popups */}
          {combo > 0 && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none bg-yellow-400 border-4 border-white text-white font-black text-2xl px-6 py-3 rounded-full shadow-lg scale-125 animate-bounce">
              🔥 {streak} COMBO!
            </div>
          )}

          {/* Active Cards Workspace */}
          <div className="flex-1 flex flex-col justify-center items-center gap-6 my-4 w-full">
            {/* Card A (top) */}
            <div
              key={`cardA-${cardAKey}`}
              data-testid="emoji-match-card-1"
              className={`
                w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-white border-4 border-slate-300 shadow-md relative overflow-hidden flex items-center justify-center transition-all duration-350
                ${shakeCard === 'A' ? 'animate-shake' : 'animate-card-in'}
              `}
            >
              {cardA?.emojis.map((item, idx) => {
                const isMatched = matchedEmoji === item.emoji;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSoloTap(item.emoji, 'A')}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${item.x}%)`,
                      top: `calc(50% + ${item.y}%)`,
                      transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                      transition: 'transform 0.15s ease-out',
                    }}
                    className={`
                      hover:scale-125 active:scale-95 select-none outline-none cursor-pointer transition-all duration-75 text-center leading-none
                      ${difficulty === 'easy' ? 'text-6xl sm:text-7xl' : difficulty === 'medium' ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}
                      ${isMatched ? 'animate-emoji-pop scale-150 z-30 relative' : ''}
                    `}
                  >
                    <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)] block">
                      {item.emoji}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Visual separator or helper banner */}
            <div className="text-slate-400 font-extrabold text-xs tracking-wide">
              {t.emojiMatch.subtitle}
            </div>

            {/* Card B (bottom) */}
            <div
              key={`cardB-${cardBKey}`}
              data-testid="emoji-match-card-2"
              className={`
                w-60 h-60 sm:w-72 sm:h-72 rounded-full bg-white border-4 border-slate-300 shadow-md relative overflow-hidden flex items-center justify-center transition-all duration-350
                ${shakeCard === 'B' ? 'animate-shake' : 'animate-card-in'}
              `}
            >
              {cardB?.emojis.map((item, idx) => {
                const isMatched = matchedEmoji === item.emoji;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSoloTap(item.emoji, 'B')}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${item.x}%)`,
                      top: `calc(50% + ${item.y}%)`,
                      transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                      transition: 'transform 0.15s ease-out',
                    }}
                    className={`
                      hover:scale-125 active:scale-95 select-none outline-none cursor-pointer transition-all duration-75 text-center leading-none
                      ${difficulty === 'easy' ? 'text-6xl sm:text-7xl' : difficulty === 'medium' ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'}
                      ${isMatched ? 'animate-emoji-pop scale-150 z-30 relative' : ''}
                    `}
                  >
                    <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)] block">
                      {item.emoji}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer help */}
          <div className="text-center text-slate-400 font-extrabold text-xs">
            {matchedEmoji ? '✨ 🎉 Matching! 🎉 ✨' : 'Tap the matching emoji!'}
          </div>
        </div>
      )}
    </div>
  );
}

export default EmojiMatch;
