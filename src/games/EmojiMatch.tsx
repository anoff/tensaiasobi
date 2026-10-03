import { useState, useEffect, useRef } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { useGameFX } from '../hooks/gameFXContext';
import { wrongMeansNewRound } from '../utils/difficulty';
import { useAgeDifficulty } from '../hooks/useAgeDifficulty';
import { DobbleCardView } from './DobbleCardView';
import { DUEL_GOAL, EmojiMatchDuel } from './EmojiMatchDuel';
import { buildShuffledDeck, deckOrder, drawFromPile, findMatch, type DobbleCard } from './emojiMatchDeck';

/** Time Attack clock per level: start seconds, + per hit, − per miss. Easy got its own (Zen is gone). */
const TIME_ATTACK: Record<GameDifficulty, { start: number; bonus: number; penalty: number }> = {
  easy: { start: 60, bonus: 3, penalty: 2 },
  medium: { start: 45, bonus: 2, penalty: 3 },
  hard: { start: 50, bonus: 3, penalty: 4 },
};

type Mode = 'solo_time' | 'duel';

export function EmojiMatch() {
  const { playPop, playSuccess, playError, onStarEarned, challengeMode } = useGameFX();
  const { t } = useTranslation();


  const [gameStarted, setGameStarted] = useState(false);
  const [difficulty, setDifficulty] = useAgeDifficulty();
  const [mode, setMode] = useState<Mode>('solo_time');


  const [fullDeck, setFullDeck] = useState<DobbleCard[]>([]);
  const [pile, setPile] = useState<DobbleCard[]>([]);
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
    setMode(gMode);
    setGameStarted(true);
    if (gMode === 'duel') return;

    const newDeck = buildShuffledDeck(deckOrder(diff));
    setFullDeck(newDeck);
    setPile(newDeck.slice(2));
    setCardA(newDeck[0]);
    setCardB(newDeck[1]);
    setScore(0);
    setStreak(0);
    setCombo(0);
    setIsGameOver(false);
    setShowConfetti(false);
    setMatchedEmoji(null);
    setHighScore(loadHighScore(diff, gMode));
    setTimeLeft(TIME_ATTACK[diff].start);
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


  /** Classic rule: card B becomes the old card A, card A draws a new one. */
  const advanceCards = () => {
    if (!cardA || !cardB) return;
    const { card, pile: rest } = drawFromPile(pile, fullDeck, [cardA, cardB]);
    setPile(rest);
    setCardB(cardA);
    setCardBKey((prev) => prev + 1);
    setCardA(card);
    setCardAKey((prev) => prev + 1);
  };


  const handleSoloTap = (emoji: string, cardSource: 'A' | 'B') => {
    if (isGameOver || !cardA || !cardB || matchedEmoji || shakeCard) return;

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


      setTimeLeft((t) => Math.min(t + TIME_ATTACK[difficulty].bonus, 99));

      setTimeout(() => {
        setMatchedEmoji(null);
        advanceCards();
      }, 500);
    } else {
      // Wrong!
      playError();
      setStreak(0);
      setShakeCard(cardSource);
      

      setTimeLeft((t) => Math.max(t - TIME_ATTACK[difficulty].penalty, 0));

      if (wrongMeansNewRound(difficulty, challengeMode)) {
        setTimeout(() => {
          setShakeCard(null);
          advanceCards();
        }, 1500);
      } else {
        setTimeout(() => setShakeCard(null), 500);
      }
    }
  };

  const emojiClass =
    difficulty === 'easy' ? 'text-6xl sm:text-7xl' : difficulty === 'medium' ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl';

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

            <button
              data-testid="start-solo-time"
              onClick={() => { playPop(); initGame(difficulty, 'solo_time'); }}
              className="w-full py-4 bg-white hover:bg-slate-50 border-4 border-candy-orange/80 rounded-[2rem] shadow-[0_8px_0_0_#ff8f00] font-black text-orange-600 text-lg flex items-center justify-center gap-3 transition-all active:translate-y-[6px] active:shadow-[0_2px_0_0_#ff8f00] outline-none cursor-pointer"
            >
              <span>⚡</span> {t.emojiMatch.soloTime}
            </button>

            <button
              data-testid="start-duel"
              onClick={() => { playPop(); initGame(difficulty, 'duel'); }}
              className="w-full py-4 bg-white hover:bg-slate-50 border-4 border-sky-400 rounded-[2rem] shadow-[0_8px_0_0_#0284c7] font-black text-sky-700 text-lg flex flex-col items-center justify-center transition-all active:translate-y-[6px] active:shadow-[0_2px_0_0_#0284c7] outline-none cursor-pointer"
            >
              <span>🔵 {t.emojiMatch.duelMode} 🔴</span>
              <span className="text-xs font-extrabold text-slate-400">{t.emojiMatch.duelGoal.replace('{count}', String(DUEL_GOAL))}</span>
            </button>

          </div>
        </div>
      ) : mode === 'duel' ? (
        <EmojiMatchDuel key={difficulty} difficulty={difficulty} onExit={() => setGameStarted(false)} />
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
              <div className={`px-3 py-1 font-black text-sm rounded-full border-2 ${timeLeft <= 10 ? 'bg-red-100 text-red-600 border-red-300 animate-bounce' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                ⏰ {timeLeft}{t.emojiMatch.seconds}
              </div>
              <div className="font-extrabold text-sm text-slate-600">
                ✨ {t.emojiMatch.score}{score}
              </div>
              <div className="font-extrabold text-sm text-slate-400">
                🏆 {t.emojiMatch.highScore}{highScore}
              </div>
            </div>
          </div>

          {/* Time Attack progress bar */}
          {!isGameOver && (
            <div className="w-full h-2.5 bg-slate-200 rounded-full mt-2 overflow-hidden border">
              <div
                style={{ width: `${Math.min((timeLeft / TIME_ATTACK[difficulty].start) * 100, 100)}%` }}
                className={`h-full transition-all duration-300 ${timeLeft <= 10 ? 'bg-red-500 animate-pulse' : 'bg-candy-orange'}`}
              />
            </div>
          )}

          {/* Game Over Screen Overlay */}
          {isGameOver && (
            <div className="absolute inset-0 bg-[#ffe7c2]/90 backdrop-blur-md flex flex-col justify-center items-center p-6 rounded-3xl z-40 space-y-6">
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
            <div key={`cardA-${cardAKey}`}>
              <DobbleCardView
                card={cardA}
                testId="emoji-match-card-1"
                sizeClass="w-60 h-60 sm:w-72 sm:h-72"
                emojiClass={emojiClass}
                matchedEmoji={matchedEmoji}
                shake={shakeCard === 'A'}
                onTap={(emoji) => handleSoloTap(emoji, 'A')}
              />
            </div>

            <div className="text-slate-400 font-extrabold text-xs tracking-wide">{t.emojiMatch.subtitle}</div>

            <div key={`cardB-${cardBKey}`}>
              <DobbleCardView
                card={cardB}
                testId="emoji-match-card-2"
                sizeClass="w-60 h-60 sm:w-72 sm:h-72"
                emojiClass={emojiClass}
                matchedEmoji={matchedEmoji}
                shake={shakeCard === 'B'}
                onTap={(emoji) => handleSoloTap(emoji, 'B')}
              />
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
