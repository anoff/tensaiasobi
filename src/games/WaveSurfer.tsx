import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DifficultySelector from '../components/DifficultySelector';
import GameConfetti from '../components/GameConfetti';
import KidButton from '../components/KidButton';
import { useTranslation } from '../hooks/useTranslation';
import type { GameDifficulty, GameProps } from '../types/game';
import {
  generateWaveFrame,
  generateWaveRound,
  type WaveObstacle,
  type WaveRound,
} from './waveSurferLogic';

const LANE_COUNT = 3;
const SURFER_EMOJI = '🏄';
const BOARD_EMOJI = '🤿';
const FLOAT_EMOJIS = ['🐚', '🦪', '🪸', '🐡', '🐙'];

const STARS: Record<GameDifficulty, number> = { easy: 1, medium: 2, hard: 3 };
const TARGET_ROUNDS = 4;

const SPEEDS: Record<GameDifficulty, number> = {
  easy: 1.4,
  medium: 2.2,
  hard: 3.2,
};

const ITEM_SIZE = 72;
const SURFER_SIZE = 72;
const OBSTACLE_SIZE = 64;

interface FloatingItem {
  lane: number;
  x: number;
  value: string | number;
  emoji: string;
  isCorrect: boolean;
}

interface Particle {
  id: number;
  lane: number;
  x: number;
  y: number;
  color: string;
  delay: number;
}

function randomItemEmoji(): string {
  return FLOAT_EMOJIS[Math.floor(Math.random() * FLOAT_EMOJIS.length)];
}

export default function WaveSurfer({ playPop, playSuccess, playError, onStarEarned }: GameProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [round, setRound] = useState<WaveRound>(() => generateWaveRound('easy'));
  const [frame, setFrame] = useState<{ obstacles: WaveObstacle[] }>({ obstacles: [] });
  const [items, setItems] = useState<FloatingItem[]>([]);
  const [surferLane, setSurferLane] = useState(1);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'hit' | 'success' | 'victory'>('playing');
  const [showConfetti, setShowConfetti] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [splash, setSplash] = useState(false);
  const [stageReady, setStageReady] = useState(false);
  const prevDifficultyRef = useRef<GameDifficulty>(difficulty);

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const [stageHeight, setStageHeight] = useState(0);
  const animationRef = useRef<number | null>(null);
  const itemsRef = useRef<FloatingItem[]>([]);
  const frameRef = useRef<{ obstacles: WaveObstacle[] }>({ obstacles: [] });
  const gameStateRef = useRef(gameState);
  const surferLaneRef = useRef(surferLane);
  const roundRef = useRef(round);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  useEffect(() => {
    surferLaneRef.current = surferLane;
  }, [surferLane]);
  useEffect(() => {
    roundRef.current = round;
  }, [round]);

  const laneHeight = stageHeight / LANE_COUNT;
  const surferY = surferLane * laneHeight + laneHeight / 2;

  const startRound = useCallback((diff: GameDifficulty) => {
    const nextRound = generateWaveRound(diff);
    const nextFrame = generateWaveFrame(diff, stageWidth || 375);
    const nextItems: FloatingItem[] = nextRound.challenge.options.map((value, index) => ({
      lane: nextRound.itemLanes[index],
      x: (stageWidth || 375) + 40 + index * 90,
      value,
      emoji: randomItemEmoji(),
      isCorrect: index === nextRound.challenge.options.findIndex((opt) => opt === nextRound.challenge.answer),
    }));

    setRound(nextRound);
    setFrame(nextFrame);
    setItems(nextItems);
    itemsRef.current = nextItems;
    frameRef.current = nextFrame;
    setGameState('playing');
    setSplash(false);
  }, [stageWidth]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setStageWidth(rect.width);
      setStageHeight(rect.height);
      setStageReady(true);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!stageReady) return;
    const shouldStart =
      itemsRef.current.length === 0 ||
      difficulty !== prevDifficultyRef.current;
    if (!shouldStart) return;
    prevDifficultyRef.current = difficulty;
    startRound(difficulty);
  }, [stageReady, difficulty, startRound]);

  const changeLane = useCallback((lane: number) => {
    if (gameStateRef.current !== 'playing') return;
    if (lane < 0 || lane >= LANE_COUNT) return;
    setSurferLane(lane);
    playPop?.();
  }, [playPop]);

  const makeParticles = useCallback((lane: number, x: number) => {
    const colors = ['#FFD740', '#4FC3F7', '#69F0AE', '#FF6EB4', '#CE93D8'];
    const next: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      lane,
      x,
      y: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.3,
    }));
    setParticles(next);
    window.setTimeout(() => setParticles([]), 900);
  }, []);

  const handleHit = useCallback((item: FloatingItem) => {
    if (gameStateRef.current !== 'playing') return;

    if (item.isCorrect) {
      setGameState('success');
      playSuccess();
      makeParticles(item.lane, item.x);
      setScore((s) => {
        const next = s + 1;
        if (next >= TARGET_ROUNDS) {
          window.setTimeout(() => {
            setShowConfetti(true);
            setGameState('victory');
            onStarEarned?.(STARS[difficulty]);
          }, 600);
        } else {
          window.setTimeout(() => startRound(difficulty), 900);
        }
        return next;
      });
    } else {
      setGameState('hit');
      playError();
      setSplash(true);
    }
  }, [difficulty, makeParticles, onStarEarned, playError, playSuccess, startRound]);

  const handleRetry = useCallback(() => {
    playPop();
    setSplash(false);
    startRound(difficulty);
  }, [difficulty, playPop, startRound]);

  const handleObstacleHit = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;
    setGameState('hit');
    playError();
    setSplash(true);
  }, [playError]);

  useEffect(() => {
    if (gameState !== 'playing') {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 2);
      last = now;
      const speed = SPEEDS[difficulty];

      itemsRef.current = itemsRef.current.map((item) => ({
        ...item,
        x: item.x - speed * dt,
      }));

      frameRef.current = {
        obstacles: frameRef.current.obstacles.map((o) => ({
          ...o,
          x: o.x - speed * dt,
        })).filter((o) => o.x > -OBSTACLE_SIZE),
      };

      const surferX = stageWidth * 0.18;
      const hitItemIndex = itemsRef.current.findIndex((item) => {
        if (item.lane !== surferLaneRef.current) return false;
        const itemY = item.lane * laneHeight + laneHeight / 2;
        const dx = Math.abs(item.x - surferX);
        const dy = Math.abs(itemY - surferY);
        return dx < (ITEM_SIZE + SURFER_SIZE) / 2.6 && dy < laneHeight * 0.55;
      });

      if (hitItemIndex !== -1) {
        const hitItem = itemsRef.current[hitItemIndex];
        itemsRef.current = itemsRef.current.filter((_, i) => i !== hitItemIndex);
        handleHit(hitItem);
      }

      const hitObstacle = frameRef.current.obstacles.find((o) => {
        if (o.lane !== surferLaneRef.current) return false;
        const obstacleY = o.lane * laneHeight + laneHeight / 2;
        const dx = Math.abs(o.x - surferX);
        const dy = Math.abs(obstacleY - surferY);
        return dx < (OBSTACLE_SIZE + SURFER_SIZE) / 2.2 && dy < laneHeight * 0.5;
      });

      if (hitObstacle) {
        frameRef.current = {
          obstacles: frameRef.current.obstacles.filter((o) => o !== hitObstacle),
        };
        handleObstacleHit();
      }

      // Respawn new wave frame when all obstacles leave screen
      if (frameRef.current.obstacles.length === 0 && Math.random() < 0.008) {
        frameRef.current = generateWaveFrame(difficulty, stageWidth);
      }

      setItems([...itemsRef.current]);
      setFrame({ obstacles: [...frameRef.current.obstacles] });
      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [difficulty, gameState, handleHit, handleObstacleHit, laneHeight, stageWidth, surferY]);

  const handleDifficultyChange = (value: GameDifficulty) => {
    playPop();
    setDifficulty(value);
    setScore(0);
    setShowConfetti(false);
    setGameState('playing');
  };

  const handleRestart = () => {
    playPop();
    setScore(0);
    setShowConfetti(false);
    setGameState('playing');
    startRound(difficulty);
  };

  const handleSwipe = useCallback((direction: 'up' | 'down') => {
    const next = direction === 'up' ? surferLaneRef.current - 1 : surferLaneRef.current + 1;
    changeLane(next);
  }, [changeLane]);

  const touchStartRef = useRef<{ y: number; x: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { y: t.clientY, x: t.clientX };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;
    const t = e.changedTouches[0];
    const dy = t.clientY - start.y;
    const dx = t.clientX - start.x;
    touchStartRef.current = null;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 24) {
      handleSwipe(dy > 0 ? 'down' : 'up');
    }
  };

  const laneButtons = useMemo(() => (
    <div className="absolute inset-0 flex flex-col">
      {Array.from({ length: LANE_COUNT }, (_, lane) => (
        <button
          key={lane}
          data-testid={`wave-lane-${lane}`}
          onClick={() => changeLane(lane)}
          className="flex-1 w-full bg-transparent cursor-pointer"
          aria-label={`wave lane ${lane + 1}`}
        />
      ))}
    </div>
  ), [changeLane]);

  const renderItem = (item: FloatingItem) => {
    const top = item.lane * laneHeight + laneHeight / 2 - ITEM_SIZE / 2;
    return (
      <div
        key={`${item.lane}-${item.value}`}
        data-testid="wave-item"
        data-lane={item.lane}
        data-value={item.value}
        data-correct={item.isCorrect}
        className="absolute flex items-center justify-center rounded-full bg-white/90 border-4 border-sky-300 shadow-lg text-2xl font-black text-slate-700"
        style={{
          left: `${item.x - ITEM_SIZE / 2}px`,
          top: `${top}px`,
          width: ITEM_SIZE,
          height: ITEM_SIZE,
        }}
      >
        <span className="mr-1">{item.emoji}</span>
        <span>{item.value}</span>
      </div>
    );
  };

  const renderObstacle = (obstacle: WaveObstacle) => {
    const top = obstacle.lane * laneHeight + laneHeight / 2 - OBSTACLE_SIZE / 2;
    return (
      <div
        key={`${obstacle.lane}-${obstacle.x}`}
        data-testid="wave-obstacle"
        data-lane={obstacle.lane}
        className="absolute flex items-center justify-center text-5xl"
        style={{
          left: `${obstacle.x - OBSTACLE_SIZE / 2}px`,
          top: `${top}px`,
          width: OBSTACLE_SIZE,
          height: OBSTACLE_SIZE,
        }}
      >
        {obstacle.emoji}
      </div>
    );
  };

  const surferX = stageWidth * 0.18;

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 w-full select-none max-w-lg mx-auto">
      {showConfetti && <GameConfetti pieces={150} />}

      <div className="w-full flex flex-col gap-2 z-10">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.waveSurfer.title}</h2>
          <p className="text-slate-500 font-extrabold text-sm">{t.waveSurfer.subtitle}</p>
        </div>
        <DifficultySelector
          selected={difficulty}
          options={['easy', 'medium', 'hard']}
          onChange={handleDifficultyChange}
        />
      </div>

      <div
        ref={stageRef}
        data-testid="wave-stage"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative flex-1 w-full my-4 rounded-3xl border-4 border-sky-300 bg-gradient-to-b from-sky-200 via-sky-300 to-blue-400 overflow-hidden"
      >
        {/* Lane waves */}
        {Array.from({ length: LANE_COUNT }, (_, lane) => (
          <div
            key={lane}
            data-testid="wave-lane-bg"
            className="absolute left-0 right-0 border-b-4 border-dashed border-white/40"
            style={{
              top: `${lane * laneHeight}px`,
              height: `${laneHeight}px`,
            }}
          />
        ))}

        {/* Touch lanes */}
        {laneButtons}

        {/* Obstacles */}
        {frame.obstacles.map(renderObstacle)}

        {/* Floating items */}
        {items.map(renderItem)}

        {/* Surfer */}
        <div
          data-testid="wave-surfer"
          className={`absolute flex items-center justify-center text-6xl transition-transform duration-150 ${
            splash ? 'animate-shake rotate-12' : ''
          } ${gameState === 'success' ? 'animate-spin' : ''}`}
          style={{
            left: `${surferX - SURFER_SIZE / 2}px`,
            top: `${surferY - SURFER_SIZE / 2}px`,
            width: SURFER_SIZE,
            height: SURFER_SIZE,
            filter: splash ? 'grayscale(0.4) brightness(1.1)' : undefined,
          }}
        >
          {gameState === 'success' ? BOARD_EMOJI : SURFER_EMOJI}
        </div>

        {/* Particles */}
        {particles.map((p) => {
          const top = p.lane * laneHeight + laneHeight / 2;
          return (
            <span
              key={p.id}
              className="absolute rounded-full pointer-events-none animate-ping"
              style={{
                left: `${p.x}px`,
                top: `${top}px`,
                width: 10,
                height: 10,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: '0.7s',
              }}
            />
          );
        })}

        {/* Retry overlay */}
        {gameState === 'hit' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 z-20">
            <div className="bg-white/95 border-4 border-sky-400 rounded-[2rem] p-6 text-center shadow-2xl">
              <div className="text-5xl mb-2">🌊</div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t.waveSurfer.tryAgain}</h3>
              <KidButton color="blue" size="md" onClick={handleRetry} data-testid="wave-retry">
                {t.waveSurfer.retry}
              </KidButton>
            </div>
          </div>
        )}

        {/* Victory overlay */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 z-20">
            <div className="bg-white/95 border-4 border-sky-400 rounded-[2rem] p-6 text-center shadow-2xl">
              <div className="text-5xl mb-2">🏆</div>
              <h3 className="text-2xl font-black text-slate-800 mb-2">{t.waveSurfer.victory}</h3>
              <p className="text-slate-500 font-bold mb-4">
                {t.waveSurfer.earnedStars.replace('{count}', String(STARS[difficulty]))}
              </p>
              <KidButton color="blue" size="md" onClick={handleRestart} data-testid="wave-restart">
                {t.waveSurfer.playAgain}
              </KidButton>
            </div>
          </div>
        )}
      </div>

      <div className="w-full flex justify-between items-center px-2">
        <div className="text-slate-500 font-extrabold text-sm">
          {t.waveSurfer.round.replace('{current}', String(score + 1)).replace('{total}', String(TARGET_ROUNDS))}
        </div>
        <div className="bg-white/80 border-2 border-sky-300 rounded-2xl px-4 py-2 text-center shadow-sm">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider">{t.waveSurfer.challenge}</div>
          <div className="text-xl md:text-2xl font-black text-slate-800">
            {round.challenge.type === 'spelling' && round.challenge.promptEmoji ? `${round.challenge.promptEmoji} ` : ''}
            {round.challenge.text}
          </div>
        </div>
      </div>
    </div>
  );
}
