import { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import { useTranslation } from '../hooks/useTranslation';

// Finite Field arithmetic helper for order q
// Specifically, order 4 (easy, 5 emojis), 5 (medium, 6 emojis), 7 (hard, 8 emojis)
function generateDobbleDeck(q: number): number[][] {
  const deck: number[][] = [];

  const add = (x: number, y: number): number => {
    if (q === 4) {
      return x ^ y; // Galois Field F4 addition is bitwise XOR
    }
    return (x + y) % q;
  };

  const mult = (x: number, y: number): number => {
    if (q === 4) {
      if (x === 0 || y === 0) return 0;
      if (x === 1) return y;
      if (y === 1) return x;
      if (x === 2) {
        if (y === 2) return 3;
        if (y === 3) return 1;
      }
      if (x === 3) {
        if (y === 2) return 1;
        if (y === 3) return 2;
      }
      return 0;
    }
    return (x * y) % q;
  };

  // 1. Line at infinity
  const infinityLine: number[] = [];
  for (let i = 0; i < q; i++) {
    infinityLine.push(q * q + i);
  }
  infinityLine.push(q * q + q);
  deck.push(infinityLine);

  // 2. Lines of form x = c
  for (let c = 0; c < q; c++) {
    const line: number[] = [];
    for (let y = 0; y < q; y++) {
      line.push(c * q + y);
    }
    line.push(q * q + q);
    deck.push(line);
  }

  // 3. Lines of form y = mx + c
  for (let m = 0; m < q; m++) {
    for (let c = 0; c < q; c++) {
      const line: number[] = [];
      for (let x = 0; x < q; x++) {
        const y = add(mult(m, x), c);
        line.push(x * q + y);
      }
      line.push(q * q + m);
      deck.push(line);
    }
  }

  return deck;
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

  // Center emoji
  layout.push({
    emoji: emojis[0],
    x: (Math.random() - 0.5) * 6, // slight center jitter (+/- 3%)
    y: (Math.random() - 0.5) * 6,
    rotation: Math.floor(Math.random() * 360),
    scale: q === 4 ? 1.05 + Math.random() * 0.2 : 0.85 + Math.random() * 0.35 // larger for easy
  });

  // Outer ring emojis
  const numOuter = numEmojis - 1;
  const radius = q === 4 ? 26 : q === 5 ? 31 : 33; // base radius in % to prevent overflow

  for (let i = 0; i < numOuter; i++) {
    const baseAngle = (2 * Math.PI * i) / numOuter;
    // Add organic jitter
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
  return layout.sort(() => Math.random() - 0.5);
}

function buildShuffledDeck(q: number): DobbleCard[] {
  const indicesDeck = generateDobbleDeck(q);
  const numUniqueEmojis = q * q + q + 1;
  const chosenEmojis = [...EMOJI_POOL].sort(() => Math.random() - 0.5).slice(0, numUniqueEmojis);

  const cards: DobbleCard[] = indicesDeck.map((indices, cardId) => {
    const cardEmojis = indices.map((idx) => chosenEmojis[idx]);
    return {
      id: cardId,
      emojis: getCardLayout(cardEmojis, q)
    };
  });

  return cards.sort(() => Math.random() - 0.5);
}

// Find the single matching emoji between two cards
function findMatch(cardA: DobbleCard, cardB: DobbleCard): string {
  const setA = new Set(cardA.emojis.map(e => e.emoji));
  for (const item of cardB.emojis) {
    if (setA.has(item.emoji)) {
      return item.emoji;
    }
  }
  return '';
}

type Difficulty = 'easy' | 'medium' | 'hard';
type Mode = 'solo_time' | 'solo_zen' | 'duel';

interface EmojiMatchProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
  onStarEarned?: (amount: number) => void;
}

export function EmojiMatch({ playPop, playSuccess, playError, onStarEarned }: EmojiMatchProps) {
  const { t } = useTranslation();

  // Setup states
  const [gameStarted, setGameStarted] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [mode, setMode] = useState<Mode>('solo_zen');

  // Solo State
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

  // 2-Player Duel State
  const [duelCard1, setDuelCard1] = useState<DobbleCard | null>(null);
  const [duelCard2, setDuelCard2] = useState<DobbleCard | null>(null);
  const [duelScore1, setDuelScore1] = useState(0);
  const [duelScore2, setDuelScore2] = useState(0);
  const [winner, setWinner] = useState<1 | 2 | null>(null);
  const [duelMatchedEmoji, setDuelMatchedEmoji] = useState<string | null>(null);

  // Anti-spam freeze timers
  const [p1Frozen, setP1Frozen] = useState(false);
  const [p2Frozen, setP2Frozen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getQ = (diff: Difficulty) => {
    if (diff === 'easy') return 4;   // 5 emojis
    if (diff === 'medium') return 5; // 6 emojis
    return 7;                        // 8 emojis
  };

  const getStars = (diff: Difficulty) => {
    if (diff === 'easy') return 1;
    if (diff === 'medium') return 2;
    return 3;
  };

  const loadHighScore = (diff: Difficulty, gameMode: Mode) => {
    try {
      const saved = localStorage.getItem(`dobble_high_${gameMode}_${diff}`);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  };

  const saveHighScore = (diff: Difficulty, gameMode: Mode, val: number) => {
    try {
      localStorage.setItem(`dobble_high_${gameMode}_${diff}`, val.toString());
    } catch (e) {
      console.error('Error saving highscore', e);
    }
  };

  const [highScore, setHighScore] = useState(0);

  // Initialize Game Session
  const initGame = (diff: Difficulty, gMode: Mode) => {
    const q = getQ(diff);
    const newDeck = buildShuffledDeck(q);
    
    setDeck(newDeck);
    setScore(0);
    setStreak(0);
    setCombo(0);
    setIsGameOver(false);
    setShowConfetti(false);
    setMatchedEmoji(null);
    setDuelMatchedEmoji(null);
    setWinner(null);
    setDuelScore1(0);
    setDuelScore2(0);
    setP1Frozen(false);
    setP2Frozen(false);

    // Set high score
    setHighScore(loadHighScore(diff, gMode));

    if (gMode === 'duel') {
      setDuelCard1(newDeck[0]);
      setDuelCard2(newDeck[1]);
      setDeckIndex(2);
    } else {
      setCardA(newDeck[0]);
      setCardB(newDeck[1]);
      setDeckIndex(2);
      
      // Timer setup
      if (gMode === 'solo_time') {
        const startSecs = diff === 'medium' ? 45 : 50;
        setTimeLeft(startSecs);
      }
    }

    setGameStarted(true);
  };

  // Timer effect for Time Attack
  useEffect(() => {
    if (gameStarted && mode === 'solo_time' && !isGameOver) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsGameOver(true);
            playError();
            if (timerRef.current) clearInterval(timerRef.current);
            
            // Check high score
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

  // Draw card helper with deck recycling
  const drawCard = (currentDeck: DobbleCard[], index: number) => {
    if (index >= currentDeck.length) {
      // Regenerate deck if empty
      const q = getQ(difficulty);
      const recycled = buildShuffledDeck(q);
      setDeck(recycled);
      setDeckIndex(1);
      return recycled[0];
    }
    setDeckIndex(index + 1);
    return currentDeck[index];
  };

  // Solo Tap Handler
  const handleSoloTap = (emoji: string, cardSource: 'A' | 'B') => {
    if (isGameOver || !cardA || !cardB || matchedEmoji) return;

    const correctMatch = findMatch(cardA, cardB);

    if (emoji === correctMatch) {
      // Correct!
      setMatchedEmoji(emoji);
      playSuccess();

      // Award stars immediately
      const starsEarned = getStars(difficulty);
      onStarEarned?.(starsEarned);

      // Score and Combo calculations
      const newScore = score + 1;
      setScore(newScore);

      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak % 5 === 0) {
        setCombo(newStreak);
        setTimeout(() => setCombo(0), 1000);
      }

      // Time attack bonus
      if (mode === 'solo_time') {
        const bonus = difficulty === 'medium' ? 2 : 3;
        setTimeLeft((t) => Math.min(t + bonus, 99));
      }

      // Update High Score in Zen Mode instantly
      if (mode === 'solo_zen') {
        const currentHigh = loadHighScore(difficulty, mode);
        if (newScore > currentHigh) {
          saveHighScore(difficulty, mode, newScore);
          setHighScore(newScore);
        }
      }

      // Slide card animation transitions
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
      
      // Time Attack penalty
      if (mode === 'solo_time') {
        const penalty = difficulty === 'medium' ? 3 : 4;
        setTimeLeft((t) => Math.max(t - penalty, 0));
      }

      setTimeout(() => setShakeCard(null), 500);
    }
  };

  // 2-Player Duel Tap Handler
  const handleDuelTap = (emoji: string, player: 1 | 2) => {
    if (winner || !duelCard1 || !duelCard2 || duelMatchedEmoji) return;

    // Check if player is frozen (wrong tap penalty)
    if (player === 1 && p1Frozen) return;
    if (player === 2 && p2Frozen) return;

    const correctMatch = findMatch(duelCard1, duelCard2);

    if (emoji === correctMatch) {
      setDuelMatchedEmoji(emoji);
      playSuccess();

      // Award stars to active matched play
      const starsEarned = getStars(difficulty);
      onStarEarned?.(starsEarned);

      let targetScore: number;
      if (player === 1) {
        const newScore = duelScore1 + 1;
        setDuelScore1(newScore);
        targetScore = newScore;
      } else {
        const newScore = duelScore2 + 1;
        setDuelScore2(newScore);
        targetScore = newScore;
      }

      // Check win condition (First to 10)
      if (targetScore >= 10) {
        setTimeout(() => {
          setWinner(player);
          setShowConfetti(true);
          playSuccess();
        }, 500);
        return;
      }

      // Replace card for the opponent so the layout remains fresh
      setTimeout(() => {
        setDuelMatchedEmoji(null);
        const nextCard = drawCard(deck, deckIndex);
        if (player === 1) {
          // P1 matched. Keep P1 card, swap P2 card
          setDuelCard2(nextCard);
          setCardAKey(prev => prev + 1);
        } else {
          // P2 matched. Keep P2 card, swap P1 card
          setDuelCard1(nextCard);
          setCardBKey(prev => prev + 1);
        }
      }, 500);
    } else {
      // Wrong tap penalty: Freeze clicking for 1.5 seconds
      playError();
      if (player === 1) {
        setP1Frozen(true);
        setTimeout(() => setP1Frozen(false), 1500);
      } else {
        setP2Frozen(true);
        setTimeout(() => setP2Frozen(false), 1500);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between w-full h-full select-none max-w-lg mx-auto relative">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={140}
          recycle={false}
        />
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
            <div className="grid grid-cols-3 bg-slate-200/80 p-1.5 rounded-2xl border-2 border-slate-300 gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => {
                const isActive = difficulty === diff;
                let activeColor = 'bg-candy-green border-emerald-600';
                if (diff === 'medium') activeColor = 'bg-candy-orange border-orange-600';
                if (diff === 'hard') activeColor = 'bg-candy-pink border-pink-600';

                return (
                  <button
                    key={diff}
                    data-testid={`difficulty-${diff}`}
                    onClick={() => { playPop(); setDifficulty(diff); }}
                    className={`
                      py-2.5 text-sm font-black rounded-xl capitalize border-b-4 transition-all duration-75 outline-none cursor-pointer
                      ${
                        isActive
                          ? `${activeColor} text-white shadow-sm translate-y-[2px]`
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }
                    `}
                  >
                    {t.emojiMatch[diff]}
                    <span className="block text-[10px] font-bold opacity-75">
                      {diff === 'easy' ? '5 Emojis' : diff === 'medium' ? '6 Emojis' : '8 Emojis'}
                    </span>
                  </button>
                );
              })}
            </div>
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

            {/* 2-Player Duel */}
            <button
              data-testid="start-duel"
              onClick={() => { playPop(); setMode('duel'); initGame(difficulty, 'duel'); }}
              className="w-full py-4 bg-white hover:bg-slate-50 border-4 border-candy-pink/80 rounded-[2rem] shadow-[0_8px_0_0_#d81b60] font-black text-pink-600 text-lg flex items-center justify-center gap-3 transition-all active:translate-y-[6px] active:shadow-[0_2px_0_0_#d81b60] outline-none cursor-pointer"
            >
              <span>⚔️</span> {t.emojiMatch.duelMode}
            </button>
          </div>
        </div>
      ) : mode !== 'duel' ? (
        // ================= SOLO PLAY GAME BOARD =================
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
                w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-white border-4 border-slate-300 shadow-md relative overflow-hidden flex items-center justify-center transition-all duration-350
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
                      ${difficulty === 'easy' ? 'text-5xl sm:text-6xl' : difficulty === 'medium' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}
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
                w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-white border-4 border-slate-300 shadow-md relative overflow-hidden flex items-center justify-center transition-all duration-350
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
                      ${difficulty === 'easy' ? 'text-5xl sm:text-6xl' : difficulty === 'medium' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl'}
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
      ) : (
        // ================= 2-PLAYER DUEL GAME BOARD =================
        <div className="flex-1 flex flex-col justify-between w-full h-full relative overflow-hidden">
          
          {/* PLAYER 2 ZONE (Top, Rotated 180 Degrees) */}
          <div className="flex-1 flex flex-col justify-center items-center p-4 border-b-2 border-slate-300 relative bg-amber-50/20 rotate-180">
            {/* Duel card P2 */}
            <div
              key={`duelCard2-${cardAKey}`}
              className={`
                w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-white border-4 border-pink-400 shadow-md relative overflow-hidden flex items-center justify-center transition-all duration-300
                ${p2Frozen ? 'opacity-50 animate-shake' : 'animate-card-in'}
              `}
            >
              {duelCard2?.emojis.map((item, idx) => {
                const isMatched = duelMatchedEmoji === item.emoji;
                return (
                  <button
                    key={idx}
                    disabled={p2Frozen}
                    onClick={() => handleDuelTap(item.emoji, 2)}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${item.x}%)`,
                      top: `calc(50% + ${item.y}%)`,
                      transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                    }}
                    className={`
                      select-none outline-none text-center leading-none
                      ${difficulty === 'easy' ? 'text-4xl sm:text-5xl' : difficulty === 'medium' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}
                      ${isMatched ? 'animate-emoji-pop scale-150 z-30' : ''}
                    `}
                  >
                    <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)] block">
                      {item.emoji}
                    </span>
                  </button>
                );
              })}

              {p2Frozen && (
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center font-black text-red-600 text-3xl">
                  ⏳
                </div>
              )}
            </div>

            {/* P2 Stats Header */}
            <div className="absolute top-2 left-4 right-4 flex justify-between items-center pointer-events-none">
              <span className="bg-pink-100 border-2 border-pink-300 text-pink-600 font-extrabold px-4 py-1 rounded-full text-xs">
                Score: {duelScore2} / 10
              </span>
              <span className="text-slate-400 font-extrabold text-xs">
                Player 2 🔴
              </span>
            </div>
          </div>

          {/* MIDDLE DIVIDER & SYSTEM UI */}
          <div className="h-10 bg-slate-200 border-y-2 border-slate-300 flex justify-between items-center px-4 relative z-25">
            <button
              onClick={() => { playPop(); setGameStarted(false); }}
              className="px-3 py-0.5 bg-slate-300 hover:bg-slate-400 text-slate-700 font-extrabold text-[10px] rounded-full cursor-pointer outline-none transition-colors"
            >
              ⬅️ Quit
            </button>
            
            <div className="flex gap-2">
              <span className="bg-blue-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full">
                P1: {duelScore1}
              </span>
              <span className="bg-pink-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full">
                P2: {duelScore2}
              </span>
            </div>

            <button
              onClick={() => { playPop(); initGame(difficulty, 'duel'); }}
              className="px-3 py-0.5 bg-candy-yellow border border-yellow-500 text-yellow-800 font-extrabold text-[10px] rounded-full cursor-pointer outline-none"
            >
              🔄 Reset
            </button>
          </div>

          {/* PLAYER 1 ZONE (Bottom, Facing Normal) */}
          <div className="flex-1 flex flex-col justify-center items-center p-4 relative bg-blue-50/20">
            {/* Duel card P1 */}
            <div
              key={`duelCard1-${cardBKey}`}
              className={`
                w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-white border-4 border-blue-400 shadow-md relative overflow-hidden flex items-center justify-center transition-all duration-300
                ${p1Frozen ? 'opacity-50 animate-shake' : 'animate-card-in'}
              `}
            >
              {duelCard1?.emojis.map((item, idx) => {
                const isMatched = duelMatchedEmoji === item.emoji;
                return (
                  <button
                    key={idx}
                    disabled={p1Frozen}
                    onClick={() => handleDuelTap(item.emoji, 1)}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${item.x}%)`,
                      top: `calc(50% + ${item.y}%)`,
                      transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`,
                    }}
                    className={`
                      select-none outline-none text-center leading-none
                      ${difficulty === 'easy' ? 'text-4xl sm:text-5xl' : difficulty === 'medium' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl'}
                      ${isMatched ? 'animate-emoji-pop scale-150 z-30' : ''}
                    `}
                  >
                    <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)] block">
                      {item.emoji}
                    </span>
                  </button>
                );
              })}

              {p1Frozen && (
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center font-black text-red-600 text-3xl">
                  ⏳
                </div>
              )}
            </div>

            {/* P1 Stats Header */}
            <div className="absolute top-2 left-4 right-4 flex justify-between items-center pointer-events-none">
              <span className="bg-blue-100 border-2 border-blue-300 text-blue-600 font-extrabold px-4 py-1 rounded-full text-xs">
                Score: {duelScore1} / 10
              </span>
              <span className="text-slate-400 font-extrabold text-xs">
                Player 1 🔵
              </span>
            </div>
          </div>

          {/* DUEL GAME OVER SCREEN OVERLAY */}
          {winner && (
            <div className="absolute inset-0 bg-sky-50/95 backdrop-blur-md flex flex-col justify-center items-center p-6 z-40 space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-4xl font-black text-slate-800">
                  {winner === 1 ? t.emojiMatch.p1Wins : t.emojiMatch.p2Wins}
                </h3>
                <p className="text-slate-500 font-extrabold text-lg">
                  Final Score: {duelScore1} - {duelScore2}
                </p>
              </div>

              <button
                onClick={() => { playPop(); initGame(difficulty, 'duel'); }}
                className="px-8 py-3 bg-candy-purple hover:bg-purple-400 text-white font-black text-lg rounded-2xl shadow-[0_6px_0_0_#9c27b0] border-2 border-purple-500 active:translate-y-[4px] active:shadow-[0_2px_0_0_#9c27b0] cursor-pointer outline-none"
              >
                🔄 {t.emojiMatch.playAgain}
              </button>

              <button
                onClick={() => { playPop(); setGameStarted(false); }}
                className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-600 font-black text-sm rounded-xl cursor-pointer outline-none transition-colors"
              >
                Exit to Modes
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default EmojiMatch;
