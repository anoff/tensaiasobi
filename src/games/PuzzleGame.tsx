import { useState, useEffect, useMemo, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { PUZZLE_IMAGES, PuzzleImage } from '../data/puzzleImages';
import { useGameFX } from '../hooks/gameFXContext';
import {
  generateEdgeProfiles,
  getJigsawPath,
  generateInitialState,
  type EdgeProfile,
} from './puzzleLogic';

interface JigsawPieceProps {
  pieceId: number;
  size: number;
  profile?: EdgeProfile;
  svgDataUrl: string;
  isLocked: boolean;
  isSelected: boolean;
  isSilhouette?: boolean;
  /** Silhouette shows only the dashed outline, not the faded picture (hard). */
  outlineOnly?: boolean;
  isWrong?: boolean;
  onClick?: () => void;
  className?: string;
}

export function JigsawPiece({
  pieceId,
  size,
  profile,
  svgDataUrl,
  isLocked,
  isSelected,
  isSilhouette = false,
  outlineOnly = false,
  isWrong = false,
  onClick,
  className = '',
}: JigsawPieceProps) {
  const pathD = useMemo(() => {
    if (!profile) {
      return 'M 0,0 L 100,0 L 100,100 L 0,100 Z'; // fallback flat square
    }
    return getJigsawPath(profile);
  }, [profile]);
  const correctCol = pieceId % size;
  const correctRow = Math.floor(pieceId / size);
  const clipPathId = `clip-jigsaw-${pieceId}${isSilhouette ? '-sil' : ''}`;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (onClick) onClick();
      }}
      disabled={isLocked || isSilhouette}
      className={`
        relative w-full aspect-square bg-transparent border-0 p-0 outline-none select-none
        ${(isLocked || isSilhouette) ? 'cursor-default pointer-events-none' : 'cursor-pointer'}
        ${className}
      `}
    >
      <svg
        viewBox="-22 -22 144 144"
        className={`
          absolute w-[140%] h-[140%] top-[-20%] left-[-20%] overflow-visible transition-all duration-150
          ${isSilhouette 
            ? 'opacity-25 grayscale-40 z-0 filter drop-shadow-none' 
            : isWrong
              ? 'filter drop-shadow-[0_6px_8px_rgba(239,68,68,0.5)] z-20 hover:scale-[1.03]'
              : isSelected 
                ? 'scale-110 filter drop-shadow-[0_10px_12px_rgba(255,110,180,0.55)] z-30 ring-0' 
                : 'filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.18)] hover:scale-[1.03] z-10'
          }
          ${isLocked ? 'z-0 filter drop-shadow-none' : ''}
        `}
      >
        <defs>
          <clipPath id={clipPathId}>
            <path d={pathD} />
          </clipPath>
        </defs>

        {/* Clipped portion of the SVG */}
        {!(isSilhouette && outlineOnly) && (
          <g clipPath={`url(#${clipPathId})`}>
            <image
              href={svgDataUrl}
              x={-correctCol * 100}
              y={-correctRow * 100}
              width={size * 100}
              height={size * 100}
            />
          </g>
        )}

        {/* Borders */}
        {isSilhouette ? (
          <path
            d={pathD}
            fill="none"
            stroke="rgba(100, 116, 139, 0.45)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
            className="pointer-events-none"
          />
        ) : isWrong ? (
          <>
            <path
              d={pathD}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
              className="pointer-events-none"
            />
            <path
              d={pathD}
              fill="none"
              stroke="rgba(185, 28, 28, 0.4)"
              strokeWidth="1"
              className="pointer-events-none"
            />
          </>
        ) : (
          <>
            {/* Highlight top-left/dark bottom-right border */}
            <path
              d={pathD}
              fill="none"
              stroke={isLocked ? 'rgba(255,255,255,0.2)' : '#ffffff'}
              strokeWidth="2.5"
              className="pointer-events-none"
            />
            <path
              d={pathD}
              fill="none"
              stroke={isLocked ? 'rgba(0,0,0,0.05)' : 'rgba(71,85,105,0.3)'}
              strokeWidth="1"
              className="pointer-events-none"
            />
          </>
        )}
      </svg>
    </button>
  );
}


export function PuzzleGame() {
  const { playPop, playSuccess, playError, onStarEarned } = useGameFX();
  const [level, setLevel] = useState<GameDifficulty>('easy');
  const [selectedImage, setSelectedImage] = useState<PuzzleImage>(PUZZLE_IMAGES[0]);

  // Board contains pieceId or null (empty cell)
  const [board, setBoard] = useState<(number | null)[]>([]);

  const [tray, setTray] = useState<number[]>([]);

  const [locked, setLocked] = useState<boolean[]>([]);

  const [edgeProfiles, setEdgeProfiles] = useState<EdgeProfile[]>([]);

  const [selectedTrayIdx, setSelectedTrayIdx] = useState<number | null>(null);

  // Drag from the tray: pull a piece up and drop it on a slot. Tapping still works.
  const [drag, setDrag] = useState<{ trayIdx: number; x: number; y: number; size: number; overSlot: number | null } | null>(null);
  const dragStartRef = useRef<{
    trayIdx: number;
    x: number;
    y: number;
    pointerId: number;
    touch: boolean;
    scrollLeft: number;
    scrolled: boolean;
  } | null>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const suppressClickRef = useRef(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const { t } = useTranslation();


  // 2×2 → 3×3 → 4×4. Tray pieces stay 64px (the tray scrolls); hard also
  // drops the picture hints from the empty slots.
  const size = level === 'easy' ? 2 : level === 'medium' ? 3 : 4;
  const outlineOnly = level === 'hard';

  // Check if state is in transition/out of sync
  const isSyncing = useMemo(() => {
    const total = size * size;
    return board.length !== total || edgeProfiles.length !== total || locked.length !== total;
  }, [board.length, edgeProfiles.length, locked.length, size]);


  const initGame = (currentSize: number) => {

    const profiles = generateEdgeProfiles(currentSize);
    setEdgeProfiles(profiles);


    const { initialBoard, initialTray } = generateInitialState(currentSize);

    setBoard(initialBoard);
    setTray(initialTray);
    setLocked(new Array(currentSize * currentSize).fill(false));
    setSelectedTrayIdx(null);
    setDrag(null);
    dragStartRef.current = null;
    setIsSolved(false);
    setShowConfetti(false);
    setShowPreview(false);
  };


  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initGame(size);
  }, [selectedImage, size, level]);

  const svgDataUrl = useMemo(() => selectedImage.src, [selectedImage]);


  const handleTrayPieceClick = (idx: number, fromPointer = false) => {
    if (!fromPointer && suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (isSolved || showPreview) {
      playError();
      return;
    }
    playPop();
    setSelectedTrayIdx(selectedTrayIdx === idx ? null : idx);
  };


  /** Put tray piece `trayIdx` on `slotIdx`; an occupant swaps back into the tray. */
  const placeFromTray = (trayIdx: number, slotIdx: number) => {
    if (locked[slotIdx]) return;
    const pieceId = tray[trayIdx];
    const currentOccupant = board[slotIdx];
    playPop();

    const newBoard = [...board];
    newBoard[slotIdx] = pieceId;

    const newTray = [...tray];
    if (currentOccupant !== null) {
      // Swap: Put the previous occupant back in the tray at the same index
      newTray[trayIdx] = currentOccupant;
    } else {
      newTray.splice(trayIdx, 1);
    }

    setBoard(newBoard);
    setTray(newTray);
    setSelectedTrayIdx(null);

    if (pieceId === slotIdx) {
      // Snap!
      playSuccess();
      const newLocked = [...locked];
      newLocked[slotIdx] = true;
      setLocked(newLocked);

      const allLocked = newLocked.every((val) => val === true);
      if (allLocked) {
        setIsSolved(true);
        setShowConfetti(true);

        let starAward = 4;
        if (level === 'medium') starAward = 10;
        else if (level === 'hard') starAward = 20;

        onStarEarned?.(starAward);
      }
    }
  };

  const slotAt = (x: number, y: number): number | null => {
    const attr = document.elementFromPoint(x, y)?.closest('[data-puzzle-slot]')?.getAttribute('data-puzzle-slot');
    return attr == null ? null : Number(attr);
  };

  const handleTrayPointerDown = (idx: number, e: ReactPointerEvent<HTMLDivElement>) => {
    if (isSolved || showPreview || e.button !== 0) return;
    // Capture right away so a fast mouse still reports moves after leaving the piece.
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = {
      trayIdx: idx,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      touch: e.pointerType !== 'mouse',
      scrollLeft: trayRef.current?.scrollLeft ?? 0,
      scrolled: false,
    };
  };

  const handleTrayPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    if (!drag) {
      const tray = trayRef.current;
      if (start.touch && tray) {
        // A finger scrolls the tray sideways until it leaves the tray upward; then the piece comes loose.
        if (e.clientY >= tray.getBoundingClientRect().top) {
          const dx = e.clientX - start.x;
          if (Math.abs(dx) >= 8) start.scrolled = true;
          if (start.scrolled) tray.scrollLeft = start.scrollLeft - dx;
          return;
        }
      } else if (Math.hypot(e.clientX - start.x, e.clientY - start.y) < 8) {
        // Small wiggles stay a tap.
        return;
      }
      const slotEl = document.querySelector('[data-puzzle-slot]');
      const slotSize = slotEl?.getBoundingClientRect().width ?? 80;
      setSelectedTrayIdx(null);
      playPop();
      setDrag({ trayIdx: start.trayIdx, x: e.clientX, y: e.clientY, size: slotSize, overSlot: null });
      return;
    }
    const over = slotAt(e.clientX, e.clientY);
    setDrag({ ...drag, x: e.clientX, y: e.clientY, overSlot: over != null && !locked[over] ? over : null });
  };

  const handleTrayPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStartRef.current;
    if (!start || start.pointerId !== e.pointerId) return;
    dragStartRef.current = null;
    // Pointer capture retargets the click, so handle the tap here and skip any click that follows.
    suppressClickRef.current = true;
    setTimeout(() => { suppressClickRef.current = false; }, 0);
    if (!drag) {
      if (!start.scrolled) handleTrayPieceClick(start.trayIdx, true);
      return;
    }
    setDrag(null);
    const slot = slotAt(e.clientX, e.clientY);
    if (slot != null && !locked[slot]) placeFromTray(drag.trayIdx, slot);
  };

  const handleTrayPointerCancel = () => {
    dragStartRef.current = null;
    setDrag(null);
  };

  const handleSlotClick = (slotIdx: number) => {
    if (isSolved || showPreview) {
      playError();
      return;
    }


    if (locked[slotIdx]) return;

    const currentOccupant = board[slotIdx];

    // Case 1: Place selected tray piece on the board
    if (selectedTrayIdx !== null) {
      placeFromTray(selectedTrayIdx, slotIdx);
    }
    // Case 2: No piece selected, but slot has a piece -> Return it to tray!
    else if (currentOccupant !== null) {
      playPop();
      const newBoard = [...board];
      newBoard[slotIdx] = null;

      const newTray = [...tray, currentOccupant];

      setBoard(newBoard);
      setTray(newTray);
    }
  };


  const handleSelectImage = (img: PuzzleImage) => {
    playPop();
    setSelectedImage(img);
  };

  const handleLevelChange = (lvl: GameDifficulty) => {
    playPop();
    setLevel(lvl);
  };

  const getGridColsClass = () => {
    switch (size) {
      case 2: return 'grid-cols-2 max-w-[260px]';
      case 3: return 'grid-cols-3 max-w-[290px]';
      case 4: return 'grid-cols-4 max-w-[290px]';
      default: return 'grid-cols-2 max-w-[260px]';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <GameConfetti pieces={120} />
      )}

      {/* Title block */}
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">
          {t.puzzleGame?.title || 'Magic Puzzle! 🧩'}
        </h2>
        <p className="text-slate-500 font-extrabold text-sm">
          {t.puzzleGame?.subtitle || 'Fix the picture by putting pieces on the board!'}
        </p>
      </div>

      {/* Image selector */}
      <div className="w-full flex flex-col items-center gap-1 my-2">
        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
          {t.puzzleGame?.selectImage || 'Choose a Picture:'}
        </span>
        <div className="flex gap-3 justify-center items-center py-1">
          {PUZZLE_IMAGES.map((img) => {
            const isSelected = selectedImage.id === img.id;
            return (
              <button
                key={img.id}
                onClick={() => handleSelectImage(img)}
                title={t.puzzleGame?.[img.nameKey as keyof typeof t.puzzleGame] as string || img.id}
                className={`
                  w-11 h-11 rounded-full text-xl flex items-center justify-center border-4 transition-all duration-150 outline-none cursor-pointer
                  ${isSelected 
                    ? 'bg-candy-purple border-purple-500 scale-110 shadow-md translate-y-[-2px]' 
                    : 'bg-white border-slate-300 hover:scale-105 active:scale-95'
                  }
                `}
              >
                {img.emoji}
              </button>
            );
          })}
        </div>
      </div>

      {/* Level / Difficulty Selector */}
      <DifficultySelector
        selected={level}
        options={['easy', 'medium', 'hard']}
        onChange={handleLevelChange}
        className="mt-1 max-w-[320px]"
      />

      {/* Puzzle Board Area */}
      <div className="flex-1 flex items-center justify-center my-3 w-full min-h-[250px] relative">
        <div className={`grid gap-0 w-full aspect-square justify-center items-center relative rounded-2xl p-2.5 bg-slate-200/50 border-4 border-slate-300/60 ${getGridColsClass()}`}>
          
          {/* Faint background silhouette of the target picture */}
          <div 
            className="absolute inset-2.5 rounded-xl pointer-events-none transition-opacity duration-350"
            style={{
              backgroundImage: `url("${svgDataUrl}")`,
              backgroundSize: '100% 100%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              opacity: isSolved ? 1 : 0, // full opacity when solved, hidden during play (individual slots draw silhouettes)
              zIndex: isSolved ? 20 : 0
            }}
          />

          {/* Full preview overlay (toggled by parent button) */}
          {showPreview && !isSolved && (
            <div 
              className="absolute inset-2.5 z-20 rounded-xl border-4 border-candy-blue bg-cover shadow-lg pointer-events-none transition-all duration-300"
              style={{
                backgroundImage: `url("${svgDataUrl}")`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}

          {/* Grid Slots */}
          {!isSyncing && Array.from({ length: size * size }).map((_, index) => {
            const pieceId = board[index];
            const isPieceLocked = pieceId != null && locked[index];
            const isPieceWrong = pieceId != null && pieceId !== index;

            return (
              <div
                key={index}
                data-puzzle-slot={index}
                onClick={() => handleSlotClick(index)}
                className={`
                  w-full aspect-square rounded-xl relative flex items-center justify-center transition-colors duration-150
                  ${pieceId == null ? 'cursor-pointer' : 'bg-transparent'}
                  ${drag?.overSlot === index ? 'bg-candy-yellow/40 ring-4 ring-candy-yellow z-10' : ''}
                `}
              >
                {/* Silhouette jigsaw piece guide in empty slot */}
                {pieceId == null && edgeProfiles[index] !== undefined && (
                  <JigsawPiece
                    pieceId={index}
                    size={size}
                    profile={edgeProfiles[index]}
                    svgDataUrl={svgDataUrl}
                    isLocked={false}
                    isSelected={false}
                    isSilhouette={true}
                    outlineOnly={outlineOnly}
                  />
                )}

                {/* Placed piece */}
                {pieceId != null && edgeProfiles[pieceId] !== undefined && (
                  <JigsawPiece
                    pieceId={pieceId}
                    size={size}
                    profile={edgeProfiles[pieceId]}
                    svgDataUrl={svgDataUrl}
                    isLocked={isPieceLocked}
                    isWrong={isPieceWrong}
                    isSelected={false} // Selection is only in the tray, placed pieces are not highlighted
                    onClick={() => handleSlotClick(index)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scrollable Tray of Pieces at the Bottom */}
      <div className="w-full flex flex-col items-center gap-3">
        {!isSolved && (
          <div className="w-full flex flex-col gap-1 items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {t.puzzleGame?.help || 'Select a piece and tap the board!'}
            </span>
            <div ref={trayRef} className="w-full max-w-[350px] bg-slate-100/90 border-2 border-slate-200/80 rounded-3xl p-3 flex gap-4 overflow-x-auto min-h-[92px] shadow-inner items-center justify-start scrollbar-thin">
              {isSyncing ? (
                <div className="w-full text-center text-xs font-extrabold text-slate-400 py-4">
                  🔄 Loading...
                </div>
              ) : tray.length === 0 ? (
                <div className="w-full text-center text-xs font-extrabold text-slate-400 py-4">
                  🎉 All pieces placed!
                </div>
              ) : (
                tray.map((pieceId, idx) => {
                  if (pieceId == null || edgeProfiles[pieceId] === undefined) return null;
                  const isSelected = selectedTrayIdx === idx;
                  const isDragged = drag?.trayIdx === idx;
                  return (
                    <div
                      key={pieceId}
                      data-testid="puzzle-tray-piece"
                      data-piece-id={pieceId}
                      // Touch is handled in the pointer handlers: sideways scrolls the tray, pulling up drags.
                      className={`w-16 h-16 flex-shrink-0 relative touch-none ${isDragged ? 'opacity-30' : ''}`}
                      onPointerDown={(e) => handleTrayPointerDown(idx, e)}
                      onPointerMove={handleTrayPointerMove}
                      onPointerUp={handleTrayPointerUp}
                      onPointerCancel={handleTrayPointerCancel}
                    >
                      <JigsawPiece
                        pieceId={pieceId}
                        size={size}
                        profile={edgeProfiles[pieceId]}
                        svgDataUrl={svgDataUrl}
                        isLocked={false}
                        isSelected={isSelected}
                        onClick={() => handleTrayPieceClick(idx)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 w-full max-w-[320px]">
          {!isSolved && (
            <button
              onClick={() => {
                playPop();
                setShowPreview(!showPreview);
              }}
              className={`
                flex-1 py-3 px-4 font-black rounded-2xl border-b-4 transition-all duration-75 outline-none cursor-pointer select-none text-sm
                ${showPreview
                  ? 'bg-candy-blue text-white border-sky-600 shadow-sm translate-y-[2px]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 active:translate-y-[1px]'
                }
              `}
            >
              {t.puzzleGame?.preview || 'Preview 🖼️'}
            </button>
          )}

          <button
            onClick={() => {
              playPop();
              initGame(size);
            }}
            className="flex-1 py-3 px-4 bg-candy-green hover:bg-emerald-400 active:translate-y-[1px] text-white border-emerald-600 border-b-4 font-black rounded-2xl transition-all duration-75 outline-none cursor-pointer select-none text-sm"
          >
            {isSolved ? (t.shiritori?.playAgain || 'Play Again') : (t.common?.reset || 'Reset')}
          </button>
        </div>

        {isSolved && (
          <div className="text-emerald-500 font-black text-sm pb-1 text-center h-5 animate-bounce">
            {t.puzzleGame?.victory || '🎉 Puzzle solved!'}
          </div>
        )}
      </div>

      {/* Piece following the finger while dragging */}
      {drag && edgeProfiles[tray[drag.trayIdx]] !== undefined && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{ left: drag.x, top: drag.y, width: drag.size, height: drag.size }}
        >
          <JigsawPiece
            pieceId={tray[drag.trayIdx]}
            size={size}
            profile={edgeProfiles[tray[drag.trayIdx]]}
            svgDataUrl={svgDataUrl}
            isLocked={false}
            isSelected={true}
          />
        </div>
      )}
    </div>
  );
}

export default PuzzleGame;
