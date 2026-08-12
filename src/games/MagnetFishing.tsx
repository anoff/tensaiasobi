import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import { useTranslation } from '../hooks/useTranslation';
import { starMultiplier } from '../utils/difficulty';
import { shuffle } from '../utils/shuffle';
import type { GameDifficulty, GameProps } from '../types/game';

type MagnetState = { x: number; y: number; dragging: boolean };

type GameItem = {
  id: number;
  emoji: string;
  magnetic: boolean;
  x: number;
  y: number;
  size: number;
  collected: boolean;
  wiggle: number;
};

const BASE_STARS = 2;

const MAGNETIC_EMOJIS = ['🗜️', '🔩', '🪙', '🔧', '⚙️', '📎', '🧷', '⛏️', '🪝', '🧲'];
const NON_MAGNETIC_EMOJIS = ['🪵', '🧸', '🍎', '🧽', '🪨', '📦', '🍌', '🥎', '🪴', '🧦'];

interface DifficultyConfig {
  magnetic: number;
  nonMagnetic: number;
  itemSize: number;
  capacity: number;
}

const CONFIG: Record<GameDifficulty, DifficultyConfig> = {
  easy: { magnetic: 3, nonMagnetic: 1, itemSize: 56, capacity: 10 },
  medium: { magnetic: 5, nonMagnetic: 3, itemSize: 44, capacity: 10 },
  hard: { magnetic: 7, nonMagnetic: 5, itemSize: 36, capacity: 3 },
};

function generateItems(difficulty: GameDifficulty, width: number, height: number): GameItem[] {
  const { magnetic, nonMagnetic, itemSize } = CONFIG[difficulty];
  const padding = itemSize / 2 + 8;
  const items: GameItem[] = [];
  let id = 0;

  const placeItem = (emoji: string, magneticFlag: boolean) => {
    let x = padding + Math.random() * Math.max(1, width - padding * 2);
    let y = padding + Math.random() * Math.max(1, height - padding * 2);
    let attempts = 0;
    const minDistance = itemSize * 0.9;

    while (attempts < 80) {
      const overlap = items.some((item) => {
        const dx = item.x - x;
        const dy = item.y - y;
        return Math.hypot(dx, dy) < minDistance;
      });
      if (!overlap) break;
      x = padding + Math.random() * Math.max(1, width - padding * 2);
      y = padding + Math.random() * Math.max(1, height - padding * 2);
      attempts++;
    }

    items.push({
      id: id++,
      emoji,
      magnetic: magneticFlag,
      x,
      y,
      size: itemSize,
      collected: false,
      wiggle: 0,
    });
  };

  const shuffledMagnetic = shuffle(MAGNETIC_EMOJIS);
  const shuffledNonMagnetic = shuffle(NON_MAGNETIC_EMOJIS);

  for (let i = 0; i < magnetic; i++) {
    placeItem(shuffledMagnetic[i % shuffledMagnetic.length], true);
  }
  for (let i = 0; i < nonMagnetic; i++) {
    placeItem(shuffledNonMagnetic[i % shuffledNonMagnetic.length], false);
  }

  return shuffle(items);
}

function easeToward(current: number, target: number, factor: number) {
  return current + (target - current) * factor;
}

export default function MagnetFishing({ playPop, playSuccess, onStarEarned }: GameProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [magnet, setMagnet] = useState<MagnetState>({ x: 0, y: 0, dragging: false });
  const [items, setItems] = useState<GameItem[]>([]);
  const [won, setWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const magnetRef = useRef<HTMLDivElement>(null);
  const binRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const config = CONFIG[difficulty];

  const updateMagnetPosition = useCallback((clientX: number, clientY: number) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    setMagnet((prev) => ({
      ...prev,
      x: Math.max(16, Math.min(rect.width - 16, clientX - rect.left)),
      y: Math.max(16, Math.min(rect.height - 16, clientY - rect.top)),
    }));
  }, []);

  const startRound = useCallback((diff: GameDifficulty) => {
    if (!stageRef.current) return;
    const { width, height } = stageRef.current.getBoundingClientRect();
    setItems(generateItems(diff, width, height));
    setWon(false);
    setShowConfetti(false);
    setMagnet((prev) => ({ ...prev, x: width / 2, y: height / 2 }));
  }, []);

  useEffect(() => {
    startRound(difficulty);
  }, [difficulty, startRound]);

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  const collectedItems = useMemo(() => items.filter((item) => item.collected), [items]);

  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    draggingRef.current = true;
    setMagnet((prev) => ({ ...prev, dragging: true }));
    updateMagnetPosition(clientX, clientY);
  }, [updateMagnetPosition]);

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!draggingRef.current) return;
      updateMagnetPosition(clientX, clientY);
    },
    [updateMagnetPosition]
  );

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
    setMagnet((prev) => ({ ...prev, dragging: false }));

    if (!binRef.current || !magnetRef.current) return;

    const binRect = binRef.current.getBoundingClientRect();
    const magnetRect = magnetRef.current.getBoundingClientRect();
    const magnetCenterX = magnetRect.left + magnetRect.width / 2;
    const magnetCenterY = magnetRect.top + magnetRect.height / 2;

    const overBin =
      magnetCenterX >= binRect.left &&
      magnetCenterX <= binRect.right &&
      magnetCenterY >= binRect.top &&
      magnetCenterY <= binRect.bottom;

    if (overBin && collectedItems.length > 0) {
      playSuccess();
      setShowConfetti(true);
      onStarEarned?.(BASE_STARS * starMultiplier(difficulty));
      setWon(true);
    }
  }, [collectedItems.length, difficulty, onStarEarned, playSuccess]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => handlePointerMove(e.clientX, e.clientY);
    const onPointerUp = () => handlePointerUp();
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => {
    const animate = () => {
      setItems((prev) => {
        if (won) return prev;
        const magnetX = magnet.x;
        const magnetY = magnet.y;
        let changed = false;
        const next = prev.map((item) => {
          if (item.collected) return item;
          const dx = magnetX - item.x;
          const dy = magnetY - item.y;
          const distance = Math.hypot(dx, dy);
          const attractRadius = item.size * 2.5;
          const snapRadius = item.size * 1.1;

          if (item.magnetic && distance < snapRadius && collectedItems.length < config.capacity) {
            changed = true;
            playPop();
            return { ...item, collected: true, wiggle: 0 };
          }

          if (item.magnetic && distance < attractRadius && collectedItems.length < config.capacity) {
            changed = true;
            return {
              ...item,
              x: easeToward(item.x, magnetX - dx * 0.15, 0.25),
              y: easeToward(item.y, magnetY - dy * 0.15, 0.25),
              wiggle: 0,
            };
          }

          if (!item.magnetic && distance < attractRadius) {
            changed = true;
            return { ...item, wiggle: (item.wiggle + 1) % 360 };
          }

          if (item.wiggle > 0) {
            changed = true;
            return { ...item, wiggle: 0 };
          }

          return item;
        });
        return changed ? next : prev;
      });
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [magnet.x, magnet.y, won, collectedItems.length, config.capacity, playPop]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) handlePointerDown(touch.clientX, touch.clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) handlePointerMove(touch.clientX, touch.clientY);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full">
      {showConfetti && <GameConfetti pieces={150} />}

      <div className="w-full flex items-center justify-between gap-3 bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0">
        <DifficultySelector
          selected={difficulty}
          options={['easy', 'medium', 'hard']}
          onChange={changeDifficulty}
          disabled={won}
          className="!w-auto flex-1 max-w-[220px]"
        />
      </div>

      <div className="text-center space-y-1 mt-3 shrink-0">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.magnetFishing.title}</h2>
        <p className="text-sm font-extrabold text-slate-500">{t.magnetFishing.subtitle}</p>
      </div>

      <div
        ref={stageRef}
        data-testid="magnet-stage"
        className="relative flex-1 w-full min-h-[300px] my-4 rounded-3xl border-4 border-slate-200 bg-gradient-to-b from-stone-200 to-stone-300 overflow-hidden"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {items.map((item) => {
          if (item.collected) return null;
          const rotation = item.wiggle > 0 ? Math.sin(item.wiggle * 0.5) * 12 : 0;
          return (
            <div
              key={item.id}
              data-testid={`magnet-item-${item.magnetic ? 'magnetic' : 'nonmagnetic'}`}
              className="absolute flex items-center justify-center select-none"
              style={{
                left: item.x - item.size / 2,
                top: item.y - item.size / 2,
                width: item.size,
                height: item.size,
                fontSize: item.size * 0.75,
                transform: `rotate(${rotation}deg)`,
                transition: item.wiggle > 0 ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              {item.emoji}
            </div>
          );
        })}

        <div
          ref={magnetRef}
          data-testid="magnet"
          className={`absolute z-20 flex items-center justify-center text-4xl sm:text-5xl select-none ${
            magnet.dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{
            left: magnet.x,
            top: magnet.y,
            transform: 'translate(-50%, -50%)',
            touchAction: 'none',
          }}
        >
          🧲
        </div>

        <div
          ref={binRef}
          data-testid="magnet-bin"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center"
        >
          <div className="text-5xl">🗑️</div>
          <span className="text-xs font-black text-slate-600 bg-white/70 px-2 py-0.5 rounded-full mt-1">
            {t.magnetFishing.binLabel}
          </span>
        </div>
      </div>

      {won ? (
        <div className="w-full flex flex-col items-center gap-3 pb-2 shrink-0">
          <p className="text-emerald-600 font-black text-lg animate-pulse">
            🎉 {t.magnetFishing.victory}
          </p>
          <KidButton
            color="green"
            size="lg"
            data-testid="magnet-play-again"
            onClick={() => { playPop(); startRound(difficulty); }}
            className="rounded-2xl tracking-wider uppercase"
          >
            🔄 {t.common.next}
          </KidButton>
        </div>
      ) : (
        <div className="text-center font-extrabold text-xs pb-2 pt-2 shrink-0 text-slate-400">
          {t.magnetFishing.help}
        </div>
      )}
    </div>
  );
}
