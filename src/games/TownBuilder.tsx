import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { TownCell, createEmptyGrid, TOWN_GRID_SIZE } from '../types/gamification';
import type { ShopCategory } from '../types/gamification';
import { SHOP_CATEGORIES, getItemsByCategory, getItemById } from '../data/townItems';
import { HoldToConfirmButton } from '../components/HoldToConfirmButton';
import { useCanvasLoop } from '../hooks/useCanvasLoop';
import { spawnParticles, drawParticles, type Particle } from '../utils/particles';

const CONFETTI_COLORS = ['#FFD54F', '#FF8A65', '#4FC3F7', '#AED581', '#BA68C8'];

/** Maps a shop category to its "Petting Zoo" tap-feedback CSS animation class. */
function getPokeClassForCategory(category: ShopCategory | undefined): string {
  switch (category) {
    case 'vehicles':
      return 'town-poke-slide';
    case 'animals':
      return 'town-poke-jump';
    case 'nature':
      return 'town-poke-sway-small';
    case 'decorations':
      return 'town-poke-rotate';
    default:
      return 'town-poke-swell';
  }
}


interface TownBuilderProps {
  stars: number;
  spendStars: (amount: number) => boolean;
  addStars: (amount: number) => void; // for 50% refunds
  playPop: () => void;
  playSuccess: () => void;
  playAnimalSound: () => void;
  playCarHonk: () => void;
  playDoorChime: () => void;
  playWindBreeze: () => void;
}


// localStorage helpers


const STORAGE_KEY = 'gamification_town';

function loadTown(): (TownCell | null)[][] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return createEmptyGrid();
}

function saveTown(grid: (TownCell | null)[][]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(grid));
  } catch {
    /* ignore */
  }
}


function computeTotalRefund(grid: (TownCell | null)[][]): number {
  let total = 0;
  grid.forEach((row) => {
    row.forEach((cell) => {
      if (cell) {
        const item = getItemById(cell.itemId);
        if (item) total += Math.floor(item.cost / 2);
      }
    });
  });
  return total;
}


export function TownBuilder({
  stars,
  spendStars,
  addStars,
  playPop,
  playSuccess,
  playAnimalSound,
  playCarHonk,
  playDoorChime,
  playWindBreeze,
}: TownBuilderProps) {
  const { t } = useTranslation();


  const [grid, setGrid] = useState<(TownCell | null)[][]>(loadTown);
  const [catalogCell, setCatalogCell] = useState<{ row: number; col: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('buildings');
  const [removeCell, setRemoveCell] = useState<{ row: number; col: number } | null>(null);
  const [justPlaced, setJustPlaced] = useState<string | null>(null); // "row-col"
  const [pokedCell, setPokedCell] = useState<string | null>(null); // "row-col" – "Petting Zoo" tap feedback
  const pokeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showDeleteAllPrompt, setShowDeleteAllPrompt] = useState(false);

  // Placement confetti particle overlay
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  useCanvasLoop(
    confettiCanvasRef,
    gridContainerRef,
    (ctx) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      drawParticles(ctx, particlesRef.current);
    },
    [],
    600,
  );

  useEffect(() => {
    return () => {
      if (pokeTimeout.current) {
        clearTimeout(pokeTimeout.current);
      }
    };
  }, []);

  // long-press tracking
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  // persist to localStorage whenever grid changes
  useEffect(() => {
    saveTown(grid);
  }, [grid]);


  // "Petting Zoo" – tapping an already-placed item plays sound/haptic feedback
  // and swells it (or slides it for vehicles) instead of opening the catalog.
  const triggerItemFeedback = useCallback(
    (row: number, col: number) => {
      const cell = grid[row][col];
      if (!cell) return;
      const item = getItemById(cell.itemId);

      // Each category gets a distinct sound effect to match its tap animation.
      switch (item?.category) {
        case 'animals':
          playAnimalSound();
          break;
        case 'vehicles':
          playCarHonk();
          break;
        case 'buildings':
          playDoorChime();
          break;
        case 'nature':
          playWindBreeze();
          break;
        default:
          playPop();
      }

      const key = `${row}-${col}`;
      if (pokeTimeout.current) clearTimeout(pokeTimeout.current);
      // Reset first so the animation reliably restarts even on rapid repeated
      // taps of the same cell (re-adding an already-present class name would
      // not retrigger the CSS animation).
      setPokedCell(null);
      requestAnimationFrame(() => {
        setPokedCell(key);
        // All category-specific poke animations run for about 1s. Start the
        // cleanup timer only after the class has actually been applied.
        pokeTimeout.current = setTimeout(() => setPokedCell(null), 1000);
      });
    },
    [grid, playPop, playAnimalSound, playCarHonk, playDoorChime, playWindBreeze],
  );

  const handleCellClick = (row: number, col: number) => {
    if (longPressTriggered.current) return; // ignore click after long-press
    const cell = grid[row][col];
    if (cell) {
      triggerItemFeedback(row, col);
    } else {

      setActiveCategory('buildings');
      setCatalogCell({ row, col });
      playPop();
    }
  };

  const handlePointerDown = (row: number, col: number) => {
    const cell = grid[row][col];
    if (!cell) return; // only for occupied cells
    longPressTriggered.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setRemoveCell({ row, col });
      playPop();
    }, 500);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };


  // Catalog – buy an item


  const handleBuyItem = useCallback(
    (itemId: string) => {
      if (!catalogCell) return;
      const item = getItemById(itemId);
      if (!item) return;

      if (!spendStars(item.cost)) return; // can't afford

      const key = `${catalogCell.row}-${catalogCell.col}`;
      setGrid((prev) => {
        const next = prev.map((r) => [...r]);
        next[catalogCell.row][catalogCell.col] = {
          emoji: item.emoji,
          itemId: item.id,
        };
        return next;
      });

      setJustPlaced(key);
      setTimeout(() => setJustPlaced(null), 500);

      // Placement Confetti – burst particles from the freshly placed cell.
      const canvas = confettiCanvasRef.current;
      if (canvas) {
        const cellSize = canvas.width / TOWN_GRID_SIZE;
        const x = (catalogCell.col + 0.5) * cellSize;
        const y = (catalogCell.row + 0.5) * cellSize;
        const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
        spawnParticles(particlesRef.current, x, y, color, 20);
      }

      setCatalogCell(null);
      playSuccess();
    },
    [catalogCell, spendStars, playSuccess],
  );


  // Remove an item (with 50% refund)


  const handleConfirmRemove = useCallback(() => {
    if (!removeCell) return;
    const cell = grid[removeCell.row][removeCell.col];
    if (!cell) return;

    const item = getItemById(cell.itemId);
    const refundAmount = item ? Math.floor(item.cost / 2) : 0;

    setGrid((prev) => {
      const next = prev.map((r) => [...r]);
      next[removeCell.row][removeCell.col] = null;
      return next;
    });

    if (refundAmount > 0) addStars(refundAmount);
    setRemoveCell(null);
    playPop();
  }, [removeCell, grid, addStars, playPop]);


  // Remove all items (with 50% refund for each item)


  const handleConfirmDeleteAll = useCallback(() => {
    const totalRefund = computeTotalRefund(grid);

    setGrid(createEmptyGrid());
    if (totalRefund > 0) addStars(totalRefund);
    setShowDeleteAllPrompt(false);
    playSuccess();
  }, [grid, addStars, playSuccess]);

  const handleDeleteAllHoldConfirm = () => {
    const hasItems = grid.some((row) => row.some((cell) => cell !== null));
    if (!hasItems) return;

    setShowDeleteAllPrompt(true);
    playPop();
  };


  const catalogItems = getItemsByCategory(activeCategory);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto px-2 py-4 select-none">
      {/* Title */}
      <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-300 tracking-tight">
        {t.town.title}
      </h2>

      {/* Subtitle hint */}
      <p className="text-sm text-amber-700/70 dark:text-amber-400/60 -mt-2">
        {t.town.empty}
      </p>

      {/* Grid */}
      <div ref={gridContainerRef} className="relative w-full">
        <div
          className="grid gap-1.5 w-full rounded-2xl p-3 bg-amber-50/60 dark:bg-amber-900/20 shadow-inner"
          style={{
            gridTemplateColumns: `repeat(${TOWN_GRID_SIZE}, 1fr)`,
          }}
        >
          {grid.map((row, ri) =>
            row.map((cell, ci) => {
              const key = `${ri}-${ci}`;
              const isJustPlaced = justPlaced === key;
              const isPoked = pokedCell === key;
              const item = cell ? getItemById(cell.itemId) : null;
              const animClass = item?.animation ?? '';
              const pokeClass = getPokeClassForCategory(item?.category);

              return (
                <button
                  key={key}
                  type="button"
                  className={
                    cell
                      ? `group aspect-square flex items-center justify-center rounded-xl text-2xl sm:text-3xl
                         bg-amber-100/80 dark:bg-amber-800/30`
                      : `aspect-square flex items-center justify-center rounded-xl
                         bg-green-100 dark:bg-green-900/30
                         border-2 border-dashed border-green-300 dark:border-green-700
                         text-green-400 dark:text-green-600 text-xl
                         hover:bg-green-200/60 dark:hover:bg-green-800/30 transition-colors`
                  }
                  onClick={() => handleCellClick(ri, ci)}
                  onPointerDown={() => handlePointerDown(ri, ci)}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label={cell ? cell.emoji : t.town.empty}
                >
                  {cell ? (
                    <span
                      className={`inline-block transition-transform group-active:scale-95 ${isJustPlaced ? 'town-place' : isPoked ? pokeClass : animClass}`}
                    >
                      {cell.emoji}
                    </span>
                  ) : (
                    '+'
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Placement Confetti overlay – purely decorative, sits above the grid */}
        <canvas
          ref={confettiCanvasRef}
          data-testid="town-confetti-canvas"
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* Delete All Control */}
      <div className="flex justify-end w-full px-1">
        <HoldToConfirmButton
          onConfirm={handleDeleteAllHoldConfirm}
          disabled={!grid.some((row) => row.some((cell) => cell !== null))}
          className={`px-5 py-2.5 rounded-2xl font-black text-sm tracking-wide border-2 transition-all cursor-pointer active:scale-95 ${
            grid.some((row) => row.some((cell) => cell !== null))
              ? 'text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/60 dark:hover:bg-red-950/20'
              : 'text-gray-300 border-gray-100 dark:text-gray-700 dark:border-gray-800 cursor-not-allowed opacity-50'
          }`}
          data-testid="town-delete-all"
        >
          {(progress) => (
            <>🗑️ {progress > 0 ? t.town.holdToDeleteAll : t.town.deleteAll}</>
          )}
        </HoldToConfirmButton>
      </div>

      {/* ============================================================= */}
      {/* Catalog Modal */}
      {/* ============================================================= */}
      {catalogCell && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setCatalogCell(null)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl
                        animate-[slideUp_0.3s_ease-out] pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">
                {t.town.catalog}
              </h3>
              <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                ⭐ {stars}
              </span>
            </div>

            {/* Category tabs – horizontally scrollable */}
            <div className="flex gap-2 px-5 py-2 overflow-x-auto scrollbar-hide">
              {SHOP_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                    ${
                      activeCategory === cat.id
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'bg-amber-100 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-700/50'
                    }`}
                >
                  {cat.emoji}{' '}
                  {t.town.categories[cat.nameKey as keyof typeof t.town.categories]}
                </button>
              ))}
            </div>

            {/* Items grid */}
            <div className="grid grid-cols-4 gap-3 px-5 pt-3 max-h-60 overflow-y-auto">
              {catalogItems.map((item) => {
                const canAfford = stars >= item.cost;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={!canAfford}
                    onClick={() => handleBuyItem(item.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all
                      ${
                        canAfford
                          ? 'bg-green-50 dark:bg-green-900/30 hover:bg-green-100 dark:hover:bg-green-800/40 active:scale-90 cursor-pointer'
                          : 'bg-gray-100 dark:bg-gray-800/40 opacity-40 cursor-not-allowed'
                      }`}
                  >
                    <span className="text-3xl">{item.emoji}</span>
                    <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 leading-tight text-center">
                      {t.town.items[item.nameKey as keyof typeof t.town.items]}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        canAfford
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-gray-400 dark:text-gray-600'
                      }`}
                    >
                      ⭐ {item.cost}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cancel */}
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setCatalogCell(null)}
                className="px-6 py-2 rounded-full text-sm font-medium
                           bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                           hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {t.town.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* Remove Confirmation Overlay */}
      {/* ============================================================= */}
      {removeCell && (() => {
        const cell = grid[removeCell.row][removeCell.col];
        if (!cell) return null;
        const item = getItemById(cell.itemId);
        const refund = item ? Math.floor(item.cost / 2) : 0;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setRemoveCell(null)}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 mx-4 max-w-xs w-full text-center
                          animate-[scaleIn_0.2s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-5xl block mb-3">{cell.emoji}</span>
              <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {t.town.confirmRemove}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                {t.town.refund}: ⭐ {refund}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setRemoveCell(null)}
                  className="px-5 py-2 rounded-full text-sm font-medium
                             bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                             hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t.town.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRemove}
                  className="px-5 py-2 rounded-full text-sm font-medium
                             bg-red-500 text-white
                             hover:bg-red-600 active:scale-95 transition-all"
                >
                  {t.town.remove}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================= */}
      {/* Delete All Confirmation Overlay */}
      {/* ============================================================= */}
      {showDeleteAllPrompt && (() => {
        const totalRefund = computeTotalRefund(grid);

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteAllPrompt(false)}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6 mx-4 max-w-xs w-full text-center
                          animate-[scaleIn_0.2s_ease-out]"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-5xl block mb-3">🗑️</span>
              <p className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                {t.town.confirmDeleteAll}
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">
                {t.town.refund}: ⭐ {totalRefund}
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowDeleteAllPrompt(false)}
                  className="px-5 py-2 rounded-full text-sm font-medium
                             bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300
                             hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t.town.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAll}
                  className="px-5 py-2 rounded-full text-sm font-medium
                             bg-red-500 text-white
                             hover:bg-red-600 active:scale-95 transition-all"
                  data-testid="town-confirm-delete-all-btn"
                >
                  {t.town.remove}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* inline keyframes for modal animations */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

export default TownBuilder;
