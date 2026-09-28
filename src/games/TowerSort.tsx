import { useState, useEffect, useCallback } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { TOWER_SORT_THEMES } from './towerSortThemes';
import { canDrop, generateTowers, isSolved, TOWER_SORT_CONFIG } from './towerSortLogic';
import { useGameFX } from '../hooks/gameFXContext';

/** The piece currently lifted out of a tube and parked in the hold slot. */
interface Held {
  from: number;
  emoji: string;
}

function loadBestMoves(difficulty: GameDifficulty, themeId: string): number {
  try {
    const saved = localStorage.getItem(`tower_sort_best_moves_${difficulty}_${themeId}`);
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
}

function saveBestMoves(difficulty: GameDifficulty, themeId: string, moves: number) {
  try {
    localStorage.setItem(`tower_sort_best_moves_${difficulty}_${themeId}`, moves.toString());
  } catch (e) {
    console.error('Error saving tower sort best moves', e);
  }
}

const TOWER_COLORS = [
  'bg-amber-100 border-amber-300',
  'bg-rose-100 border-rose-300',
  'bg-emerald-100 border-emerald-300',
  'bg-violet-100 border-violet-300',
];

export function TowerSort() {
  const { playPop, playSuccess, playError, onStarEarned } = useGameFX();
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [themeIndex, setThemeIndex] = useState(0);
  const [towers, setTowers] = useState<string[][]>([]);
  const [held, setHeld] = useState<Held | null>(null);
  const [droppedAt, setDroppedAt] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeTower, setShakeTower] = useState<number | null>(null);
  const [shakeHold, setShakeHold] = useState(false);
  const [bestMoves, setBestMoves] = useState(0);

  const theme = TOWER_SORT_THEMES[themeIndex];
  const config = TOWER_SORT_CONFIG[difficulty];
  const capacity = config.height;

  const initGame = useCallback(() => {
    setTowers(generateTowers(difficulty, theme));
    setHeld(null);
    setDroppedAt(null);
    setMoveCount(0);
    setIsWon(false);
    setShowConfetti(false);
    setShakeTower(null);
    setShakeHold(false);
    setBestMoves(loadBestMoves(difficulty, theme.id));
  }, [difficulty, theme]);

  // Initialize game when difficulty or theme changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initGame();
  }, [initGame]);

  const shakeTowerBriefly = (index: number) => {
    setShakeTower(index);
    setTimeout(() => setShakeTower((prev) => (prev === index ? null : prev)), 400);
  };

  const handleTowerClick = (index: number) => {
    if (isWon) return;

    // First tap: lift the top piece out of the tube into the hold slot.
    if (held === null) {
      if (towers[index].length === 0) {
        playError();
        shakeTowerBriefly(index);
        return;
      }
      playPop();
      const newTowers = towers.map((tower) => [...tower]);
      const emoji = newTowers[index].pop()!;
      setTowers(newTowers);
      setHeld({ from: index, emoji });
      setDroppedAt(null);
      return;
    }

    // Tapping the source again puts the piece back (no move counted).
    if (held.from === index) {
      playPop();
      setTowers(towers.map((tower, i) => (i === index ? [...tower, held.emoji] : tower)));
      setHeld(null);
      setDroppedAt(index);
      return;
    }

    // Full tube: the piece stays in hand, hold slot + tube shake.
    if (!canDrop(towers, index, capacity)) {
      playError();
      shakeTowerBriefly(index);
      setShakeHold(true);
      setTimeout(() => setShakeHold(false), 400);
      return;
    }

    playPop();
    const newTowers = towers.map((tower, i) => (i === index ? [...tower, held.emoji] : tower));
    const newMoveCount = moveCount + 1;
    setTowers(newTowers);
    setHeld(null);
    setDroppedAt(index);
    setMoveCount(newMoveCount);

    if (isSolved(newTowers)) {
      setIsWon(true);
      setShowConfetti(true);
      playSuccess();
      onStarEarned?.(config.starsAward);

      const currentBest = loadBestMoves(difficulty, theme.id);
      if (currentBest === 0 || newMoveCount < currentBest) {
        saveBestMoves(difficulty, theme.id, newMoveCount);
        setBestMoves(newMoveCount);
      }
    }
  };

  const changeTheme = () => {
    playPop();
    setThemeIndex((prev) => (prev + 1) % TOWER_SORT_THEMES.length);
  };

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  const isDarkTheme = theme.id === 'space';
  const pillClass = 'font-extrabold px-3 py-1 rounded-full border-2 text-xs shadow-sm bg-white text-slate-600 border-slate-300';

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full text-slate-800">
      {showConfetti && (
        <GameConfetti pieces={150} />
      )}

      {/* Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0">
        <DifficultySelector
          selected={difficulty}
          options={['easy', 'medium', 'hard']}
          onChange={changeDifficulty}
          disabled={isWon}
          className="!w-auto flex-1 max-w-[220px]"
        />

        <div className="flex flex-col items-center gap-1">
          <span data-testid="tower-sort-moves" className={pillClass}>
            🔄 {moveCount}
          </span>
          {bestMoves > 0 && (
            <span className={pillClass}>
              🏆 {bestMoves}
            </span>
          )}
        </div>

        <button
          onClick={changeTheme}
          disabled={isWon}
          className="flex items-center gap-1 bg-candy-blue border-b-4 border-sky-600 active:border-b-0 active:translate-y-[4px] text-white text-2xl font-extrabold p-2 rounded-2xl cursor-pointer shadow-sm select-none outline-none hover:scale-105 disabled:opacity-50"
        >
          🎨 {theme.nameEmoji}
        </button>
      </div>

      {/* Title — always on the light page, whatever the playground theme */}
      <div className="text-center mt-2 shrink-0">
        <h2 className="text-3xl font-black tracking-tight text-slate-800">
          {t.towerSort.title}
        </h2>
        <p className="text-sm font-extrabold text-slate-500">
          {t.towerSort.subtitle}
        </p>
      </div>

      {/* Playground */}
      <div className="flex-1 flex items-center justify-center my-2 w-full h-full min-h-[300px]">
        <div
          className={`relative w-full h-full max-h-[520px] rounded-[2.5rem] border-4 border-slate-300 overflow-hidden shadow-inner bg-gradient-to-b ${theme.bgGradient} flex flex-col items-center justify-between gap-3 px-2 pb-3 pt-3`}
        >
          {/* Hold slot: the lifted piece sits here "in hand" until it is dropped */}
          <div
            data-testid="tower-sort-hold"
            data-holding={held ? 'true' : 'false'}
            className={`shrink-0 w-20 h-20 rounded-3xl flex items-center justify-center ${
              held
                ? `bg-white ring-4 ring-candy-purple shadow-[0_10px_0_0_rgba(0,0,0,0.15)] ${shakeHold ? 'animate-shake' : ''}`
                : `border-4 border-dashed ${isDarkTheme ? 'border-indigo-300/40' : 'border-slate-400/40'}`
            }`}
          >
            {held && (
              <span key={`${held.from}-${held.emoji}`} className="text-5xl leading-none animate-lift-in">
                {held.emoji}
              </span>
            )}
          </div>

          <div className="w-full flex-1 flex items-end justify-center gap-2">
            {towers.map((tower, towerIdx) => {
              const isSource = held?.from === towerIdx;
              const isShaking = shakeTower === towerIdx;
              const isFull = tower.length >= capacity;
              const colorClass = TOWER_COLORS[towerIdx % TOWER_COLORS.length];

              return (
                <button
                  key={towerIdx}
                  data-testid="tower-sort-tower"
                  data-count={tower.length}
                  data-capacity={capacity}
                  onClick={() => handleTowerClick(towerIdx)}
                  disabled={isWon}
                  className={`
                    relative flex flex-col-reverse items-center justify-start gap-1
                    flex-1 min-w-[72px] max-w-[96px] pt-2 pb-2 rounded-t-3xl rounded-b-xl border-4
                    transition-all duration-150 outline-none cursor-pointer select-none touch-manipulation
                    ${colorClass}
                    ${isSource ? 'ring-4 ring-candy-purple' : held && !isFull ? 'hover:brightness-105' : ''}
                    ${isShaking ? 'animate-shake' : ''}
                  `}
                  aria-label={`Tower ${towerIdx + 1}`}
                >
                  {Array.from({ length: capacity }, (_, slotIdx) => {
                    const emoji = tower[slotIdx];
                    const isGhost = isSource && slotIdx === tower.length;
                    const justDropped = droppedAt === towerIdx && slotIdx === tower.length - 1;
                    return (
                      <div
                        key={slotIdx}
                        className={`
                          w-12 h-12 text-3xl [@media(min-height:760px)]:w-16 [@media(min-height:760px)]:h-16 [@media(min-height:760px)]:text-4xl
                          rounded-2xl flex items-center justify-center leading-none
                          ${emoji
                            ? `bg-white/90 border-2 border-white/60 shadow-md ${justDropped ? 'animate-drop-in' : ''}`
                            : isGhost
                              ? 'border-2 border-dashed border-candy-purple/60 bg-white/30'
                              : ''}
                        `}
                      >
                        {emoji && <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]">{emoji}</span>}
                      </div>
                    );
                  })}
                </button>
              );
            })}
          </div>

          {/* Victory Overlay */}
          {isWon && (
            <div className={`absolute inset-0 ${isDarkTheme ? 'bg-slate-900/90 text-white' : 'bg-white/90'} backdrop-blur-sm flex flex-col items-center justify-center p-4 space-y-4 z-20 overflow-y-auto`}>
              <span className="text-5xl sm:text-6xl animate-bounce">🏆🎉</span>
              <h2 className="text-2xl sm:text-3xl font-black text-center leading-tight">
                {t.towerSort.victory}
              </h2>
              <p className={`text-center font-extrabold ${isDarkTheme ? 'text-indigo-200' : 'text-slate-500'}`}>
                {moveCount} {t.towerSort.moves}
              </p>
              <button
                onClick={() => { playPop(); initGame(); }}
                className="px-8 py-3 bg-candy-purple hover:bg-purple-400 text-white font-black text-lg rounded-2xl shadow-[0_6px_0_0_#9c27b0] border-2 border-purple-500 active:translate-y-[4px] active:shadow-[0_2px_0_0_#9c27b0] cursor-pointer outline-none"
              >
                🔄 {t.towerSort.playAgain}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Help / Footer */}
      <div className="text-center font-extrabold text-xs pb-2 shrink-0 text-slate-400 [@media(max-height:740px)]:hidden">
        {t.towerSort.help}
      </div>
    </div>
  );
}

export default TowerSort;
