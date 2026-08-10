import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Confetti from 'react-confetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import { GameDifficulty } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { getItemsByCategory } from '../data/townItems';

type ServiceType = 'police' | 'fire' | 'ambulance';

interface Cell {
  row: number;
  col: number;
  isRoad: boolean;
  station?: ServiceType;
  decoration?: string;
}

interface DispatchEvent {
  id: number;
  row: number;
  col: number;
  type: ServiceType;
  createdAt: number;
  maxAge: number;
  solved?: boolean;
}

interface MovingVehicle {
  type: ServiceType;
  path: { row: number; col: number }[];
  stepIndex: number;
  targetEventId: number;
}

interface DispatchGameProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
  onStarEarned?: (amount: number) => void;
}

const VEHICLE_CONFIG: Record<ServiceType, { emoji: string; stationEmoji: string; eventEmoji: string; color: 'blue' | 'red' | 'green' }> = {
  police: { emoji: '🚓', stationEmoji: '🚔', eventEmoji: '🚨', color: 'blue' },
  fire: { emoji: '🚒', stationEmoji: '🚒', eventEmoji: '🔥', color: 'red' },
  ambulance: { emoji: '🚑', stationEmoji: '🏥', eventEmoji: '🤕', color: 'green' },
};

function getGridSize(diff: GameDifficulty): number {
  switch (diff) {
    case 'easy':
      return 5;
    case 'medium':
      return 7;
    case 'hard':
    case 'expert':
      return 9;
    default:
      return 7;
  }
}

function getDifficultySettings(diff: GameDifficulty) {
  switch (diff) {
    case 'easy':
      return { spawnInterval: 3500, maxEvents: 2, eventMaxAge: 8000 };
    case 'medium':
      return { spawnInterval: 2500, maxEvents: 3, eventMaxAge: 6500 };
    case 'hard':
    case 'expert':
      return { spawnInterval: 1800, maxEvents: 4, eventMaxAge: 5000 };
    default:
      return { spawnInterval: 2500, maxEvents: 3, eventMaxAge: 6500 };
  }
}

function pickWeightedFiller(): string {
  // Bias heavily toward buildings (especially houses) and away from flags.
  const buildings = getItemsByCategory('buildings');
  const nature = getItemsByCategory('nature');
  const decorations = getItemsByCategory('decorations');
  const house = buildings.find((item) => item.id === 'house');
  const otherBuildings = buildings.filter((item) => item.id !== 'house');
  const nonFlagDecorations = decorations.filter((item) => item.id !== 'flag');

  const houseEmoji = house?.emoji ?? '🏠';
  const pool: string[] = [
    ...Array(6).fill(houseEmoji),
    ...otherBuildings.map((item) => item.emoji),
    ...nature.map((item) => item.emoji),
    ...nonFlagDecorations.map((item) => item.emoji),
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}

function generateCity(size: number): Cell[][] {
  const grid: Cell[][] = [];

  for (let r = 0; r < size; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < size; c++) {
      row.push({
        row: r,
        col: c,
        isRoad: false,
        decoration: pickWeightedFiller(),
      });
    }
    grid.push(row);
  }

  // Place stations in 3 corners and make adjacent cells roads
  const stations: { row: number; col: number; type: ServiceType }[] = [
    { row: 0, col: 0, type: 'police' },
    { row: 0, col: size - 1, type: 'fire' },
    { row: size - 1, col: 0, type: 'ambulance' },
  ];

  for (const s of stations) {
    grid[s.row][s.col].station = s.type;
    grid[s.row][s.col].isRoad = true;
    grid[s.row][s.col].decoration = undefined;
  }

  // Create a road network connecting the three stations.
  // Strategy: roads along the first row and first column guarantee connection.
  for (let c = 0; c < size; c++) {
    grid[0][c].isRoad = true;
    grid[0][c].decoration = undefined;
  }
  for (let r = 0; r < size; r++) {
    grid[r][0].isRoad = true;
    grid[r][0].decoration = undefined;
  }

  // Add a few random interior road branches for variety.
  const branches = Math.max(1, Math.floor(size / 2));
  for (let i = 0; i < branches; i++) {
    const startRow = Math.floor(Math.random() * (size - 2)) + 1;
    const startCol = Math.floor(Math.random() * (size - 2)) + 1;
    const horizontal = Math.random() < 0.5;
    if (horizontal) {
      for (let c = startCol; c < size; c++) {
        grid[startRow][c].isRoad = true;
        grid[startRow][c].decoration = undefined;
      }
    } else {
      for (let r = startRow; r < size; r++) {
        grid[r][startCol].isRoad = true;
        grid[r][startCol].decoration = undefined;
      }
    }
  }

  return grid;
}

function findPath(
  grid: Cell[][],
  start: { row: number; col: number },
  end: { row: number; col: number }
): { row: number; col: number }[] {
  const size = grid.length;
  const queue: { row: number; col: number; path: { row: number; col: number }[] }[] = [
    { ...start, path: [start] },
  ];
  const visited = new Set<string>([`${start.row}-${start.col}`]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.row === end.row && current.col === end.col) {
      return current.path;
    }

    const dirs = [
      { row: -1, col: 0 },
      { row: 1, col: 0 },
      { row: 0, col: -1 },
      { row: 0, col: 1 },
    ];

    for (const d of dirs) {
      const nr = current.row + d.row;
      const nc = current.col + d.col;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      if (!grid[nr][nc].isRoad) continue;
      const key = `${nr}-${nc}`;
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ row: nr, col: nc, path: [...current.path, { row: nr, col: nc }] });
    }
  }

  return [start, end];
}

export function DispatchGame({ playPop, playSuccess, playError, onStarEarned }: DispatchGameProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('medium');
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [events, setEvents] = useState<DispatchEvent[]>([]);
  const [activeVehicle, setActiveVehicle] = useState<ServiceType | null>(null);
  const [movingVehicle, setMovingVehicle] = useState<MovingVehicle | null>(null);
  const [score, setScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeEventId, setShakeEventId] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const eventIdRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gridSize = getGridSize(difficulty);
  const settings = getDifficultySettings(difficulty);

  const stationPositions = useMemo(() => {
    return {
      police: { row: 0, col: 0 },
      fire: { row: 0, col: gridSize - 1 },
      ambulance: { row: gridSize - 1, col: 0 },
    };
  }, [gridSize]);

  const initGame = useCallback(() => {
    const newGrid = generateCity(gridSize);
    setGrid(newGrid);
    setEvents([]);
    setActiveVehicle(null);
    setMovingVehicle(null);
    setScore(0);
    setShowConfetti(false);
    setShakeEventId(null);
    eventIdRef.current = 0;
  }, [gridSize]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initGame();
  }, [initGame]);

  const spawnEvent = useCallback(() => {
    setEvents((prev) => {
      if (prev.length >= settings.maxEvents) return prev;
      const cells: { row: number; col: number }[] = [];
      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c].station) continue;
          const occupied = prev.some((e) => e.row === r && e.col === c && !e.solved);
          if (!occupied) cells.push({ row: r, col: c });
        }
      }
      if (cells.length === 0) return prev;
      const types: ServiceType[] = ['police', 'fire', 'ambulance'];
      const cell = cells[Math.floor(Math.random() * cells.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const newEvent: DispatchEvent = {
        id: ++eventIdRef.current,
        row: cell.row,
        col: cell.col,
        type,
        createdAt: Date.now(),
        maxAge: settings.eventMaxAge,
      };
      return [...prev, newEvent];
    });
  }, [grid, settings.maxEvents, settings.eventMaxAge]);

  useEffect(() => {
    if (!gameStarted) {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
      return;
    }

    // Spawn one event right away, then continue on the interval.
    spawnEvent();
    spawnTimerRef.current = setInterval(spawnEvent, settings.spawnInterval);

    // Game loop: check expired events and drive timer re-renders
    gameLoopRef.current = setInterval(() => {
      const currentNow = Date.now();
      setNow(currentNow);
      setEvents((prev) => {
        const expired = prev.filter((e) => !e.solved && currentNow - e.createdAt > e.maxAge);
        if (expired.length > 0) {
          playError();
        }
        const remaining = prev.filter((e) => e.solved || currentNow - e.createdAt <= e.maxAge);
        return remaining;
      });
    }, 200);

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameStarted, grid, settings, playError]);

  useEffect(() => {
    if (!movingVehicle) return;

    animationTimerRef.current = setInterval(() => {
      setMovingVehicle((prev) => {
        if (!prev) return null;
        if (prev.stepIndex >= prev.path.length - 1) {
          // Vehicle arrived: solve event
          const solvedEventId = prev.targetEventId;
          setEvents((eventList) =>
            eventList.map((e) => (e.id === solvedEventId ? { ...e, solved: true } : e))
          );
          setScore((s) => {
            const updatedScore = s + 1;
            // Show confetti every 5 solved events
            if (updatedScore > 0 && updatedScore % 5 === 0) {
              setShowConfetti(true);
            }
            return updatedScore;
          });
          onStarEarned?.(1);
          playSuccess();

          setTimeout(() => {
            setEvents((eventList) => eventList.filter((e) => e.id !== solvedEventId));
            setShowConfetti(false);
          }, 400);

          return null;
        }
        return { ...prev, stepIndex: prev.stepIndex + 1 };
      });
    }, 180);

    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, [movingVehicle, onStarEarned, playSuccess]);

  const handleVehicleSelect = (type: ServiceType) => {
    playPop();
    setActiveVehicle((prev) => (prev === type ? null : type));
  };

  const handleEventClick = (event: DispatchEvent) => {
    if (movingVehicle || event.solved) return;

    if (!activeVehicle) {
      playPop();
      return;
    }

    if (activeVehicle !== event.type) {
      playError();
      setShakeEventId(event.id);
      setTimeout(() => setShakeEventId(null), 400);
      return;
    }

    // Correct dispatch: start animation
    const start = stationPositions[activeVehicle];
    const path = findPath(grid, start, { row: event.row, col: event.col });
    setMovingVehicle({ type: activeVehicle, path, stepIndex: 0, targetEventId: event.id });
    setActiveVehicle(null);
  };

  const { oldestEvent, timerProgress, isLowTime } = useMemo(() => {
    const active = events.filter((e) => !e.solved);
    if (active.length === 0) {
      return { oldestEvent: null, timerProgress: 100, isLowTime: false };
    }
    const oldest = active.reduce((o, e) => (e.createdAt < o.createdAt ? e : o));
    const elapsed = now - oldest.createdAt;
    const pct = Math.max(0, Math.min(100, ((oldest.maxAge - elapsed) / oldest.maxAge) * 100));
    return { oldestEvent: oldest, timerProgress: pct, isLowTime: pct < 30 };
  }, [events, now]);

  return (
    <div className="flex-1 flex flex-col items-center w-full h-full select-none max-w-lg mx-auto px-2 py-2">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={120}
          recycle={false}
        />
      )}

      <div className="text-center space-y-1 mb-2">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
          {t.dispatchGame.title}
        </h2>
        <p className="text-slate-500 font-extrabold text-xs">{t.dispatchGame.subtitle}</p>
      </div>

      {!gameStarted ? (
        <div className="flex-1 flex flex-col justify-center items-center w-full p-4 space-y-6">
          <div className="w-full space-y-2">
            <span className="text-slate-400 font-black text-xs uppercase tracking-wider block text-center">
              {t.dispatchGame.difficulty}
            </span>
            <DifficultySelector
              selected={difficulty}
              options={['easy', 'medium', 'hard']}
              onChange={(diff) => { playPop(); setDifficulty(diff); }}
            />
          </div>
          <KidButton
            color="blue"
            size="lg"
            data-testid="dispatch-start"
            onClick={() => { playPop(); setGameStarted(true); }}
          >
            {t.dispatchGame.start}
          </KidButton>
        </div>
      ) : (
        <>
          {/* Timer bar for oldest event */}
          <div className="w-full space-y-1 mb-2">
            <div className="flex justify-between items-center text-xs font-black text-slate-500 px-1">
              <span>{t.dispatchGame.help}</span>
              <span>{t.dispatchGame.score}: {score}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden border">
              <div
                style={{ width: `${timerProgress}%` }}
                className={`h-full transition-all duration-200 ${isLowTime ? 'bg-red-500 animate-pulse' : 'bg-candy-orange'}`}
              />
            </div>
          </div>

          {/* City grid */}
          <div
            className="grid gap-1 w-full rounded-2xl p-2 bg-slate-100/70 shadow-inner"
            style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
          >
            {grid.map((row, ri) =>
              row.map((cell, ci) => {
                const event = events.find((e) => e.row === ri && e.col === ci && !e.solved);
                const isMovingHere = movingVehicle?.path[movingVehicle.stepIndex]?.row === ri &&
                  movingVehicle?.path[movingVehicle.stepIndex]?.col === ci;
                const isStation = cell.station;
                const isRoad = cell.isRoad && !isStation;

                return (
                  <button
                    key={`${ri}-${ci}`}
                    type="button"
                    onClick={() => event && handleEventClick(event)}
                    className={`
                      relative aspect-square flex items-center justify-center rounded-xl text-xl sm:text-2xl
                      transition-all duration-75 outline-none
                      ${isRoad ? 'bg-amber-100/80 border-2 border-amber-200/60' : 'bg-emerald-50 border-2 border-emerald-100'}
                      ${event ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                      ${event && shakeEventId === event.id ? 'animate-shake' : ''}
                    `}
                  >
                    {isStation ? (
                      <span>{VEHICLE_CONFIG[isStation].stationEmoji}</span>
                    ) : (
                      <>
                        <span className={`${event ? 'opacity-40' : 'opacity-60'}`}>{cell.decoration}</span>
                        {isMovingHere && (
                          <span className="absolute inset-0 flex items-center justify-center animate-bounce">
                            {VEHICLE_CONFIG[movingVehicle!.type].emoji}
                          </span>
                        )}
                        {event && !isMovingHere && (
                          <span
                            className={`absolute -top-1 -right-1 text-lg sm:text-xl drop-shadow-sm ${
                              event.id === oldestEvent?.id ? 'animate-bounce' : 'animate-pulse'
                            }`}
                          >
                            {VEHICLE_CONFIG[event.type].eventEmoji}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Vehicle dispatch buttons */}
          <div className="grid grid-cols-3 gap-3 w-full mt-4">
            {(Object.keys(VEHICLE_CONFIG) as ServiceType[]).map((type) => {
              const config = VEHICLE_CONFIG[type];
              const isActive = activeVehicle === type;
              return (
                <KidButton
                  key={type}
                  color={config.color}
                  size="md"
                  data-testid={`dispatch-vehicle-${type}`}
                  onClick={() => handleVehicleSelect(type)}
                  className={`flex-col gap-1 rounded-2xl ${isActive ? 'ring-4 ring-offset-2 ring-yellow-300 scale-105' : ''}`}
                >
                  <span className="text-3xl">{config.emoji}</span>
                  <span className="text-xs font-black">{t.dispatchGame.vehicles[type]}</span>
                </KidButton>
              );
            })}
          </div>

          <div className="flex gap-3 w-full mt-3">
            <button
              type="button"
              onClick={() => { playPop(); setGameStarted(false); initGame(); }}
              className="flex-1 py-2 rounded-xl bg-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-300 transition-colors"
            >
              {t.common.reset}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default DispatchGame;
