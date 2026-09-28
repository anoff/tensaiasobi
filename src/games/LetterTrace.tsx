import React, { useState, useRef } from 'react';
import GameConfetti from '../components/GameConfetti';
import KidButton from '../components/KidButton';
import ConfirmWipeButton from '../components/ConfirmWipeButton';
import DifficultySelector from '../components/DifficultySelector';
import type { GameDifficulty } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import { getCanvasCoords } from '../utils/canvas';
import { starMultiplier } from '../utils/difficulty';
import { useCanvasLoop } from '../hooks/useCanvasLoop';
import { spawnParticles, drawParticles, type Particle } from '../utils/particles';
import {
  getPixelCoord,
  getDistanceToPath,
  getPathSamples,
  getMarginSize as marginMultiplier,
  type Point,
} from '../utils/traceGeometry';
import { useGameFX } from '../hooks/gameFXContext';
import {
  LEVEL_DATA,
  LEVELS_BY_LANGUAGE,
  START_TOLERANCE_MULTIPLIER,
  COVERAGE_TOLERANCE_MULTIPLIER,
  ACCURACY_THRESHOLD,
  COMPLETION_THRESHOLD,
  type LetterLevel,
} from './letterTraceData';

export function LetterTrace() {
  const { playPop, playSuccess, playError, onStarEarned } = useGameFX();
  const { t, language } = useTranslation();
  const levels = LEVELS_BY_LANGUAGE[language];
  const [level, setLevel] = useState<LetterLevel>(levels[0]);
  const [letterIndex, setLetterIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [completedStrokes, setCompletedStrokes] = useState<Point[][]>([]);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showErrorShake, setShowErrorShake] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);

  const letters = LEVEL_DATA[level];
  const letter = letters[letterIndex];
  const activeStrokeIndex = completedStrokes.length;

  // Letter tracing is intentionally stricter than shape tracing: tighter corridors at every difficulty.
  const getMarginSize = (canvasWidth: number): number =>
    marginMultiplier(canvasWidth, difficulty, { easy: 0.1, medium: 0.06, hard: 0.035 });

  const resetProgress = () => {
    setCompletedStrokes([]);
    setCurrentPoints([]);
    setIsWon(false);
    setShowConfetti(false);
    setShowErrorShake(false);
    particlesRef.current = [];
  };

  const loadLetter = (idx: number) => {
    setLetterIndex(idx);
    resetProgress();
  };

  const changeLevel = (lvl: LetterLevel) => {
    playPop();
    setLevel(lvl);
    setLetterIndex(0);
    resetProgress();
  };

  const nextLetter = () => {
    playPop();
    const nextIdx = (letterIndex + 1) % letters.length;
    loadLetter(nextIdx);
  };

  useCanvasLoop(
    canvasRef,
    containerRef,
    (ctx, size) => {
      const marginSize = getMarginSize(size);

      const drawStrokePath = (points: Point[], strokeSize: number) => {
        ctx.beginPath();
        points.forEach((p, idx) => {
          const pt = getPixelCoord(p, strokeSize);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      };

      const drawStrokeMarker = (points: Point[], strokeSize: number, label: string, opts: { pulse: boolean; alpha: number; fill: string }) => {
        if (points.length === 0) return;
        const start = getPixelCoord(points[0], strokeSize);
        const radius = opts.pulse ? 11 + Math.sin(Date.now() / 150) * 3 : 9;

        ctx.save();
        ctx.globalAlpha = opts.alpha;
        ctx.fillStyle = opts.fill;
        if (opts.pulse) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = opts.fill;
        }
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, start.x, start.y);
        ctx.restore();
      };

      ctx.clearRect(0, 0, size, size);

      // 1. Background Silhouette Character
      ctx.save();
      ctx.globalAlpha = isWon ? 1.0 : 0.08;
      ctx.font = `${size * 0.55}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!isWon) {
        ctx.fillStyle = '#000000';
      }
      ctx.fillText(letter.char, size / 2, size / 2);
      ctx.restore();

      if (!isWon) {
        letter.strokes.forEach((strokeDef, idx) => {
          const isDone = idx < activeStrokeIndex;
          const isActive = idx === activeStrokeIndex;

          if (!isDone) {
            // Shaded corridor margin + dashed guide line for strokes not yet drawn.
            ctx.save();
            ctx.globalAlpha = isActive ? 1 : 0.35;
            ctx.strokeStyle = `${letter.color}26`;
            ctx.lineWidth = marginSize * 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            drawStrokePath(strokeDef.points, size);
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = isActive ? 1 : 0.35;
            ctx.strokeStyle = '#94A3B8';
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 6]);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            drawStrokePath(strokeDef.points, size);
            ctx.restore();
          } else {
            // Already-completed strokes: render the child's actual ink permanently.
            const drawnPoints = completedStrokes[idx];
            if (drawnPoints && drawnPoints.length > 1) {
              ctx.save();
              ctx.strokeStyle = letter.color;
              ctx.lineWidth = Math.max(5, size * 0.02);
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.beginPath();
              drawnPoints.forEach((pt, i) => {
                if (i === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              });
              ctx.stroke();
              ctx.restore();
            }
          }

          // Numbered sequence marker at the start of every stroke.
          drawStrokeMarker(strokeDef.points, size, String(idx + 1), {
            pulse: isActive,
            alpha: isDone ? 0.55 : isActive ? 1 : 0.55,
            fill: isDone ? '#94A3B8' : isActive ? '#4CAF50' : '#CBD5E1',
          });
        });
      }

      // Player crayon drawing points for the stroke currently in progress.
      if (currentPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = letter.color;
        ctx.lineWidth = Math.max(5, size * 0.02);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = letter.color;
        ctx.beginPath();
        currentPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }


      drawParticles(ctx, particlesRef.current);
    },
    [letter, activeStrokeIndex, completedStrokes, currentPoints, isWon, difficulty],
    420
  );

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isWon) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    isDrawingRef.current = true;
    playPop();
    setCurrentPoints([coords]);
    setShowErrorShake(false);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isWon) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    setCurrentPoints((prev) => [...prev, coords]);

    if (Math.random() < 0.25) {
      spawnParticles(particlesRef.current, coords.x, coords.y, letter.color, 8);
    }
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current || isWon) {
      isDrawingRef.current = false;
      return;
    }
    isDrawingRef.current = false;

    const canvas = canvasRef.current;
    const strokeDef = letter.strokes[activeStrokeIndex];
    if (!canvas || !strokeDef || currentPoints.length < 3) {
      playError();
      setShowErrorShake(true);
      setCurrentPoints([]);
      setTimeout(() => setShowErrorShake(false), 500);
      return;
    }

    const size = canvas.width;
    const marginSize = getMarginSize(size);
    const pixelPoints = strokeDef.points.map((p) => getPixelCoord(p, size));

    // Sequence check: the stroke must begin close to its numbered starting point.
    const startDistance = Math.hypot(
      currentPoints[0].x - pixelPoints[0].x,
      currentPoints[0].y - pixelPoints[0].y
    );
    const startsCorrectly = startDistance <= marginSize * START_TOLERANCE_MULTIPLIER;

    // Accuracy check: drawn points must stay within the corridor.
    let pointsInside = 0;
    currentPoints.forEach((pt) => {
      const dist = getDistanceToPath(pt, pixelPoints);
      if (dist <= marginSize) {
        pointsInside += 1;
      }
    });
    const accuracyRate = pointsInside / currentPoints.length;
    const isAccurate = accuracyRate >= ACCURACY_THRESHOLD;

    // Completeness check: the whole target stroke must be covered.
    const targetSamples = getPathSamples(pixelPoints);
    let coveredSamples = 0;
    targetSamples.forEach((sample) => {
      const isCovered = currentPoints.some((pt) => Math.hypot(pt.x - sample.x, pt.y - sample.y) <= marginSize * COVERAGE_TOLERANCE_MULTIPLIER);
      if (isCovered) coveredSamples += 1;
    });
    const completionRate = coveredSamples / Math.max(1, targetSamples.length);
    const isComplete = completionRate >= COMPLETION_THRESHOLD;

    if (startsCorrectly && isAccurate && isComplete) {
      playPop();
      const finishedStroke = currentPoints;
      setCompletedStrokes((prev) => {
        const next = [...prev, finishedStroke];
        if (next.length >= letter.strokes.length) {
          setIsWon(true);
          setShowConfetti(true);
          playSuccess();
          const multiplier = starMultiplier(difficulty);
          onStarEarned?.(3 * multiplier);
        }
        return next;
      });
      setCurrentPoints([]);
    } else {
      playError();
      setShowErrorShake(true);
      setCurrentPoints([]);
      setTimeout(() => setShowErrorShake(false), 500);
    }
  };

  const handleReset = () => {
    playPop();
    resetProgress();
  };

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full animate-fade-in">
      {showConfetti && (
        <GameConfetti pieces={150} />
      )}

      {/* Level Selector: only the scripts relevant to the current language are shown */}
      {levels.length > 1 && (
      <div className="w-full flex justify-between bg-slate-200/80 p-1.5 rounded-2xl border-2 border-slate-300 gap-1.5 select-none shrink-0">
        {levels.map((lvl) => (
          <button
            key={lvl}
            data-testid={`letter-trace-level-${lvl}`}
            onClick={() => changeLevel(lvl)}
            className={`
              flex-1 py-2 text-xs sm:text-sm font-black rounded-xl border-b-4 transition-all duration-75 outline-none cursor-pointer select-none
              ${level === lvl
                ? 'bg-candy-purple text-white border-purple-700 shadow-sm translate-y-[2px]'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 active:translate-y-[1px]'
              }
            `}
          >
            {t.letterTrace.levels[lvl]}
          </button>
        ))}
      </div>
      )}

      {/* Letter Palette Selector */}
      <div className="w-full flex justify-between bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0 gap-1.5 overflow-x-auto select-none mt-2">
        {letters.map((l, idx) => (
          <button
            key={l.id}
            data-testid="letter-trace-letter-option"
            onClick={() => { playPop(); loadLetter(idx); }}
            className={`
              w-11 h-11 flex items-center justify-center rounded-2xl text-2xl border-2 transition-all outline-none cursor-pointer shrink-0
              ${letterIndex === idx
                ? 'border-slate-800 bg-slate-100 scale-110 shadow-sm'
                : 'border-slate-200 bg-white hover:bg-slate-50'
              }
            `}
          >
            {l.char}
          </button>
        ))}
      </div>

      {/* Difficulty Sub-menu Selector */}
      <DifficultySelector
        selected={difficulty}
        options={['easy', 'medium', 'hard']}
        onChange={changeDifficulty}
        className="mt-2 shrink-0"
      />

      {/* Tracing Playground Area */}
      <div className="flex-1 flex flex-col items-center justify-center my-4 w-full h-full min-h-[280px]">
        <div
          ref={containerRef}
          className={`relative border-8 border-slate-300 rounded-[2.5rem] overflow-hidden shadow-inner bg-white flex items-center justify-center w-full aspect-square max-w-[420px] ${showErrorShake ? 'animate-shake' : ''
            }`}
        >
          <canvas
            ref={canvasRef}
            data-testid="letter-trace-canvas"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            className="w-full h-full cursor-crosshair touch-none"
          />

          {/* Victory Overlay Screen */}
          {isWon && (
            <div className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center p-4 space-y-4 z-20 overflow-y-auto">
              <span className="text-6xl sm:text-7xl animate-bounce">{letter.char}</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 text-center leading-tight">
                {t.letterTrace.victory}
              </h2>
              <KidButton
                color="pink"
                size="md"
                data-testid="letter-trace-next"
                onClick={nextLetter}
                className="whitespace-nowrap"
              >
                🌈 {t.letterTrace.nextLetter}
              </KidButton>
            </div>
          )}
        </div>
      </div>

      {/* Control Actions: Reset */}
      <div className="w-full flex justify-center gap-4 py-2 shrink-0 select-none">
        <ConfirmWipeButton
          onConfirm={handleReset}
          size="md"
          data-testid="letter-trace-reset"
          label={`🗑️ ${t.common.reset}`}
          confirmLabel={`🗑️ ${t.common.confirmReset}`}
          className="px-6 py-3 min-h-12 rounded-[1.5rem] transition-all flex items-center gap-2"
        />
      </div>

      {/* Bottom Help bar */}
      <div className="w-full text-center py-1 shrink-0">
        <span className="bg-white/90 border-2 border-slate-200 rounded-full px-5 py-1.5 text-xs font-extrabold text-slate-500 shadow-sm inline-flex items-center gap-1.5">
          👉 {t.letterTrace.help}
        </span>
      </div>
    </div>
  );
}

export default LetterTrace;
