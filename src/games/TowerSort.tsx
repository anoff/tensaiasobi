import { useState, useEffect, useCallback, useMemo } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';

interface Theme {
  id: string;
  nameEmoji: string;
  emojis: string[];
  bgGradient: string;
}

const THEMES: Theme[] = [
  {
    id: 'animals',
    nameEmoji: '🐶',
    emojis: ['🐶', '🐱', '🐼', '🦊', '🐸', '🐰'],
    bgGradient: 'from-emerald-50 via-green-100 to-teal-50',
  },
  {
    id: 'fruits',
    nameEmoji: '🍎',
    emojis: ['🍎', '🍌', '🍇', '🍉', '🍓', '🍍'],
    bgGradient: 'from-rose-50 via-pink-100 to-orange-50',
  },
  {
    id: 'space',
    nameEmoji: '🚀',
    emojis: ['🚀', '🪐', '⭐', '☄️', '👽', '🛸'],
    bgGradient: 'from-slate-900 via-indigo-950 to-slate-900',
  },
  {
    id: 'ocean',
    nameEmoji: '🐠',
    emojis: ['🐠', '🐬', '🐙', '🦀', '🐳', '🦈'],
    bgGradient: 'from-sky-100 via-cyan-100 to-blue-200',
  },
];

interface DifficultyConfig {
  types: number;
  towers: number;
  height: number;
  scrambleSteps: number;
  starsAward: number;
}

const DIFFICULTY_CONFIG: Record<GameDifficulty, DifficultyConfig> = {
  easy: { types: 3, towers: 5, height: 3, scrambleSteps: 12, starsAward: 5 },
  medium: { types: 4, towers: 6, height: 4, scrambleSteps: 20, starsAward: 10 },
  hard: { types: 5, towers: 7, height: 5, scrambleSteps: 30, starsAward: 18 },
};

type TowerSortProps = GameProps;

function canMove(towers: string[][], from: number, to: number, height: number): boolean {
  if (from === to) return false;
  const source = towers[from];
  const dest = towers[to];
  if (source.length === 0) return false;
  if (dest.length >= height) return false;
  if (dest.length === 0) return true;
  return dest[dest.length - 1] === source[source.length - 1];
}

function isSolved(towers: string[][], height: number): boolean {
  return towers.every((tower) => {
    if (tower.length === 0) return true;
    if (tower.length !== height) return false;
    const first = tower[0];
    return tower.every((emoji) => emoji === first);
  });
}

function solveTowers(towers: string[][], height: number, maxDepth = 80): number | null {
  if (isSolved(towers, height)) return 0;

  const queue: [string[][], number][] = [[towers, 0]];
  const seen = new Set<string>([JSON.stringify(towers)]);

  while (queue.length > 0) {
    const [state, depth] = queue.shift()!;
    if (depth >= maxDepth) continue;

    for (let from = 0; from < state.length; from++) {
      for (let to = 0; to < state.length; to++) {
        if (!canMove(state, from, to, height)) continue;
        const next = state.map((tower) => [...tower]);
        next[to].push(next[from].pop()!);
        const key = JSON.stringify(next);
        if (seen.has(key)) continue;
        if (isSolved(next, height)) return depth + 1;
        seen.add(key);
        queue.push([next, depth + 1]);
      }
    }
  }

  return null;
}

function generateTowers(difficulty: GameDifficulty, theme: Theme) {
  const config = DIFFICULTY_CONFIG[difficulty];
  const { types, towers: totalTowers, height } = config;

  // Build a multiset of pieces: each emoji type appears `height` times.
  const pieces: string[] = [];
  for (let typeIdx = 0; typeIdx < types; typeIdx++) {
    for (let row = 0; row < height; row++) {
      pieces.push(theme.emojis[typeIdx]);
    }
  }

  const solved: string[][] = Array.from({ length: totalTowers }, () => []);
  for (let typeIdx = 0; typeIdx < types; typeIdx++) {
    for (let row = 0; row < height; row++) {
      solved[typeIdx].push(theme.emojis[typeIdx]);
    }
  }

  let attempts = 0;
  while (attempts < 100) {
    // Shuffle pieces and fill the first `types` towers.
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }

    const current: string[][] = Array.from({ length: totalTowers }, () => []);
    for (let typeIdx = 0; typeIdx < types; typeIdx++) {
      for (let row = 0; row < height; row++) {
        current[typeIdx].push(pieces[typeIdx * height + row]);
      }
    }

    if (!isSolved(current, height)) {
      const optimal = solveTowers(current, height);
      if (optimal !== null) {
        return { towers: current, optimalMoves: optimal };
      }
    }
    attempts++;
  }

  // Fallback: return the solved state if no valid shuffle was found.
  return { towers: solved, optimalMoves: 0 };
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

export function TowerSort({ playPop, playSuccess, playError, onStarEarned }: TowerSortProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [themeIndex, setThemeIndex] = useState(0);
  const [towers, setTowers] = useState<string[][]>([]);
  const [selectedTower, setSelectedTower] = useState<number | null>(null);
  const [moveCount, setMoveCount] = useState(0);
  const [optimalMoves, setOptimalMoves] = useState(0);
  const [isWon, setIsWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeTower, setShakeTower] = useState<number | null>(null);
  const [bestMoves, setBestMoves] = useState(0);

  const theme = THEMES[themeIndex];
  const config = DIFFICULTY_CONFIG[difficulty];

  const initGame = useCallback(() => {
    const { towers: newTowers, optimalMoves: newOptimal } = generateTowers(difficulty, theme);
    setTowers(newTowers);
    setSelectedTower(null);
    setMoveCount(0);
    setOptimalMoves(newOptimal);
    setIsWon(false);
    setShowConfetti(false);
    setShakeTower(null);
    setBestMoves(loadBestMoves(difficulty, theme.id));
  }, [difficulty, theme]);

  // Initialize game when difficulty or theme changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initGame();
  }, [initGame]);

  const handleTowerClick = (index: number) => {
    if (isWon) return;

    if (selectedTower === null) {
      if (towers[index].length === 0) {
        playError();
        setShakeTower(index);
        setTimeout(() => setShakeTower((prev) => (prev === index ? null : prev)), 400);
        return;
      }
      playPop();
      setSelectedTower(index);
      return;
    }

    if (selectedTower === index) {
      playPop();
      setSelectedTower(null);
      return;
    }

    if (canMove(towers, selectedTower, index, config.height)) {
      playPop();
      const newTowers = towers.map((tower) => [...tower]);
      const emoji = newTowers[selectedTower].pop();
      if (emoji) {
        newTowers[index].push(emoji);
        const newMoveCount = moveCount + 1;
        setTowers(newTowers);
        setMoveCount(newMoveCount);
        setSelectedTower(null);

        if (isSolved(newTowers, config.height)) {
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
      }
    } else {
      playError();
      setShakeTower(index);
      setSelectedTower(null);
      setTimeout(() => setShakeTower((prev) => (prev === index ? null : prev)), 400);
    }
  };

  const changeTheme = () => {
    playPop();
    setThemeIndex((prev) => (prev + 1) % THEMES.length);
  };

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  const { starRating, isPerfect } = useMemo(() => {
    if (moveCount === 0 || optimalMoves === 0) return { starRating: 0, isPerfect: false };
    if (moveCount <= optimalMoves) return { starRating: 3, isPerfect: true };
    if (moveCount <= Math.ceil(optimalMoves * 1.5)) return { starRating: 2, isPerfect: false };
    return { starRating: 1, isPerfect: false };
  }, [moveCount, optimalMoves]);

  const towerColors = [
    'bg-amber-100 border-amber-300',
    'bg-rose-100 border-rose-300',
    'bg-emerald-100 border-emerald-300',
    'bg-violet-100 border-violet-300',
    'bg-sky-100 border-sky-300',
    'bg-orange-100 border-orange-300',
    'bg-pink-100 border-pink-300',
  ];

  const isDarkTheme = theme.id === 'space';

  return (
    <div className={`flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
      {showConfetti && (
        <GameConfetti pieces={150} />
      )}

      {/* Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0 animate-fade-in">
        <DifficultySelector
          selected={difficulty}
          options={['easy', 'medium', 'hard']}
          onChange={changeDifficulty}
          disabled={isWon}
          className="!w-auto flex-1 max-w-[220px]"
        />

        <button
          onClick={changeTheme}
          disabled={isWon}
          className="flex items-center gap-2 bg-candy-blue border-b-4 border-sky-600 active:border-b-0 active:translate-y-[4px] text-white text-2xl font-extrabold p-2 rounded-2xl cursor-pointer shadow-sm select-none outline-none hover:scale-105 disabled:opacity-50"
        >
          🎨 {theme.nameEmoji}
        </button>
      </div>

      {/* Title & Stats */}
      <div className="text-center space-y-1 mt-3 shrink-0">
        <h2 className={`text-3xl font-black tracking-tight ${isDarkTheme ? 'text-white' : 'text-slate-800'}`}>
          {t.towerSort?.title || 'Tower Sort! 🗼'}
        </h2>
        <p className={`text-sm font-extrabold ${isDarkTheme ? 'text-indigo-200' : 'text-slate-500'}`}>
          {t.towerSort?.subtitle || 'Move the top emoji to sort the towers!'}
        </p>
        <div className="flex gap-3 items-center justify-center pt-1">
          <span className={`font-extrabold px-3 py-1 rounded-full border-2 text-xs shadow-sm ${isDarkTheme ? 'bg-indigo-900/60 border-indigo-500 text-indigo-100' : 'bg-white text-slate-600 border-slate-300'}`}>
            🔄 {moveCount}
          </span>
          <span className={`font-extrabold px-3 py-1 rounded-full border-2 text-xs shadow-sm ${isDarkTheme ? 'bg-indigo-900/60 border-indigo-500 text-indigo-100' : 'bg-white text-slate-600 border-slate-300'}`}>
            ⭐ {optimalMoves > 0 ? optimalMoves : '-'}
          </span>
          {bestMoves > 0 && (
            <span className={`font-extrabold px-3 py-1 rounded-full border-2 text-xs shadow-sm ${isDarkTheme ? 'bg-indigo-900/60 border-indigo-500 text-indigo-100' : 'bg-white text-slate-600 border-slate-300'}`}>
              🏆 {bestMoves}
            </span>
          )}
        </div>
      </div>

      {/* Playground */}
      <div className="flex-1 flex items-center justify-center my-4 w-full h-full min-h-[300px]">
        <div
          className={`relative w-full h-full max-h-[520px] rounded-[2.5rem] border-8 border-slate-300 overflow-hidden shadow-inner bg-gradient-to-b ${theme.bgGradient} flex items-end justify-center px-2 pb-4 pt-12`}
        >
          <div className="w-full h-full flex items-end justify-center gap-2 sm:gap-3">
            {towers.map((tower, towerIdx) => {
              const isSelected = selectedTower === towerIdx;
              const isShaking = shakeTower === towerIdx;
              const isEmpty = tower.length === 0;
              const colorClass = towerColors[towerIdx % towerColors.length];

              return (
                <button
                  key={towerIdx}
                  data-testid="tower-sort-tower"
                  onClick={() => handleTowerClick(towerIdx)}
                  disabled={isWon}
                  className={`
                    relative flex flex-col-reverse items-center justify-start
                    w-full max-w-[64px] sm:max-w-[72px] h-full rounded-t-3xl border-4
                    transition-all duration-150 outline-none cursor-pointer select-none
                    ${colorClass}
                    ${isSelected ? 'ring-4 ring-candy-purple shadow-lg scale-[1.02]' : 'hover:brightness-105'}
                    ${isShaking ? 'animate-shake' : ''}
                    ${isEmpty ? 'opacity-80' : ''}
                  `}
                  aria-label={`Tower ${towerIdx + 1}`}
                >
                  {/* Tower base highlight */}
                  <div className="absolute bottom-0 left-0 right-0 h-3 rounded-t-lg bg-white/30 pointer-events-none" />

                  {tower.map((emoji, emojiIdx) => {
                    const isTop = emojiIdx === tower.length - 1;
                    return (
                      <div
                        key={`${towerIdx}-${emojiIdx}`}
                        className={`
                          w-[85%] aspect-square -mb-3 first:mb-0 rounded-2xl border-2
                          flex items-center justify-center text-3xl sm:text-4xl shadow-md
                          transition-transform duration-150
                          ${isTop && isSelected ? '-translate-y-4 scale-110 bg-white border-candy-purple z-10' : 'bg-white/90 border-white/50'}
                        `}
                      >
                        <span className="drop-shadow-[0_2px_2px_rgba(0,0,0,0.15)]">{emoji}</span>
                      </div>
                    );
                  })}
                </button>
              );
            })}
          </div>

          {/* Victory Overlay */}
          {isWon && (
            <div className={`absolute inset-0 ${isDarkTheme ? 'bg-slate-900/90' : 'bg-white/90'} backdrop-blur-sm flex flex-col items-center justify-center p-4 space-y-4 z-20 overflow-y-auto`}>
              <span className="text-5xl sm:text-6xl animate-bounce">🏆🎉</span>
              <h2 className="text-2xl sm:text-3xl font-black text-center leading-tight">
                {t.towerSort?.victory || 'Sorted! 🎉'}
              </h2>
              <p className={`text-center font-extrabold ${isDarkTheme ? 'text-indigo-200' : 'text-slate-500'}`}>
                {moveCount} {t.towerSort?.moves || 'moves'} — {'⭐'.repeat(starRating)}
              </p>
              {isPerfect && (
                <p className="text-candy-pink font-black text-lg animate-pulse">
                  {t.towerSort?.perfect || 'Perfect solve! 🌟'}
                </p>
              )}
              <button
                onClick={() => { playPop(); initGame(); }}
                className="px-8 py-3 bg-candy-purple hover:bg-purple-400 text-white font-black text-lg rounded-2xl shadow-[0_6px_0_0_#9c27b0] border-2 border-purple-500 active:translate-y-[4px] active:shadow-[0_2px_0_0_#9c27b0] cursor-pointer outline-none"
              >
                🔄 {t.towerSort?.playAgain || 'Play Again'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Help / Footer */}
      <div className={`text-center font-extrabold text-xs pb-2 shrink-0 ${isDarkTheme ? 'text-indigo-200' : 'text-slate-400'}`}>
        {t.towerSort?.help || 'Tap a tower to lift, then tap another to drop!'}
      </div>
    </div>
  );
}

export default TowerSort;
