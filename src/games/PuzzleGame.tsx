import { useState, useEffect, useMemo } from 'react';
import Confetti from 'react-confetti';
import DifficultySelector from '../components/DifficultySelector';
import { GameDifficulty } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { PUZZLE_IMAGES, PuzzleImage } from '../data/puzzleImages';

// -----------------------------------------------------------------------------
// Types & Helper Functions
// -----------------------------------------------------------------------------

interface EdgeProfile {
  top: 'none' | 'tab' | 'blank';
  right: 'none' | 'tab' | 'blank';
  bottom: 'none' | 'tab' | 'blank';
  left: 'none' | 'tab' | 'blank';
}

/**
 * Deterministically generates matching jigsaw edge profiles for a grid of a given size.
 */
function generateEdgeProfiles(size: number): EdgeProfile[] {
  const profiles: EdgeProfile[] = Array.from({ length: size * size }, () => ({
    top: 'none',
    right: 'none',
    bottom: 'none',
    left: 'none',
  }));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const idx = r * size + c;

      // Top edge
      if (r === 0) {
        profiles[idx].top = 'none';
      } else {
        const topIdx = (r - 1) * size + c;
        profiles[idx].top = profiles[topIdx].bottom === 'tab' ? 'blank' : 'tab';
      }

      // Left edge
      if (c === 0) {
        profiles[idx].left = 'none';
      } else {
        const leftIdx = r * size + (c - 1);
        profiles[idx].left = profiles[leftIdx].right === 'tab' ? 'blank' : 'tab';
      }

      // Right edge
      if (c === size - 1) {
        profiles[idx].right = 'none';
      } else {
        profiles[idx].right = Math.random() < 0.5 ? 'tab' : 'blank';
      }

      // Bottom edge
      if (r === size - 1) {
        profiles[idx].bottom = 'none';
      } else {
        profiles[idx].bottom = Math.random() < 0.5 ? 'tab' : 'blank';
      }
    }
  }

  return profiles;
}

/**
 * Returns the SVG path string for a jigsaw piece given its edge profiles.
 * The core tile coordinates are from (0,0) to (100,100).
 */
function getJigsawPath(profile: EdgeProfile): string {
  let path = 'M 0,0';

  // Top edge (0,0 to 100,0)
  if (profile.top === 'none') {
    path += ' L 100,0';
  } else if (profile.top === 'tab') {
    path += ' L 40,0 C 35,-6 35,-18 50,-18 C 65,-18 65,-6 60,0 L 100,0';
  } else {
    path += ' L 40,0 C 35,6 35,18 50,18 C 65,18 65,6 60,0 L 100,0';
  }

  // Right edge (100,0 to 100,100)
  if (profile.right === 'none') {
    path += ' L 100,100';
  } else if (profile.right === 'tab') {
    path += ' L 100,40 C 106,35 118,35 118,50 C 118,65 106,65 100,60 L 100,100';
  } else {
    path += ' L 100,40 C 94,35 82,35 82,50 C 82,65 94,65 100,60 L 100,100';
  }

  // Bottom edge (100,100 to 0,100)
  if (profile.bottom === 'none') {
    path += ' L 0,100';
  } else if (profile.bottom === 'tab') {
    path += ' L 60,100 C 65,106 65,118 50,118 C 35,118 35,106 40,100 L 0,100';
  } else {
    path += ' L 60,100 C 65,94 65,82 50,82 C 35,82 35,94 40,100 L 0,100';
  }

  // Left edge (0,100 to 0,0)
  if (profile.left === 'none') {
    path += ' L 0,0';
  } else if (profile.left === 'tab') {
    path += ' L 0,60 C -6,65 -18,65 -18,50 C -18,35 -6,35 0,40 L 0,0';
  } else {
    path += ' L 0,60 C 6,65 18,65 18,50 C 18,35 6,35 0,40 L 0,0';
  }

  path += ' Z';
  return path;
}

interface GameInitData {
  initialBoard: (number | null)[];
  initialTray: number[];
  initialLocked: boolean[];
}

/**
 * Generates the initial scrambled state of the game, starting with an entirely empty board
 * and all pieces scrambled in the tray.
 */
function generateInitialState(size: number): GameInitData {
  const total = size * size;
  
  const initialBoard: (number | null)[] = Array.from({ length: total }, () => null);
  const initialLocked: boolean[] = Array.from({ length: total }, () => false);

  // All pieces are placed in the tray scrambled
  const initialTray = Array.from({ length: total }, (_, i) => i);
  
  // Shuffle the tray pieces
  for (let i = initialTray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [initialTray[i], initialTray[j]] = [initialTray[j], initialTray[i]];
  }

  return {
    initialBoard,
    initialTray,
    initialLocked,
  };
}

// -----------------------------------------------------------------------------
// JigsawPiece Component
// -----------------------------------------------------------------------------

interface JigsawPieceProps {
  pieceId: number;
  size: number;
  profile?: EdgeProfile;
  svgDataUrl: string;
  isLocked: boolean;
  isSelected: boolean;
  isSilhouette?: boolean;
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
        <g clipPath={`url(#${clipPathId})`}>
          <image
            href={svgDataUrl}
            x={-correctCol * 100}
            y={-correctRow * 100}
            width={size * 100}
            height={size * 100}
          />
        </g>

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

// -----------------------------------------------------------------------------
// PuzzleGame Main Component
// -----------------------------------------------------------------------------

interface PuzzleGameProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
  onStarEarned?: (amount: number) => void;
}

export function PuzzleGame({ playPop, playSuccess, playError, onStarEarned }: PuzzleGameProps) {
  const [level, setLevel] = useState<GameDifficulty>('easy');
  const [selectedImage, setSelectedImage] = useState<PuzzleImage>(PUZZLE_IMAGES[0]);

  // Board contains pieceId or null (empty cell)
  const [board, setBoard] = useState<(number | null)[]>([]);
  // Tray contains scrambled pieceIds
  const [tray, setTray] = useState<number[]>([]);
  // Locked status for correct placements
  const [locked, setLocked] = useState<boolean[]>([]);
  // Edge shapes config
  const [edgeProfiles, setEdgeProfiles] = useState<EdgeProfile[]>([]);

  const [selectedTrayIdx, setSelectedTrayIdx] = useState<number | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSolved, setIsSolved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  const { t } = useTranslation();

  // Grid size conversion
  const size = useMemo(() => {
    switch (level) {
      case 'easy': return 2;
      case 'medium': return 3;
      case 'hard': return 5;
      default: return 2;
    }
  }, [level]);

  // Check if state is in transition/out of sync
  const isSyncing = useMemo(() => {
    const total = size * size;
    return board.length !== total || edgeProfiles.length !== total || locked.length !== total;
  }, [board.length, edgeProfiles.length, locked.length, size]);

  // Game board setup
  const initGame = (currentSize: number) => {
    // Generate deterministic matching shapes
    const profiles = generateEdgeProfiles(currentSize);
    setEdgeProfiles(profiles);

    // Generate scrambled board with some locked anchor pieces
    const { initialBoard, initialTray, initialLocked } = generateInitialState(currentSize);

    setBoard(initialBoard);
    setTray(initialTray);
    setLocked(initialLocked);
    setSelectedTrayIdx(null);
    setIsSolved(false);
    setShowConfetti(false);
    setShowPreview(false);
  };

  // Run on image or size change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    initGame(size);
  }, [selectedImage, size]);

  const svgDataUrl = useMemo(() => {
    return `data:image/svg+xml;utf8,${encodeURIComponent(selectedImage.svgContent)}`;
  }, [selectedImage]);

  // Click on a tray piece
  const handleTrayPieceClick = (idx: number) => {
    if (isSolved || showPreview) {
      playError();
      return;
    }
    playPop();
    setSelectedTrayIdx(selectedTrayIdx === idx ? null : idx);
  };

  // Click on a board grid slot
  const handleSlotClick = (slotIdx: number) => {
    if (isSolved || showPreview) {
      playError();
      return;
    }

    // Locked pieces cannot be touched
    if (locked[slotIdx]) return;

    const currentOccupant = board[slotIdx];

    // Case 1: Place selected tray piece on the board
    if (selectedTrayIdx !== null) {
      const pieceId = tray[selectedTrayIdx];
      playPop();

      const newBoard = [...board];
      newBoard[slotIdx] = pieceId;

      const newTray = [...tray];
      if (currentOccupant !== null) {
        // Swap: Put the previous occupant back in the tray at the same index
        newTray[selectedTrayIdx] = currentOccupant;
      } else {
        // Remove from tray
        newTray.splice(selectedTrayIdx, 1);
      }

      setBoard(newBoard);
      setTray(newTray);
      setSelectedTrayIdx(null);

      // Check if snapped in the correct position
      if (pieceId === slotIdx) {
        // Snap!
        playSuccess();
        const newLocked = [...locked];
        newLocked[slotIdx] = true;
        setLocked(newLocked);

        // Check if fully solved
        const allLocked = newLocked.every((val) => val === true);
        if (allLocked) {
          setIsSolved(true);
          setShowConfetti(true);

          let starAward = 4;
          if (level === 'medium') starAward = 10;
          else if (level === 'hard') starAward = 28;

          onStarEarned?.(starAward);
        }
      }
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

  // Selector functions
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
      case 5: return 'grid-cols-5 max-w-[350px]';
      default: return 'grid-cols-2 max-w-[260px]';
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 w-full select-none max-w-lg mx-auto">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={120}
          recycle={false}
        />
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
                onClick={() => handleSlotClick(index)}
                className={`
                  w-full aspect-square rounded-xl relative flex items-center justify-center transition-colors duration-150
                  ${pieceId == null ? 'cursor-pointer' : 'bg-transparent'}
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
            <div className="w-full max-w-[350px] bg-slate-100/90 border-2 border-slate-200/80 rounded-3xl p-3 flex gap-4 overflow-x-auto min-h-[92px] shadow-inner items-center justify-start scrollbar-thin">
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
                  return (
                    <div key={pieceId} className="w-14 h-14 flex-shrink-0 relative">
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
    </div>
  );
}

export default PuzzleGame;
