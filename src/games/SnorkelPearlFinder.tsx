import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { shuffle } from '../utils/shuffle';

interface PearlColor {
  id: string;
  name: string;
  bgClass: string;
  borderClass: string;
  borderColor: string;
  shell: string;
  pearl: string;
  star: string;
}

interface Pearl {
  id: number;
  colorId: string;
  x: number;
  y: number;
  collected: boolean;
  wiggling: boolean;
}

interface DifficultyConfig {
  colors: PearlColor[];
  pearlCount: number;
  bubbleDensity: number; // 0 = no bubbles, 1 = sparse, 2 = dense
  bubblesMove: boolean;
  starsAward: number;
}

const COLORS: PearlColor[] = [
  { id: 'red', name: 'red', bgClass: 'bg-rose-400', borderClass: 'border-rose-600', borderColor: '#fb7185', shell: '🐚', pearl: '🔴', star: '⭐' },
  { id: 'yellow', name: 'yellow', bgClass: 'bg-amber-300', borderClass: 'border-amber-500', borderColor: '#fcd34d', shell: '🐚', pearl: '🟡', star: '🌟' },
  { id: 'blue', name: 'blue', bgClass: 'bg-sky-400', borderClass: 'border-sky-600', borderColor: '#38bdf8', shell: '🐚', pearl: '🔵', star: '✨' },
  { id: 'green', name: 'green', bgClass: 'bg-emerald-400', borderClass: 'border-emerald-600', borderColor: '#34d399', shell: '🐚', pearl: '🟢', star: '💫' },
];

const DIFFICULTY_CONFIG: Record<GameDifficulty, DifficultyConfig> = {
  easy: {
    colors: [COLORS[0], COLORS[1]],
    pearlCount: 3,
    bubbleDensity: 0,
    bubblesMove: false,
    starsAward: 1,
  },
  medium: {
    colors: [COLORS[0], COLORS[1], COLORS[2]],
    pearlCount: 5,
    bubbleDensity: 1,
    bubblesMove: true,
    starsAward: 2,
  },
  hard: {
    colors: [COLORS[0], COLORS[1], COLORS[2], COLORS[3]],
    pearlCount: 6,
    bubbleDensity: 2,
    bubblesMove: true,
    starsAward: 3,
  },
};

const CLAM_SIZE = 96;
const PEARL_SIZE = 64;
const BUBBLE_RADIUS = 44;

interface Bubble {
  id: number;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  speedX: number;
  speedY: number;
  phase: number;
}

function generatePearls(difficulty: GameDifficulty): Pearl[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  const pearls: Pearl[] = [];

  for (let i = 0; i < config.pearlCount; i++) {
    const color = config.colors[i % config.colors.length];
    pearls.push({
      id: i,
      colorId: color.id,
      x: 0,
      y: 0,
      collected: false,
      wiggling: false,
    });
  }

  return shuffle(pearls);
}

function generateBubbles(difficulty: GameDifficulty, width: number, height: number): Bubble[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  if (config.bubbleDensity === 0) return [];

  const count = config.bubbleDensity === 1 ? 18 : 35;
  const bubbles: Bubble[] = [];

  for (let i = 0; i < count; i++) {
    bubbles.push({
      id: i,
      x: Math.random() * width,
      y: Math.random() * height,
      radius: BUBBLE_RADIUS + Math.random() * 20,
      opacity: 0.35 + Math.random() * 0.35,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: config.bubblesMove ? -0.3 - Math.random() * 0.5 : 0,
      phase: Math.random() * Math.PI * 2,
    });
  }

  return bubbles;
}

function positionPearls(pearls: Pearl[], rect: DOMRect) {
  const margin = PEARL_SIZE;
  const minY = CLAM_SIZE + 24;
  const maxY = rect.height - CLAM_SIZE - margin - 24;
  const maxX = rect.width - margin;

  pearls.forEach((pearl, index) => {
    const colCount = Math.ceil(Math.sqrt(pearls.length));
    const col = index % colCount;
    const row = Math.floor(index / colCount);
    const cellW = (maxX - margin) / colCount;
    const cellH = (maxY - minY) / Math.ceil(pearls.length / colCount);

    const jitterX = (Math.random() - 0.5) * cellW * 0.6;
    const jitterY = (Math.random() - 0.5) * cellH * 0.6;

    pearl.x = margin + col * cellW + cellW / 2 + jitterX;
    pearl.y = minY + row * cellH + cellH / 2 + jitterY;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type SnorkelPearlFinderProps = GameProps;

export function SnorkelPearlFinder({ playPop, playSuccess, playError, onStarEarned }: SnorkelPearlFinderProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [pearls, setPearls] = useState<Pearl[]>([]);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [clamStates, setClamStates] = useState<Record<string, 'open' | 'closed' | 'munch'>>({});
  const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);

  const stageRef = useRef<HTMLDivElement>(null);
  const draggingIdRef = useRef<number | null>(null);
  const animationRef = useRef<number | null>(null);

  const config = DIFFICULTY_CONFIG[difficulty];

  const startRound = useCallback((diff: GameDifficulty) => {
    const newPearls = generatePearls(diff);
    if (stageRef.current) {
      positionPearls(newPearls, stageRef.current.getBoundingClientRect());
    } else {
      newPearls.forEach((pearl) => {
        pearl.x = 150 + Math.random() * 100;
        pearl.y = 200 + Math.random() * 200;
      });
    }
    setPearls(newPearls);
    setBubbles(
      stageRef.current
        ? generateBubbles(diff, stageRef.current.getBoundingClientRect().width, stageRef.current.getBoundingClientRect().height)
        : []
    );
    setIsWon(false);
    setShowConfetti(false);
    setDraggingId(null);
    draggingIdRef.current = null;
    setClamStates({});
    setSparkles([]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startRound(difficulty);
  }, [difficulty, startRound]);

  useEffect(() => {
    if (!config.bubblesMove) return;

    const animate = () => {
      setBubbles((prev) =>
        prev.map((bubble) => {
          const nextY = bubble.y + bubble.speedY;
          const nextX = bubble.x + bubble.speedX + Math.sin(Date.now() / 1000 + bubble.phase) * 0.3;
          return {
            ...bubble,
            x: nextX < -bubble.radius ? nextX + (stageRef.current?.getBoundingClientRect().width ?? 0) + bubble.radius * 2 : nextX,
            y: nextY < -bubble.radius
              ? (stageRef.current?.getBoundingClientRect().height ?? 0) + bubble.radius
              : nextY,
          };
        })
      );
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [config.bubblesMove]);

  const startDrag = useCallback(
    (id: number, clientX: number, clientY: number) => {
      if (isWon) return;
      const pearl = pearls.find((p) => p.id === id);
      if (!pearl || pearl.collected) return;
      playPop();
      draggingIdRef.current = id;
      setDraggingId(id);
      setDragPos({ x: clientX, y: clientY });
    },
    [isWon, pearls, playPop]
  );

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (draggingIdRef.current === null) return;
    setDragPos({ x: clientX, y: clientY });
  }, []);

  const collectPearl = useCallback(
    (pearl: Pearl) => {
      setPearls((prev) => prev.map((p) => (p.id === pearl.id ? { ...p, collected: true } : p)));
      setClamStates((prev) => ({ ...prev, [pearl.colorId]: 'munch' }));
      playPop();

      // Spawn sparkles above the matched clam.
      const clamEl = document.querySelector(`[data-clam-color="${pearl.colorId}"]`);
      const box = clamEl?.getBoundingClientRect();
      if (box) {
        const newSparkles = Array.from({ length: 6 }, (_, i) => ({
          id: Date.now() + i,
          x: box.left + box.width / 2 + (Math.random() - 0.5) * 40,
          y: box.top + box.height / 2,
          color: COLORS.find((c) => c.id === pearl.colorId)?.star ?? '⭐',
        }));
        setSparkles((prev) => [...prev, ...newSparkles]);
        setTimeout(() => {
          setSparkles((prev) => prev.filter((s) => !newSparkles.find((ns) => ns.id === s.id)));
        }, 900);
      }

      setTimeout(() => {
        setClamStates((prev) => ({ ...prev, [pearl.colorId]: 'open' }));
      }, 450);
    },
    [playPop]
  );

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const id = draggingIdRef.current;
      if (id === null) return;
      draggingIdRef.current = null;
      setDraggingId(null);

      const pearl = pearls.find((p) => p.id === id);
      if (!pearl) return;

      const el = document.elementFromPoint(clientX, clientY);
      const clamColor = el?.closest('[data-clam-color]')?.getAttribute('data-clam-color');

      if (clamColor === pearl.colorId) {
        collectPearl(pearl);
        const remaining = pearls.filter((p) => !p.collected && p.id !== id);
        if (remaining.length === 0) {
          setIsWon(true);
          setShowConfetti(true);
          playSuccess();
          onStarEarned?.(config.starsAward);
        }
      } else {
        playError();
        setPearls((prev) => prev.map((p) => (p.id === id ? { ...p, wiggling: true } : p)));
        setTimeout(() => {
          setPearls((prev) => prev.map((p) => (p.id === id ? { ...p, wiggling: false } : p)));
        }, 400);
      }
    },
    [pearls, config.starsAward, collectPearl, playError, playSuccess, onStarEarned]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => moveDrag(e.clientX, e.clientY);
    const handleMouseUp = (e: MouseEvent) => endDrag(e.clientX, e.clientY);
    const handleTouchMove = (e: TouchEvent) => {
      if (draggingIdRef.current === null) return;
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) moveDrag(touch.clientX, touch.clientY);
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (touch) endDrag(touch.clientX, touch.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [moveDrag, endDrag]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (config.bubbleDensity === 0) return;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const brush = BUBBLE_RADIUS * 1.2;

      setBubbles((prev) =>
        prev.filter((bubble) => {
          const dx = bubble.x - x;
          const dy = bubble.y - y;
          return Math.sqrt(dx * dx + dy * dy) > brush;
        })
      );
    },
    [config.bubbleDensity]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (config.bubbleDensity === 0) return;
      if (draggingIdRef.current !== null) return;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const x = clamp(e.clientX - rect.left, 0, rect.width);
      const y = clamp(e.clientY - rect.top, 0, rect.height);
      const brush = BUBBLE_RADIUS;

      setBubbles((prev) =>
        prev.filter((bubble) => {
          const dx = bubble.x - x;
          const dy = bubble.y - y;
          return Math.sqrt(dx * dx + dy * dy) > brush;
        })
      );
    },
    [config.bubbleDensity]
  );

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  const pearlById = useMemo(() => pearls.find((p) => p.id === draggingId), [pearls, draggingId]);
  const colorById = useMemo(() => {
    const map = new Map<string, PearlColor>();
    COLORS.forEach((c) => map.set(c.id, c));
    return map;
  }, []);

  const clamTargets = config.colors;

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full">
      {showConfetti && <GameConfetti pieces={150} />}

      {/* Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0">
        <DifficultySelector
          selected={difficulty}
          options={['easy', 'medium', 'hard']}
          onChange={changeDifficulty}
          disabled={isWon || draggingId !== null}
          className="!w-auto flex-1 max-w-[220px]"
        />
      </div>

      {/* Title */}
      <div className="text-center space-y-1 mt-3 shrink-0">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.snorkelPearlFinder.title}</h2>
        <p className="text-sm font-extrabold text-slate-500">{t.snorkelPearlFinder.subtitle}</p>
      </div>

      {/* Playground */}
      <div className="flex-1 flex items-center justify-center my-4 w-full h-full min-h-[300px]">
        <div
          ref={stageRef}
          data-testid="snorkel-stage"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          className="relative w-full h-full max-h-[520px] rounded-[2.5rem] border-8 border-slate-300 overflow-hidden shadow-inner bg-gradient-to-b from-sky-200 via-cyan-200 to-teal-100 touch-none"
          style={{ touchAction: 'none' }}
        >
          {/* Seafloor sand texture hint */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-amber-100/60 to-transparent pointer-events-none" />

          {/* Top clams */}
          <div className="absolute top-3 left-0 right-0 flex items-center justify-center gap-3 px-2 z-10">
            {clamTargets.map((color) => (
              <div
                key={color.id}
                data-testid="snorkel-clam"
                data-clam-color={color.id}
                className={`
                  relative w-24 h-24 min-w-[96px] min-h-[96px] rounded-full border-4 flex items-center justify-center text-4xl shadow-md transition-all duration-200
                  ${color.bgClass} ${color.borderClass}
                  ${clamStates[color.id] === 'munch' ? 'scale-90' : 'scale-100'}
                `}
              >
                <span className="drop-shadow-sm">{color.shell}</span>
                <div className={`absolute inset-0 rounded-full border-4 border-white/40 ${clamStates[color.id] === 'munch' ? 'animate-ping opacity-50' : 'opacity-0'}`} />
              </div>
            ))}
          </div>

          {/* Pearls */}
          {pearls.map((pearl) => {
            if (pearl.collected) return null;
            const color = colorById.get(pearl.colorId);
            const isDragging = draggingId === pearl.id;
            return (
              <button
                key={pearl.id}
                data-testid="snorkel-pearl"
                data-pearl-color={pearl.colorId}
                disabled={isWon}
                onMouseDown={(e) => {
                  e.preventDefault();
                  startDrag(pearl.id, e.clientX, e.clientY);
                }}
                onTouchStart={(e) => {
                  const touch = e.touches[0];
                  if (touch) startDrag(pearl.id, touch.clientX, touch.clientY);
                }}
                className={`
                  absolute w-16 h-16 min-w-[64px] min-h-[64px] rounded-full border-4 bg-white shadow-lg flex items-center justify-center text-3xl
                  cursor-grab active:cursor-grabbing outline-none select-none touch-none
                  ${pearl.wiggling ? 'animate-shake' : ''}
                  ${isDragging ? 'opacity-0' : ''}
                `}
                style={{
                  left: pearl.x - PEARL_SIZE / 2,
                  top: pearl.y - PEARL_SIZE / 2,
                  borderColor: color?.borderColor ?? '#cbd5e1',
                  touchAction: 'none',
                }}
                aria-label={color?.name ?? pearl.colorId}
              >
                <span>{color?.pearl}</span>
              </button>
            );
          })}

          {/* Bubbles overlay */}
          {bubbles.map((bubble) => (
            <div
              key={bubble.id}
              data-testid="snorkel-bubble"
              className="absolute rounded-full border-2 border-white/60 bg-white/30 backdrop-blur-sm pointer-events-none"
              style={{
                left: bubble.x - bubble.radius,
                top: bubble.y - bubble.radius,
                width: bubble.radius * 2,
                height: bubble.radius * 2,
                opacity: bubble.opacity,
              }}
            />
          ))}

          {/* Floating dragged pearl */}
          {draggingId !== null && pearlById && (
            <div
              className="fixed z-50 pointer-events-none w-16 h-16 min-w-[64px] min-h-[64px] rounded-full border-4 bg-white shadow-2xl flex items-center justify-center text-3xl"
              style={{
                left: dragPos.x,
                top: dragPos.y,
                transform: 'translate(-50%, -50%) scale(1.2)',
                borderColor: colorById.get(pearlById.colorId)?.borderColor ?? '#cbd5e1',
              }}
            >
              <span>{colorById.get(pearlById.colorId)?.pearl}</span>
            </div>
          )}

          {/* Sparkles on correct matches */}
          {sparkles.map((sparkle) => (
            <div
              key={sparkle.id}
              className="fixed z-40 pointer-events-none text-2xl animate-sparkle"
              style={{ left: sparkle.x, top: sparkle.y, transform: 'translate(-50%, -50%)' }}
            >
              {sparkle.color}
            </div>
          ))}

          {/* Victory Overlay */}
          {isWon && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 space-y-4 z-20 overflow-y-auto">
              <span className="text-5xl sm:text-6xl animate-bounce">🐚🎉</span>
              <h2 className="text-2xl sm:text-3xl font-black text-center leading-tight text-slate-800">
                {t.snorkelPearlFinder.victory}
              </h2>
              <p className="text-center font-extrabold text-slate-500">
                {'⭐'.repeat(config.starsAward)}
              </p>
              <KidButton
                color="green"
                size="lg"
                data-testid="snorkel-play-again"
                onClick={() => { playPop(); startRound(difficulty); }}
                className="rounded-2xl tracking-wider uppercase"
              >
                🔄 {t.snorkelPearlFinder.playAgain}
              </KidButton>
            </div>
          )}
        </div>
      </div>

      {/* Help */}
      <div className="text-center font-extrabold text-xs pb-2 shrink-0 text-slate-400">
        {t.snorkelPearlFinder.help}
      </div>
    </div>
  );
}

export default SnorkelPearlFinder;
