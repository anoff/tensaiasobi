import { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import KidButton from '../components/KidButton';
import { useTranslation } from '../hooks/useTranslation';
import { getCanvasCoords } from '../utils/canvas';

type Difficulty = 'baby' | 'toddler' | 'kid';

interface Cell {
  col: number;
  row: number;
  visited: boolean;
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  hasStar: boolean;
  starCollected: boolean;
}

interface Theme {
  id: string;
  startEmoji: string;
  endEmoji: string;
  bgGradient: string;
  pathColor: string;
  tracedColor: string;
  wallColor: string;
  wallEmoji: string;
  starEmoji: string;
  titleEmoji: string;
}

const THEMES: Theme[] = [
  {
    id: 'puppy',
    startEmoji: '🐶',
    endEmoji: '🦴',
    bgGradient: 'from-emerald-50 via-green-100 to-teal-50',
    pathColor: '#E8F5E9',
    tracedColor: '#FFF59D', // Soft yellow highlight
    wallColor: '#2E7D32',
    wallEmoji: '🌳',
    starEmoji: '⭐',
    titleEmoji: '🐾',
  },
  {
    id: 'space',
    startEmoji: '🚀',
    endEmoji: '🪐',
    bgGradient: 'from-slate-900 via-indigo-950 to-slate-900',
    pathColor: '#1A237E',
    tracedColor: '#80DEEA', // Space neon blue
    wallColor: '#3F51B5',
    wallEmoji: '⭐',
    starEmoji: '✨',
    titleEmoji: '☄️',
  },
  {
    id: 'monkey',
    startEmoji: '🐒',
    endEmoji: '🍌',
    bgGradient: 'from-amber-50 via-lime-100 to-emerald-50',
    pathColor: '#FFF3E0',
    tracedColor: '#FFE082', // Sandy gold highlight
    wallColor: '#EF6C00',
    wallEmoji: '🌴',
    starEmoji: '💎',
    titleEmoji: '🍌',
  },
  {
    id: 'ocean',
    startEmoji: '🐠',
    endEmoji: '🐚',
    bgGradient: 'from-sky-100 via-cyan-100 to-blue-200',
    pathColor: '#E0F7FA',
    tracedColor: '#F8BBD0', // Soft coral pink
    wallColor: '#007799',
    wallEmoji: '🪸',
    starEmoji: '🌟',
    titleEmoji: '🐳',
  },
  {
    id: 'bee',
    startEmoji: '🐝',
    endEmoji: '🌸',
    bgGradient: 'from-yellow-50 via-amber-100 to-orange-50',
    pathColor: '#FFFDE7',
    tracedColor: '#FFE082', // Honey gold highlight
    wallColor: '#F57F17',
    wallEmoji: '🌻',
    starEmoji: '🍯',
    titleEmoji: '🍯',
  },
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
}

interface MazeGameProps {
  playPop: () => void;
  playSuccess: () => void;
  playError: () => void;
  onStarEarned?: (amount: number) => void;
}

export function MazeGame({ playPop, playSuccess, playError, onStarEarned }: MazeGameProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<Difficulty>('toddler');
  const [themeIndex, setThemeIndex] = useState(0);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [mappedPath, setMappedPath] = useState<{ col: number; row: number }[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  
  // Animation states
  const [isAnimating, setIsAnimating] = useState(false);
  const [animatingIndex, setAnimatingIndex] = useState(0);
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  const theme = THEMES[themeIndex];
  
  const getGridSize = (diff: Difficulty): { cols: number; rows: number } => {
    switch (diff) {
      case 'baby':
        return { cols: 4, rows: 4 };
      case 'toddler':
        return { cols: 6, rows: 6 };
      case 'kid':
        return { cols: 8, rows: 8 };
    }
  };

  const { cols, rows } = getGridSize(difficulty);

  // Generate Maze using DFS Spanning Tree
  const generateMaze = () => {
    const tempGrid: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
      const rowCells: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        rowCells.push({
          col: c,
          row: r,
          visited: false,
          walls: { top: true, right: true, bottom: true, left: true },
          hasStar: !(r === 0 && c === 0) && !(r === rows - 1 && c === cols - 1) && Math.random() < 0.4, // Random stars in path
          starCollected: false,
        });
      }
      tempGrid.push(rowCells);
    }

    const stack: Cell[] = [];
    const startCell = tempGrid[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: Cell[] = [];
      const { col: c, row: r } = current;

      if (r > 0 && !tempGrid[r - 1][c].visited) neighbors.push(tempGrid[r - 1][c]);
      if (c < cols - 1 && !tempGrid[r][c + 1].visited) neighbors.push(tempGrid[r][c + 1]);
      if (r < rows - 1 && !tempGrid[r + 1][c].visited) neighbors.push(tempGrid[r + 1][c]);
      if (c > 0 && !tempGrid[r][c - 1].visited) neighbors.push(tempGrid[r][c - 1]);

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        next.visited = true;

        if (next.row < current.row) {
          current.walls.top = false;
          next.walls.bottom = false;
        } else if (next.col > current.col) {
          current.walls.right = false;
          next.walls.left = false;
        } else if (next.row > current.row) {
          current.walls.bottom = false;
          next.walls.top = false;
        } else if (next.col < current.col) {
          current.walls.left = false;
          next.walls.right = false;
        }

        stack.push(next);
      } else {
        stack.pop();
      }
    }

    setGrid(tempGrid);
    setDrawingPoints([]);
    setMappedPath([{ col: 0, row: 0 }]);
    setIsWon(false);
    setShowConfetti(false);
    setIsAnimating(false);
    setAnimatingIndex(0);
    particlesRef.current = [];
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    generateMaze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty, themeIndex]);

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 6,
        color,
        alpha: 1,
        decay: 0.02 + Math.random() * 0.02,
      });
    }
  };

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || grid.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height, 450);
      canvas.width = size;
      canvas.height = size;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const drawLoop = () => {
      if (!canvas || !ctx) return;

      const size = canvas.width;
      const cellSize = size / cols;
      const wallWidth = Math.max(4, cellSize * 0.08);

      ctx.clearRect(0, 0, size, size);

      // 1. Draw Grid Roads
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ctx.fillStyle = theme.pathColor;
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }



      // 3. Draw Raw Overlay Crayon Drawing Line
      if (drawingPoints.length > 1) {
        ctx.strokeStyle = '#E91E63'; // Bright crayon pink
        ctx.lineWidth = Math.max(5, cellSize * 0.15);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        drawingPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      }

      // 4. Draw Maze Walls
      ctx.strokeStyle = theme.wallColor;
      ctx.lineWidth = wallWidth;
      ctx.lineCap = 'round';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          const x = c * cellSize;
          const y = r * cellSize;

          ctx.beginPath();
          if (cell.walls.top) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellSize, y);
          }
          if (cell.walls.right) {
            ctx.moveTo(x + cellSize, y);
            ctx.lineTo(x + cellSize, y + cellSize);
          }
          if (cell.walls.bottom) {
            ctx.moveTo(x, y + cellSize);
            ctx.lineTo(x + cellSize, y + cellSize);
          }
          if (cell.walls.left) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + cellSize);
          }
          ctx.stroke();
        }
      }

      // 5. Draw Star Items
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c];
          if (cell.hasStar && !cell.starCollected) {
            const cx = c * cellSize + cellSize / 2;
            const cy = r * cellSize + cellSize / 2;
            ctx.font = `${cellSize * 0.45}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(theme.starEmoji, cx, cy);
          }
        }
      }

      // 6. Draw Destination Target
      ctx.font = `${cellSize * 0.6}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const endX = (cols - 1) * cellSize + cellSize / 2;
      const endY = (rows - 1) * cellSize + cellSize / 2;
      ctx.fillText(theme.endEmoji, endX, endY);

      // 7. Draw Avatar Marker (moves along mappedPath during animation, stays at start otherwise)
      const currentCell = isAnimating && mappedPath.length > 0 
        ? mappedPath[animatingIndex] || { col: 0, row: 0 } 
        : { col: 0, row: 0 };

      const playerX = currentCell.col * cellSize + cellSize / 2;
      const playerY = currentCell.row * cellSize + cellSize / 2;

      ctx.fillText(theme.startEmoji, playerX, playerY);

      // 8. Update and Draw Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
        } else {
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animationFrameRef.current = requestAnimationFrame(drawLoop);
    };

    drawLoop();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grid, drawingPoints, mappedPath, isAnimating, animatingIndex, themeIndex]);

  const getCellFromCoords = (x: number, y: number): { col: number; row: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const cellSize = canvas.width / cols;
    const col = Math.floor(x / cellSize);
    const row = Math.floor(y / cellSize);
    if (col >= 0 && col < cols && row >= 0 && row < rows) {
      return { col, row };
    }
    return null;
  };

  // Drawing event handlers
  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isWon || isAnimating) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    const touchedCell = getCellFromCoords(coords.x, coords.y);
    if (!touchedCell) return;

    // Drawing must start near the start position (0, 0)
    const isNearStart = touchedCell.col === 0 && touchedCell.row === 0;
    if (isNearStart) {
      isDrawingRef.current = true;
      playPop();
      setDrawingPoints([coords]);
      setMappedPath([{ col: 0, row: 0 }]);
      
      // Reset collected stars
      const resetGrid = grid.map(row => row.map(cell => ({ ...cell, starCollected: false })));
      setGrid(resetGrid);
    }
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isWon || isAnimating) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    setDrawingPoints((prev) => [...prev, coords]);

    const touchedCell = getCellFromCoords(coords.x, coords.y);
    if (!touchedCell) return;

    // Check mapping logic
    const lastCell = mappedPath[mappedPath.length - 1];
    if (touchedCell.col === lastCell.col && touchedCell.row === lastCell.row) {
      return;
    }

    // Check adjacency
    const colDiff = touchedCell.col - lastCell.col;
    const rowDiff = touchedCell.row - lastCell.row;
    const isAdjacent = Math.abs(colDiff) + Math.abs(rowDiff) === 1;

    if (!isAdjacent) return;

    // Check wall collision between lastCell and touchedCell
    let wallBlocked = false;
    const lastCellGridInfo = grid[lastCell.row][lastCell.col];
    
    if (colDiff === 1) wallBlocked = lastCellGridInfo.walls.right;
    else if (colDiff === -1) wallBlocked = lastCellGridInfo.walls.left;
    else if (rowDiff === 1) wallBlocked = lastCellGridInfo.walls.bottom;
    else if (rowDiff === -1) wallBlocked = lastCellGridInfo.walls.top;

    if (wallBlocked) {
      return; // Do not map past wall, but let the drawing overlay draw the line to show they went off-track
    }

    // Check backtracking
    if (mappedPath.length > 1) {
      const secondToLast = mappedPath[mappedPath.length - 2];
      if (touchedCell.col === secondToLast.col && touchedCell.row === secondToLast.row) {
        playPop();
        setMappedPath((prev) => prev.slice(0, -1));
        return;
      }
    }

    // Verify cell is not already in path to avoid self-crossing loops in logical path
    const exists = mappedPath.some((cell) => cell.col === touchedCell.col && cell.row === touchedCell.row);
    if (exists) return;

    // Successfully mapped step!
    playPop();
    setMappedPath((prev) => [...prev, touchedCell]);
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  // Play Path Execution Animation
  const handlePlayPath = () => {
    if (isAnimating || isWon || mappedPath.length <= 1) return;

    setIsAnimating(true);
    setAnimatingIndex(0);

    // Play loop
    let idx = 0;
    const interval = setInterval(() => {
      idx += 1;
      if (idx >= mappedPath.length) {
        clearInterval(interval);
        
        // Check if destination reached
        const finalCell = mappedPath[mappedPath.length - 1];
        const reachedGoal = finalCell.col === cols - 1 && finalCell.row === rows - 1;

        if (reachedGoal) {
          setIsWon(true);
          setShowConfetti(true);
          playSuccess();
          const multiplier = difficulty === 'baby' ? 1 : difficulty === 'toddler' ? 3 : 5;
          onStarEarned?.(3 * multiplier);
          setIsAnimating(false);
        } else {
          // Play slide back animation
          handleReturnToStart();
        }
      } else {
        playPop();
        setAnimatingIndex(idx);

        // Check star collection
        const cell = mappedPath[idx];
        const cellData = grid[cell.row][cell.col];
        if (cellData.hasStar && !cellData.starCollected) {
          cellData.starCollected = true;
          const canvas = canvasRef.current;
          if (canvas) {
            const cellSize = canvas.width / cols;
            const starX = cell.col * cellSize + cellSize / 2;
            const starY = cell.row * cellSize + cellSize / 2;
            spawnParticles(starX, starY, '#FFD54F');
          }
        }
      }
    }, 300);
  };

  const handleReturnToStart = () => {
    let idx = mappedPath.length - 1;
    
    const interval = setInterval(() => {
      idx -= 1;
      if (idx <= 0) {
        clearInterval(interval);
        setAnimatingIndex(0);
        setIsAnimating(false);
        playError();
      } else {
        setAnimatingIndex(idx);
      }
    }, 100); // Walk backwards faster!
  };

  // Control button actions
  const handleClear = () => {
    playPop();
    setDrawingPoints([]);
    setMappedPath([{ col: 0, row: 0 }]);
    setIsAnimating(false);
    setAnimatingIndex(0);
    setIsWon(false);
    setShowConfetti(false);
    
    // Reset star status
    const resetGrid = grid.map(row => row.map(cell => ({ ...cell, starCollected: false })));
    setGrid(resetGrid);
  };

  const changeTheme = () => {
    playPop();
    setThemeIndex((prev) => (prev + 1) % THEMES.length);
  };

  const changeDifficulty = (diff: Difficulty) => {
    playPop();
    setDifficulty(diff);
  };

  const playBtnDisabled = isAnimating || isWon || mappedPath.length <= 1;

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={150}
          recycle={false}
        />
      )}

      {/* Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0 animate-fade-in">
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
          {(['baby', 'toddler', 'kid'] as Difficulty[]).map((diff) => (
            <button
              key={diff}
              disabled={isAnimating}
              onClick={() => changeDifficulty(diff)}
              className={`
                px-3 py-1.5 text-xs font-black rounded-xl capitalize transition-all duration-75 outline-none cursor-pointer
                ${
                  difficulty === diff
                    ? 'bg-candy-purple text-white shadow-sm border border-purple-400 scale-105'
                    : 'text-slate-500 hover:text-slate-700 disabled:opacity-50'
                }
              `}
            >
              {diff === 'baby' ? t.mazeGame.baby : diff === 'toddler' ? t.mazeGame.toddler : t.mazeGame.kid}
            </button>
          ))}
        </div>

        <button
          onClick={changeTheme}
          disabled={isAnimating}
          className="flex items-center gap-1.5 bg-candy-blue border-b-4 border-sky-600 active:border-b-0 active:translate-y-[4px] text-white font-extrabold text-xs px-4 py-2.5 rounded-2xl cursor-pointer shadow-sm select-none outline-none hover:scale-105 disabled:opacity-50"
        >
          🎨 {theme.startEmoji} → {theme.endEmoji}
        </button>
      </div>

      {/* Play Ground */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 w-full h-full min-h-[300px]">
        <div
          ref={containerRef}
          className={`relative border-8 border-slate-300 rounded-[2.5rem] overflow-hidden shadow-inner bg-gradient-to-b ${theme.bgGradient} flex items-center justify-center w-full aspect-square max-w-[420px]`}
        >
          <canvas
            ref={canvasRef}
            data-testid="maze-canvas"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="w-full h-full cursor-pointer touch-none"
          />

          {/* Victory Overlay Screen */}
          {isWon && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 space-y-6 z-20">
              <span className="text-8xl animate-bounce">{theme.startEmoji}🏆{theme.endEmoji}</span>
              <h2 className="text-3xl font-black text-slate-800 text-center leading-tight">
                {t.mazeGame.victory}
              </h2>
              <KidButton
                color="green"
                size="md"
                onClick={generateMaze}
                className="shadow-[0_6px_0_0_#059669] active:translate-y-[4px]"
              >
                🎉 {t.mazeGame.title} {t.mazeGame.playAgain}!
              </KidButton>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons: Play, Reset */}
      <div className="w-full flex justify-center gap-6 py-2 shrink-0 select-none">
        <KidButton
          color="green"
          size="md"
          data-testid="maze-play"
          onClick={handlePlayPath}
          disabled={playBtnDisabled}
          className={`px-8 py-3 min-h-12 border-b-6 shadow-md rounded-[1.5rem] transition-all flex items-center gap-2 ${
            playBtnDisabled ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          ▶️ {t.mazeGame.play}
        </KidButton>

        <KidButton
          color="red"
          size="md"
          data-testid="maze-reset"
          onClick={handleClear}
          disabled={isAnimating}
          className={`px-8 py-3 min-h-12 border-b-6 shadow-md rounded-[1.5rem] transition-all flex items-center gap-2 ${
            isAnimating ? 'opacity-40 pointer-events-none' : ''
          }`}
        >
          🗑️ {t.mazeGame.reset}
        </KidButton>
      </div>

      {/* Instruction text */}
      <div className="w-full text-center py-1 shrink-0">
        <span className="bg-white/90 border-2 border-slate-200 rounded-full px-5 py-1.5 text-xs font-extrabold text-slate-500 shadow-sm inline-flex items-center gap-1.5">
          👉 {t.mazeGame.help}
        </span>
      </div>
    </div>
  );
}

export default MazeGame;
