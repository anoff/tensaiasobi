import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import type { GameDifficulty, GameProps } from '../types/game';
import { useTranslation } from '../hooks/useTranslation';
import {
  generateWaves,
  generateRocks,
  getWaveHeightAt,
  getActiveWave,
  isAligned,
  getDifficultyConfig,
  type Wave,
  type Rock,
} from '../utils/waves';

const CANVAS_HEIGHT = 360;
const BOARD_X = 96; // static horizontal player position
const BOARD_SIZE = 72;
const BEACH_X = 900; // world x where beach begins

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

type BodyboardWaveRiderProps = GameProps;

export function BodyboardWaveRider({ playPop, playSuccess, playError, onStarEarned }: BodyboardWaveRiderProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [waves, setWaves] = useState<Wave[]>(() => generateWaves('easy'));
  const [rocks, setRocks] = useState<Rock[]>(() => generateRocks('easy'));
  const [status, setStatus] = useState<'waiting' | 'riding' | 'won' | 'missed'>('waiting');
  const [distance, setDistance] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ridingWaveId, setRidingWaveId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const riderYRef = useRef(0.5);
  const distanceRef = useRef(0);
  const statusRef = useRef<'waiting' | 'riding' | 'won' | 'missed'>('waiting');

  const config = getDifficultyConfig(difficulty);

  const startRound = useCallback((diff: GameDifficulty) => {
    setWaves(generateWaves(diff, 24, Math.random() * 200));
    setRocks(generateRocks(diff));
    setStatus('waiting');
    statusRef.current = 'waiting';
    setDistance(0);
    distanceRef.current = 0;
    riderYRef.current = 0.5;
    setElapsed(0);
    setRidingWaveId(null);
    setShowConfetti(false);
    setMessage('');
    lastTimeRef.current = null;
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    startRound(difficulty);
  }, [difficulty, startRound]);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => {
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cssWidth = width;
      const cssHeight = height;
      const baselineY = cssHeight * 0.65;

      // Sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, baselineY);
      sky.addColorStop(0, '#bae6fd');
      sky.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, cssWidth, cssHeight);

      // Sun
      ctx.beginPath();
      ctx.arc(cssWidth - 48, 48, 28, 0, Math.PI * 2);
      ctx.fillStyle = '#fde047';
      ctx.fill();

      // Beach on the right
      const beachScreenX = cssWidth * 0.82;
      const sandGradient = ctx.createLinearGradient(beachScreenX, baselineY, cssWidth, cssHeight);
      sandGradient.addColorStop(0, '#fde68a');
      sandGradient.addColorStop(1, '#fbbf24');
      ctx.fillStyle = sandGradient;
      ctx.beginPath();
      ctx.moveTo(beachScreenX, baselineY + 20);
      ctx.quadraticCurveTo(cssWidth, baselineY - 20, cssWidth, cssHeight);
      ctx.lineTo(cssWidth, cssHeight);
      ctx.lineTo(beachScreenX, cssHeight);
      ctx.closePath();
      ctx.fill();

      // Active wave
      const activeWave = getActiveWave(waves, BOARD_X, time);
      const aligned = activeWave ? isAligned(activeWave, time, BOARD_X, config.alignmentWindow) : false;

      // Draw waves
      const points = 120;
      for (let w = waves.length - 1; w >= 0; w--) {
        const wave = waves[w];
        const isActive = activeWave?.id === wave.id;
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const wx = (i / points) * cssWidth;
          const wy = getWaveHeightAt(wx, wave, time, baselineY);
          if (i === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.lineTo(cssWidth, cssHeight);
        ctx.lineTo(0, cssHeight);
        ctx.closePath();

        const isLarge = wave.amplitude >= 0.85;
        const fillBase = isLarge ? (isActive ? '#4338ca' : '#3730a3') : '#67e8f9';
        const fillTop = isLarge ? '#6366f1' : '#a5f3fc';
        const grad = ctx.createLinearGradient(0, baselineY - 90, 0, cssHeight);
        grad.addColorStop(0, fillTop);
        grad.addColorStop(1, fillBase);
        ctx.fillStyle = grad;
        ctx.fill();

        // Foam crest for large waves
        if (isLarge) {
          ctx.beginPath();
          for (let i = 0; i <= points; i++) {
            const wx = (i / points) * cssWidth;
            const wy = getWaveHeightAt(wx, wave, time, baselineY);
            if (i === 0) ctx.moveTo(wx, wy);
            else ctx.lineTo(wx, wy);
          }
          ctx.strokeStyle = 'rgba(255,255,255,0.65)';
          ctx.lineWidth = 4;
          ctx.stroke();
        }
      }

      // Alignment glow behind board while waiting
      if (statusRef.current === 'waiting' && aligned && activeWave) {
        const crestY = getWaveHeightAt(BOARD_X, activeWave, time, baselineY);
        const glow = ctx.createRadialGradient(BOARD_X, crestY, 4, BOARD_X, crestY, 60);
        glow.addColorStop(0, 'rgba(74,222,128,0.7)');
        glow.addColorStop(1, 'rgba(74,222,128,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(BOARD_X, crestY, 60, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw rider / board
      let boardY = baselineY;
      if (statusRef.current === 'riding' && ridingWaveId !== null) {
        const wave = waves.find((w) => w.id === ridingWaveId);
        if (wave) {
          const faceTop = getWaveHeightAt(BOARD_X, wave, time, baselineY);
          const faceBottom = baselineY + 90 * wave.amplitude;
          boardY = faceTop + (faceBottom - faceTop) * riderYRef.current;
        }
      } else {
        const active = getActiveWave(waves, BOARD_X, time);
        if (active) {
          boardY = getWaveHeightAt(BOARD_X, active, time, baselineY) + BOARD_SIZE / 2;
        }
      }

      // Board shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.ellipse(BOARD_X + 4, boardY + BOARD_SIZE / 2 + 4, BOARD_SIZE / 2, BOARD_SIZE / 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bodyboard
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.ellipse(BOARD_X, boardY, BOARD_SIZE / 2, BOARD_SIZE / 4, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c2410c';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mascot
      ctx.font = '34px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🦦', BOARD_X, boardY - 14);

      // Disappointed face when missed
      if (statusRef.current === 'missed') {
        ctx.font = '22px sans-serif';
        ctx.fillText('😢', BOARD_X + 18, boardY - 36);
      }

      // Rocks on wave face (hard mode)
      if (statusRef.current === 'riding') {
        for (const rock of rocks) {
          const rx = BOARD_X + ((rock.x - BOARD_X) / BEACH_X) * (cssWidth - BOARD_X);
          const wave = waves.find((w) => w.id === ridingWaveId);
          if (wave) {
            const faceTop = getWaveHeightAt(rx, wave, time, baselineY);
            const faceBottom = baselineY + 90 * wave.amplitude;
            const ry = faceTop + (faceBottom - faceTop) * rock.y;
            ctx.fillStyle = '#57534e';
            ctx.beginPath();
            ctx.arc(rx, ry, rock.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#78716c';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      // Crabs cheering on beach when won
      if (statusRef.current === 'won') {
        ctx.font = '28px sans-serif';
        ctx.fillText('🦀', beachScreenX + 30, baselineY + 36);
        ctx.fillText('🦀', beachScreenX + 70, baselineY + 62);
        ctx.fillText('🦀', beachScreenX + 110, baselineY + 44);
      }

      // Distance bar
      const barW = cssWidth - 32;
      const barX = 16;
      const barY = 18;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(barX, barY, barW, 14);
      ctx.fillStyle = '#22c55e';
      const progress = clamp(distanceRef.current / config.targetDistance, 0, 1);
      ctx.fillRect(barX, barY, barW * progress, 14);
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barW, 14);
    },
    [config.alignmentWindow, config.targetDistance, rocks, ridingWaveId, waves]
  );

  const handlePaddle = useCallback(() => {
    if (statusRef.current !== 'waiting') return;
    playPop();
    const currentWaves = waves;
    const activeWave = getActiveWave(currentWaves, BOARD_X, elapsed);
    if (activeWave && isAligned(activeWave, elapsed, BOARD_X, config.alignmentWindow)) {
      setStatus('riding');
      statusRef.current = 'riding';
      setRidingWaveId(activeWave.id);
      setMessage(t.bodyboardWaveRider.riding ?? '');
    } else {
      setStatus('missed');
      statusRef.current = 'missed';
      playError();
      setMessage(t.bodyboardWaveRider.missed ?? '');
      setTimeout(() => {
        startRound(difficulty);
      }, 1600);
    }
  }, [config.alignmentWindow, difficulty, elapsed, playError, playPop, startRound, t.bodyboardWaveRider, waves]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (statusRef.current !== 'riding') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    riderYRef.current = y;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (statusRef.current !== 'riding') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const y = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    riderYRef.current = y;
  }, []);

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;

      if (statusRef.current === 'waiting' || statusRef.current === 'riding') {
        setElapsed((prev) => prev + dt);
      }

      if (statusRef.current === 'riding') {
        const wave = waves.find((w) => w.id === ridingWaveId);
        if (wave) {
          // Pocket is middle third of wave face
          const inPocket = riderYRef.current >= 0.33 && riderYRef.current <= 0.66;
          const tooHigh = riderYRef.current < 0.15;
          const tooLow = riderYRef.current > 0.85;
          let speed = wave.speed * (inPocket ? 1.2 : tooHigh || tooLow ? 0.5 : 0.9);
          speed *= 1 - config.undertowStrength;

          // Wind gusts
          const wind = Math.sin(elapsed * 1.5) * config.windStrength * wave.speed;
          speed += wind;

          // Auto steer easy mode toward sweet spot
          if (config.autoSteer) {
            const target = 0.5;
            riderYRef.current += (target - riderYRef.current) * 2 * dt;
          }

          const meters = (speed * dt) / 12; // scale pixels to meters
          distanceRef.current += meters;
          setDistance(distanceRef.current);

          // Rock collision
          for (const rock of rocks) {
            const dx = Math.abs(distanceRef.current * 12 + BOARD_X - rock.x);
            const dy = Math.abs(riderYRef.current - rock.y);
            if (dx < rock.size + 20 && dy < 0.18) {
              distanceRef.current *= 0.7;
              setDistance(distanceRef.current);
              playError();
            }
          }

          if (distanceRef.current >= config.targetDistance) {
            statusRef.current = 'won';
            setStatus('won');
            setShowConfetti(true);
            playSuccess();
            onStarEarned?.(config.starsAward);
          }
        }
      }

      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (canvas && container) {
        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = CANVAS_HEIGHT;
        if (canvas.width !== Math.floor(width * (window.devicePixelRatio || 1)) || canvas.height !== Math.floor(height * (window.devicePixelRatio || 1))) {
          canvas.width = Math.floor(width * (window.devicePixelRatio || 1));
          canvas.height = Math.floor(height * (window.devicePixelRatio || 1));
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        }
        const ctx = canvas.getContext('2d');
        if (ctx) {
          draw(ctx, width, height, elapsed);
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [config, draw, elapsed, onStarEarned, playError, playSuccess, ridingWaveId, rocks, waves]);

  const changeDifficulty = (diff: GameDifficulty) => {
    playPop();
    setDifficulty(diff);
  };

  const activeWave = useMemo(() => getActiveWave(waves, BOARD_X, elapsed), [waves, elapsed]);
  const aligned = useMemo(() => (activeWave ? isAligned(activeWave, elapsed, BOARD_X, config.alignmentWindow) : false), [activeWave, elapsed, config.alignmentWindow]);

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-2 w-full select-none max-w-lg mx-auto h-full">
      {showConfetti && <GameConfetti pieces={150} />}

      {/* Header Controls */}
      <div className="w-full flex items-center justify-between gap-3 bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm shrink-0">
        <DifficultySelector
          selected={difficulty}
          options={['easy', 'medium', 'hard']}
          onChange={changeDifficulty}
          disabled={status === 'riding'}
          className="!w-auto flex-1 max-w-[220px]"
        />
        <div className="text-right">
          <div className="text-xs font-black text-slate-400 uppercase">{t.bodyboardWaveRider.distance}</div>
          <div className="text-xl font-black text-slate-700 tabular-nums" data-testid="bodyboard-distance">
            {Math.floor(distance)}m
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="text-center space-y-1 mt-3 shrink-0">
        <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.bodyboardWaveRider.title}</h2>
        <p className="text-sm font-extrabold text-slate-500">{t.bodyboardWaveRider.subtitle}</p>
      </div>

      {/* Canvas Stage */}
      <div ref={containerRef} className="flex-1 flex items-center justify-center my-4 w-full h-full min-h-[300px]">
        <canvas
          ref={canvasRef}
          data-testid="bodyboard-canvas"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          className="w-full rounded-[2.5rem] border-8 border-slate-300 overflow-hidden shadow-inner bg-sky-100 touch-none"
          style={{ height: CANVAS_HEIGHT, touchAction: 'none' }}
        />
      </div>

      {/* Feedback message */}
      {message && (
        <div className="text-center font-black text-lg text-slate-700 mb-2 shrink-0" data-testid="bodyboard-message">
          {message}
        </div>
      )}

      {/* Paddle button */}
      {status !== 'won' && (
        <div className="w-full flex justify-center pb-2 shrink-0">
          <KidButton
            color="blue"
            size="lg"
            variant={aligned && status === 'waiting' ? 'primary' : 'default'}
            data-testid="bodyboard-paddle"
            onClick={handlePaddle}
            disabled={status !== 'waiting'}
            className="rounded-2xl tracking-wider uppercase min-h-24 min-w-24"
          >
            🏊‍♂️ {t.bodyboardWaveRider.paddle}
          </KidButton>
        </div>
      )}

      {/* Won overlay */}
      {status === 'won' && (
        <div className="absolute inset-x-4 bottom-24 top-24 bg-white/90 backdrop-blur-sm rounded-[2.5rem] border-8 border-slate-300 flex flex-col items-center justify-center p-4 space-y-4 z-20">
          <span className="text-5xl sm:text-6xl animate-bounce">🦀🎉</span>
          <h2 className="text-2xl sm:text-3xl font-black text-center leading-tight text-slate-800">
            {t.bodyboardWaveRider.victory}
          </h2>
          <p className="text-center font-extrabold text-slate-500">
            {t.bodyboardWaveRider.distance}: {Math.floor(distance)}m
          </p>
          <p className="text-center font-extrabold text-slate-500">
            {'⭐'.repeat(config.starsAward)}
          </p>
          <KidButton
            color="green"
            size="lg"
            data-testid="bodyboard-play-again"
            onClick={() => { playPop(); startRound(difficulty); }}
            className="rounded-2xl tracking-wider uppercase"
          >
            🔄 {t.bodyboardWaveRider.playAgain}
          </KidButton>
        </div>
      )}

      {/* Help */}
      <div className="text-center font-extrabold text-xs pb-2 shrink-0 text-slate-400">
        {t.bodyboardWaveRider.help}
      </div>
    </div>
  );
}

export default BodyboardWaveRider;
