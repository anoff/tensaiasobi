import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import {
  generateRound,
  createSnacks,
  evaluate,
  STARS_BY_DIFFICULTY,
  type Snack,
  type SnackLocation,
  type FairShareRound,
} from '../utils/fairSharePicnic';

const FRIEND_EMOJIS = ['🧒', '👧', '👦', '🧑'];

type FairSharePicnicProps = GameProps;

function parseDropTarget(el: Element | null): SnackLocation | null {
  const target = el?.closest('[data-drop-target]');
  if (!target) return null;
  const value = target.getAttribute('data-drop-target');
  if (value === 'basket' || value === 'leftover') return value;
  const idx = Number(value);
  return Number.isFinite(idx) ? idx : null;
}

export function FairSharePicnic({ playPop, playSuccess, playError, onStarEarned }: FairSharePicnicProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [round, setRound] = useState<FairShareRound>(() => generateRound('easy'));
  const [snacks, setSnacks] = useState<Snack[]>(() => createSnacks(round));
  const [isSolved, setIsSolved] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [pulseFriends, setPulseFriends] = useState<Set<number>>(new Set());
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });

  const draggingIdRef = useRef<number | null>(null);

  const startRound = useCallback((diff: GameDifficulty) => {
    const newRound = generateRound(diff);
    setRound(newRound);
    setSnacks(createSnacks(newRound));
    setIsSolved(false);
    setShowConfetti(false);
    setPulseFriends(new Set());
    setDraggingId(null);
    draggingIdRef.current = null;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startRound(difficulty);
  }, [difficulty, startRound]);

  const moveSnack = useCallback(
    (id: number, location: SnackLocation) => {
      // Compute the next snack list from the latest committed state (rather
      // than inside a setState updater) so the side effects below run
      // exactly once per move, even under React StrictMode's double-invoke
      // checks of updater functions.
      const next = snacks.map((s) => (s.id === id ? { ...s, location } : s));
      setSnacks(next);

      const result = evaluate(next, round);
      if (result.solved) {
        setIsSolved(true);
        setShowConfetti(true);
        setPulseFriends(new Set());
        playSuccess();
        onStarEarned?.(STARS_BY_DIFFICULTY[difficulty]);
      } else if (result.allPlaced) {
        setPulseFriends(result.pulseFriends);
        if (result.pulseFriends.size > 0) playError();
      } else {
        setPulseFriends(new Set());
      }
    },
    [snacks, round, difficulty, playSuccess, playError, onStarEarned]
  );

  const startDrag = useCallback(
    (id: number, clientX: number, clientY: number) => {
      if (isSolved) return;
      playPop();
      draggingIdRef.current = id;
      setDraggingId(id);
      setDragPos({ x: clientX, y: clientY });
    },
    [isSolved, playPop]
  );

  const moveDrag = useCallback((clientX: number, clientY: number) => {
    if (draggingIdRef.current === null) return;
    setDragPos({ x: clientX, y: clientY });
  }, []);

  const endDrag = useCallback(
    (clientX: number, clientY: number) => {
      const id = draggingIdRef.current;
      if (id === null) return;
      draggingIdRef.current = null;
      setDraggingId(null);

      const el = document.elementFromPoint(clientX, clientY);
      const location = parseDropTarget(el);
      if (location !== null) {
        moveSnack(id, location);
      }
    },
    [moveSnack]
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

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  const basketSnacks = useMemo(() => snacks.filter((s) => s.location === 'basket'), [snacks]);
  const leftoverSnacks = useMemo(() => snacks.filter((s) => s.location === 'leftover'), [snacks]);
  const friendSnacks = useMemo(
    () => Array.from({ length: round.friends }, (_, i) => snacks.filter((s) => s.location === i)),
    [snacks, round.friends]
  );

  const renderSnack = (snack: Snack) => {
    const isDragging = draggingId === snack.id;
    return (
      <button
        key={snack.id}
        data-testid="picnic-snack"
        disabled={isSolved}
        className={`text-3xl sm:text-4xl leading-none cursor-grab active:cursor-grabbing select-none outline-none touch-none ${
          isDragging ? 'opacity-30' : ''
        }`}
        style={{ touchAction: 'none' }}
        onMouseDown={(e) => {
          e.preventDefault();
          startDrag(snack.id, e.clientX, e.clientY);
        }}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          if (touch) startDrag(snack.id, touch.clientX, touch.clientY);
        }}
        aria-label={round.snackEmoji}
      >
        {round.snackEmoji}
      </button>
    );
  };

  const draggingSnack = snacks.find((s) => s.id === draggingId);

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full">
      {showConfetti && <GameConfetti pieces={150} />}

      {/* Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0">
        <DifficultySelector
          selected={difficulty}
          options={['easy', 'medium', 'hard']}
          onChange={changeDifficulty}
          disabled={draggingId !== null}
          className="!w-auto flex-1 max-w-[220px]"
        />
      </div>

      {/* Title */}
      <div className="text-center space-y-1 mt-3 shrink-0">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.fairSharePicnic.title}</h2>
        <p className="text-sm font-extrabold text-slate-500">{t.fairSharePicnic.subtitle}</p>
      </div>

      {/* Playground */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 my-4 w-full h-full min-h-[300px]">
        {/* Friends and their plates */}
        <div className="flex flex-wrap items-end justify-center gap-4 w-full">
          {friendSnacks.map((items, friendIdx) => {
            const isPulsing = pulseFriends.has(friendIdx);
            return (
              <div key={friendIdx} className="flex flex-col items-center gap-1">
                <span className="text-4xl leading-none">{FRIEND_EMOJIS[friendIdx % FRIEND_EMOJIS.length]}</span>
                <div
                  data-testid="picnic-plate"
                  data-drop-target={friendIdx}
                  className={`min-w-[96px] min-h-[96px] w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 flex flex-wrap items-center justify-center content-center gap-0.5 p-1 transition-all duration-150 ${
                    isSolved
                      ? 'bg-emerald-100 border-emerald-400 animate-sparkle'
                      : isPulsing
                      ? 'bg-rose-100 border-rose-400 animate-shake'
                      : 'bg-white border-slate-300 shadow-[0_4px_0_0_#cbd5e1]'
                  }`}
                >
                  {items.map(renderSnack)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Leftover basket (hard mode only) */}
        {round.hasLeftover && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wide">
              {t.fairSharePicnic.leftoverLabel}
            </span>
            <div
              data-testid="picnic-leftover"
              data-drop-target="leftover"
              className="min-w-[96px] min-h-[96px] w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-4 border-dashed border-amber-300 bg-amber-50 flex flex-wrap items-center justify-center content-center gap-0.5 p-1"
            >
              {leftoverSnacks.map(renderSnack)}
            </div>
          </div>
        )}

        {/* Basket of remaining snacks */}
        <div className="flex flex-col items-center gap-1 w-full">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wide">
            {t.fairSharePicnic.basketLabel}
          </span>
          <div
            data-testid="picnic-basket"
            data-drop-target="basket"
            className="min-w-[96px] min-h-[96px] w-full max-w-xs rounded-3xl border-4 border-dashed border-slate-300 bg-slate-50 flex flex-wrap items-center justify-center content-center gap-1 p-2"
          >
            {basketSnacks.length === 0 ? (
              <span className="text-slate-300 text-sm font-bold">🧺</span>
            ) : (
              basketSnacks.map(renderSnack)
            )}
          </div>
        </div>
      </div>

      {/* Floating dragged snack */}
      {draggingId !== null && draggingSnack && (
        <div
          className="fixed z-50 pointer-events-none text-4xl sm:text-5xl"
          style={{
            left: dragPos.x,
            top: dragPos.y,
            transform: 'translate(-50%, -50%) scale(1.2)',
          }}
        >
          {round.snackEmoji}
        </div>
      )}

      {/* Victory Overlay */}
      {isSolved && (
        <div className="w-full flex flex-col items-center gap-3 pb-2 shrink-0">
          <p className="text-emerald-600 font-black text-lg animate-pulse">
            🎉 {t.fairSharePicnic.victory}
          </p>
          <KidButton
            color="green"
            size="lg"
            data-testid="picnic-play-again"
            onClick={() => { playPop(); startRound(difficulty); }}
            className="rounded-2xl tracking-wider uppercase"
          >
            🔄 {t.common.next}
          </KidButton>
        </div>
      )}

      {/* Help */}
      {!isSolved && (
        <div className="text-center font-extrabold text-xs pb-2 pt-2 shrink-0 text-slate-400">
          {t.fairSharePicnic.help}
        </div>
      )}
    </div>
  );
}

export default FairSharePicnic;
