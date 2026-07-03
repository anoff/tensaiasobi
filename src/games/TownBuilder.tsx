import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { TownCell, createEmptyGrid, TOWN_GRID_SIZE } from '../types/gamification';
import type { ShopCategory } from '../types/gamification';
import { SHOP_CATEGORIES, getItemsByCategory, getItemById } from '../data/townItems';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TownBuilderProps {
  stars: number;
  spendStars: (amount: number) => boolean;
  addStars: (amount: number) => void; // for 50% refunds
  playPop: () => void;
  playSuccess: () => void;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TownBuilder({
  stars,
  spendStars,
  addStars,
  playPop,
  playSuccess,
}: TownBuilderProps) {
  const { t } = useTranslation();

  // ---- state ----
  const [grid, setGrid] = useState<(TownCell | null)[][]>(loadTown);
  const [catalogCell, setCatalogCell] = useState<{ row: number; col: number } | null>(null);
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('buildings');
  const [removeCell, setRemoveCell] = useState<{ row: number; col: number } | null>(null);
  const [justPlaced, setJustPlaced] = useState<string | null>(null); // "row-col"

  const [showDeleteAllPrompt, setShowDeleteAllPrompt] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (holdInterval.current) {
        clearInterval(holdInterval.current);
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

  // ------------------------------------------------------------------
  // Grid interactions
  // ------------------------------------------------------------------

  const handleCellClick = (row: number, col: number) => {
    if (longPressTriggered.current) return; // ignore click after long-press
    const cell = grid[row][col];
    if (!cell) {
      // Open catalog for this empty cell
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

  // ------------------------------------------------------------------
  // Catalog – buy an item
  // ------------------------------------------------------------------

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
      setCatalogCell(null);
      playSuccess();
    },
    [catalogCell, spendStars, playSuccess],
  );

  // ------------------------------------------------------------------
  // Remove an item (with 50% refund)
  // ------------------------------------------------------------------

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

  // ------------------------------------------------------------------
  // Remove all items (with 50% refund for each item)
  // ------------------------------------------------------------------

  const handleConfirmDeleteAll = useCallback(() => {
    let totalRefund = 0;
    grid.forEach((row) => {
      row.forEach((cell) => {
        if (cell) {
          const item = getItemById(cell.itemId);
          if (item) {
            totalRefund += Math.floor(item.cost / 2);
          }
        }
      });
    });

    setGrid(createEmptyGrid());
    if (totalRefund > 0) addStars(totalRefund);
    setShowDeleteAllPrompt(false);
    playSuccess();
  }, [grid, addStars, playSuccess]);

  const startDeleteAllHold = () => {
    const hasItems = grid.some((row) => row.some((cell) => cell !== null));
    if (!hasItems) return;

    setHoldProgress(0);
    const startTime = Date.now();
    const duration = 1000;

    holdInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        if (holdInterval.current) {
          clearInterval(holdInterval.current);
          holdInterval.current = null;
        }
        setHoldProgress(0);
        setShowDeleteAllPrompt(true);
        playPop();
      }
    }, 30);
  };

  const cancelDeleteAllHold = () => {
    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }
    setHoldProgress(0);
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

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
            const item = cell ? getItemById(cell.itemId) : null;
            const animClass = item?.animation ?? '';

            return (
              <button
                key={key}
                type="button"
                className={
                  cell
                    ? `aspect-square flex items-center justify-center rounded-xl text-2xl sm:text-3xl
                       bg-amber-100/80 dark:bg-amber-800/30 transition-transform active:scale-95
                       ${isJustPlaced ? 'town-place' : animClass}`
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
                {cell ? cell.emoji : '+'}
              </button>
            );
          })
        )}
      </div>

      {/* Delete All Control */}
      <div className="flex justify-end w-full px-1">
        <button
          type="button"
          onPointerDown={startDeleteAllHold}
          onPointerUp={cancelDeleteAllHold}
          onPointerLeave={cancelDeleteAllHold}
          onContextMenu={(e) => e.preventDefault()}
          disabled={!grid.some((row) => row.some((cell) => cell !== null))}
          className={`relative overflow-hidden px-5 py-2.5 rounded-2xl font-black text-sm tracking-wide border-2 transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center gap-2 ${
            grid.some((row) => row.some((cell) => cell !== null))
              ? 'text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/60 dark:hover:bg-red-950/20'
              : 'text-gray-300 border-gray-100 dark:text-gray-700 dark:border-gray-800 cursor-not-allowed opacity-50'
          }`}
          data-testid="town-delete-all"
        >
          {/* Progress Fill Layer */}
          {holdProgress > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-red-500/20 dark:bg-red-500/10 pointer-events-none transition-all duration-75"
              style={{ width: `${holdProgress}%` }}
            />
          )}
          <span className="relative z-10 flex items-center gap-1.5">
            🗑️ {holdProgress > 0 ? t.town.holdToDeleteAll : t.town.deleteAll}
          </span>
        </button>
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
        let totalRefund = 0;
        grid.forEach((row) => {
          row.forEach((cell) => {
            if (cell) {
              const item = getItemById(cell.itemId);
              if (item) {
                totalRefund += Math.floor(item.cost / 2);
              }
            }
          });
        });

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
