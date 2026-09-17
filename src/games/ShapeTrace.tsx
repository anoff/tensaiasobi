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
import { SHAPES } from './shapeTraceData';

export function ShapeTrace() {
  const { playPop, playSuccess, playError, onStarEarned } = useGameFX();
  const { t } = useTranslation();
  const [shapeIndex, setShapeIndex] = useState(0);
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showErrorShake, setShowErrorShake] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isDrawingRef = useRef(false);
  const particlesRef = useRef<Particle[]>([]);

  const shape = SHAPES[shapeIndex];

  const getMarginSize = (canvasWidth: number): number =>
    marginMultiplier(canvasWidth, difficulty, { easy: 0.13, medium: 0.08, hard: 0.045 });

  const loadShape = (index: number) => {
    setShapeIndex(index);
    setDrawingPoints([]);
    setIsWon(false);
    setShowConfetti(false);
    setShowErrorShake(false);
    particlesRef.current = [];
  };

  const nextShape = () => {
    playPop();
    const nextIdx = (shapeIndex + 1) % SHAPES.length;
    loadShape(nextIdx);
  };

  useCanvasLoop(
    canvasRef,
    containerRef,
    (ctx, size) => {
      const marginSize = getMarginSize(size);

      ctx.clearRect(0, 0, size, size);
      const scalePoint = (p: Point) => getPixelCoord(p, size);

      // 1. Background Silhouette Emoji
      ctx.save();
      ctx.globalAlpha = isWon ? 1.0 : 0.06;
      ctx.font = `${size * 0.55}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!isWon) {
        ctx.fillStyle = '#000000';
      }
      ctx.fillText(shape.emoji, size / 2, size / 2);
      ctx.restore();

      if (!isWon) {
        // 2. Draw Slightly Shaded Corridor Margin
        ctx.save();
        ctx.strokeStyle = `${shape.color}26`;
        ctx.lineWidth = marginSize * 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        shape.points.forEach((p, idx) => {
          const pt = scalePoint(p);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();

        // 3. Target Outline Guide Line
        ctx.save();
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        shape.points.forEach((p, idx) => {
          const pt = scalePoint(p);
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // 4. Player crayon drawing points
      if (drawingPoints.length > 1) {
        ctx.save();
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = Math.max(5, size * 0.02);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = shape.color;
        ctx.beginPath();
        drawingPoints.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.restore();
      }

      // 5. Start marker point
      if (!isWon && shape.points.length > 0) {
        const startPt = scalePoint(shape.points[0]);
        const pulse = 10 + Math.sin(Date.now() / 150) * 3;

        ctx.save();
        ctx.fillStyle = '#4CAF50';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#4CAF50';
        ctx.beginPath();
        ctx.arc(startPt.x, startPt.y, pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏁', startPt.x, startPt.y);
      }

      // 6. Draw particles
      drawParticles(ctx, particlesRef.current);
    },
    [shapeIndex, drawingPoints, isWon, difficulty],
    420
  );

  const handlePointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isWon) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    isDrawingRef.current = true;
    playPop();
    setDrawingPoints([coords]);
    setShowErrorShake(false);
  };

  const handlePointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || isWon) return;

    const coords = getCanvasCoords(canvasRef.current, e);
    if (!coords) return;

    setDrawingPoints((prev) => [...prev, coords]);

    if (Math.random() < 0.25) {
      spawnParticles(particlesRef.current, coords.x, coords.y, shape.color, 8);
    }
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleCheckTrace = () => {
    const canvas = canvasRef.current;
    if (!canvas || drawingPoints.length < 5) {
      playError();
      setShowErrorShake(true);
      return;
    }

    const size = canvas.width;
    const marginSize = getMarginSize(size);
    const pixelPoints = shape.points.map((p) => getPixelCoord(p, size));


    let pointsInside = 0;
    drawingPoints.forEach((pt) => {
      const dist = getDistanceToPath(pt, pixelPoints);
      if (dist <= marginSize) {
        pointsInside += 1;
      }
    });

    const accuracyRate = pointsInside / drawingPoints.length;
    const isAccurate = accuracyRate >= 0.82;


    const targetSamples = getPathSamples(pixelPoints);
    let coveredSamples = 0;

    targetSamples.forEach((sample) => {
      const isCovered = drawingPoints.some((pt) => Math.hypot(pt.x - sample.x, pt.y - sample.y) <= marginSize * 1.35);
      if (isCovered) {
        coveredSamples += 1;
      }
    });

    const completionRate = coveredSamples / targetSamples.length;
    const isComplete = completionRate >= 0.80;

    if (isAccurate && isComplete) {
      setIsWon(true);
      setShowConfetti(true);
      playSuccess();
      const multiplier = starMultiplier(difficulty);
      onStarEarned?.(3 * multiplier);
    } else {
      playError();
      setShowErrorShake(true);
      setTimeout(() => setShowErrorShake(false), 500);
    }
  };

  const handleReset = () => {
    playPop();
    setDrawingPoints([]);
    setIsWon(false);
    setShowConfetti(false);
    setShowErrorShake(false);
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

      {/* Header Shape Palette Selector */}
      <div className="w-full flex justify-between bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0 gap-1.5 overflow-x-auto select-none">
        {SHAPES.map((sh, idx) => (
          <button
            key={sh.id}
            onClick={() => { playPop(); loadShape(idx); }}
            className={`
              w-11 h-11 flex items-center justify-center rounded-2xl text-2xl border-2 transition-all outline-none cursor-pointer shrink-0
              ${shapeIndex === idx
                ? 'border-slate-800 bg-slate-100 scale-110 shadow-sm'
                : 'border-slate-200 bg-white hover:bg-slate-50'
              }
            `}
          >
            {sh.emoji}
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
            data-testid="trace-canvas"
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
              <span className="text-6xl sm:text-7xl animate-bounce">{shape.emoji}</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-800 text-center leading-tight">
                {t.shapeTrace.victory}
              </h2>
              <KidButton
                color="pink"
                size="md"
                onClick={nextShape}
                className="shadow-[0_6px_0_0_#d81b60] active:translate-y-[4px] whitespace-nowrap"
              >
                🌈 {t.shapeTrace.nextShape}
              </KidButton>
            </div>
          )}
        </div>
      </div>

      {/* Control Actions: Check, Reset */}
      <div className="w-full flex justify-center gap-4 py-2 shrink-0 select-none">
        <KidButton
          variant="primary"
          color="green"
          size="md"
          data-testid="trace-check"
          onClick={handleCheckTrace}
          disabled={isWon || drawingPoints.length < 5}
          className={`px-6 py-3 min-h-12 border-b-6 shadow-md rounded-[1.5rem] transition-all flex items-center gap-2 ${isWon || drawingPoints.length < 5 ? 'opacity-40 pointer-events-none' : ''
            }`}
        >
          ✅ {t.common.check}
        </KidButton>

        <ConfirmWipeButton
          onConfirm={handleReset}
          size="md"
          data-testid="trace-reset"
          label={`🗑️ ${t.common.reset}`}
          confirmLabel={`🗑️ ${t.common.confirmReset}`}
          className="px-6 py-3 min-h-12 border-b-6 shadow-md rounded-[1.5rem] transition-all flex items-center gap-2"
        />
      </div>

      {/* Bottom Help bar */}
      <div className="w-full text-center py-1 shrink-0">
        <span className="bg-white/90 border-2 border-slate-200 rounded-full px-5 py-1.5 text-xs font-extrabold text-slate-500 shadow-sm inline-flex items-center gap-1.5">
          👉 {t.shapeTrace.help}
        </span>
      </div>
    </div>
  );
}

export default ShapeTrace;
