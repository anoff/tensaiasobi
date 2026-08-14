import { useCallback, useEffect, useRef, useState } from 'react';
import GameConfetti from '../components/GameConfetti';
import DifficultySelector from '../components/DifficultySelector';
import KidButton from '../components/KidButton';
import { useTranslation } from '../hooks/useTranslation';
import type { GameDifficulty, GameProps } from '../types/game';
import { isWaveAligned, isWaveRideableAtBeach, waveAmplitudeAt, waveKindAt, waveProgressAt } from './bodyboardWaveRiderLogic';

type Phase = 'waiting' | 'riding' | 'missed' | 'won';

interface DifficultyConfig {
  target: number;
  speed: number;
  alignmentWindow: number;
  automaticSteering: boolean;
  rocks: boolean;
}

const CONFIG: Record<GameDifficulty, DifficultyConfig> = {
  easy: { target: 20, speed: 70, alignmentWindow: 72, automaticSteering: true, rocks: false },
  medium: { target: 45, speed: 105, alignmentWindow: 38, automaticSteering: false, rocks: false },
  hard: { target: 75, speed: 145, alignmentWindow: 26, automaticSteering: false, rocks: true },
};

const STARS: Record<GameDifficulty, number> = { easy: 1, medium: 2, hard: 3 };
const WAVE_LENGTH = 440;

export default function BodyboardWaveRider({ playPop, playSuccess, playError, onStarEarned }: GameProps) {
  const { t } = useTranslation();
  const [difficulty, setDifficulty] = useState<GameDifficulty>('easy');
  const [phase, setPhase] = useState<Phase>('waiting');
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [riderY, setRiderY] = useState(0.5);
  const [rideProgress, setRideProgress] = useState(0);
  const [ridingWaveAmplitude, setRidingWaveAmplitude] = useState(0);
  const [message, setMessage] = useState('');
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef<Phase>('waiting');
  const riderYRef = useRef(0.5);
  const distanceRef = useRef(0);
  const ridingWaveStartRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);

  const config = CONFIG[difficulty];
  const boardWorldX = WAVE_LENGTH * 3 - elapsed * (config.speed / 0.9);
  const aligned = isWaveAligned(boardWorldX, config.alignmentWindow);

  const resetRound = useCallback(() => {
    phaseRef.current = 'waiting';
    riderYRef.current = 0.5;
    distanceRef.current = 0;
    ridingWaveStartRef.current = 0;
    setPhase('waiting');
    setElapsed(0);
    setDistance(0);
    setRiderY(0.5);
    setRideProgress(0);
    setRidingWaveAmplitude(0);
    setMessage('');
  }, []);

  useEffect(() => {
    let frame = 0;
    const draw = (now: number) => {
      const canvas = canvasRef.current;
      const stage = stageRef.current;
      if (!canvas || !stage) return;
      const rect = stage.getBoundingClientRect();
      const scale = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      if (canvas.width !== width * scale || canvas.height !== height * scale) {
        canvas.width = width * scale;
        canvas.height = height * scale;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const seaLevel = height * 0.58;
      const drift = now * config.speed / 900;
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#bae6fd');
      gradient.addColorStop(0.55, '#38bdf8');
      gradient.addColorStop(1, '#0e7490');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      for (let x = -20; x <= width + 20; x += 4) {
        const worldX = x - drift;
        const amplitude = waveAmplitudeAt(worldX);
        const y = seaLevel - Math.sin((worldX / WAVE_LENGTH) * Math.PI * 2) * amplitude;
        const nextWorldX = x + 4 - drift;
        const nextY = seaLevel - Math.sin((nextWorldX / WAVE_LENGTH) * Math.PI * 2) * waveAmplitudeAt(nextWorldX);
        ctx.beginPath();
        ctx.moveTo(x, height);
        ctx.lineTo(x, y);
        ctx.lineTo(x + 4, nextY);
        ctx.lineTo(x + 4, height);
        ctx.closePath();
        ctx.fillStyle = waveKindAt(worldX) === 'large' ? '#3730a3' : '#67e8f9';
        ctx.fill();
        if (waveKindAt(worldX) === 'large' && y < seaLevel - amplitude * 0.82) {
          ctx.strokeStyle = 'rgba(255,255,255,0.9)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + 4, nextY);
          ctx.stroke();
        }
      }
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(width * 0.87, seaLevel + 35, width * 0.13, height - seaLevel);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [config.speed]);

  useEffect(() => {
    let frame = 0;
    const tick = (now: number) => {
      const previous = lastFrameRef.current ?? now;
      const delta = Math.min(now - previous, 50);
      lastFrameRef.current = now;
      setElapsed((value) => value + delta / 1000);
      if (phaseRef.current === 'riding') {
        const pocket = 1 - Math.min(1, Math.abs(riderYRef.current - 0.5) / 0.5);
        const gust = difficulty === 'hard' ? Math.sin(now / 330) * 0.035 : 0;
        const nextY = Math.max(0.08, Math.min(0.92, riderYRef.current + gust));
        riderYRef.current = nextY;
        setRiderY(nextY);
        const rockHit = config.rocks && [0.35, 0.62].some((at) =>
          Math.abs(distanceRef.current / config.target - at) < 0.012 && Math.abs(nextY - (at === 0.35 ? 0.32 : 0.7)) < 0.16
        );
        if (rockHit) {
          phaseRef.current = 'missed';
          setPhase('missed');
          setMessage(t.bodyboardWaveRider.rock);
          playError();
        } else {
          const nextDistance = distanceRef.current + (0.012 + pocket * 0.045) * delta;
          distanceRef.current = nextDistance;
          setDistance(Math.floor(nextDistance));
          const nextProgress = Math.min(1, nextDistance / config.target);
          const waveStart = Math.floor(ridingWaveStartRef.current / WAVE_LENGTH) * WAVE_LENGTH;
          const ridingWaveX = waveStart + WAVE_LENGTH * Math.min(0.95, waveProgressAt(ridingWaveStartRef.current) + 0.45 * nextProgress);
          const nextAmplitude = waveAmplitudeAt(ridingWaveX);
          setRideProgress(nextProgress);
          setRidingWaveAmplitude(nextAmplitude);
          if (nextDistance >= config.target) {
            if (isWaveRideableAtBeach(ridingWaveX)) {
              phaseRef.current = 'won';
              setPhase('won');
              setMessage(t.bodyboardWaveRider.victory);
              playSuccess();
              onStarEarned?.(STARS[difficulty]);
            } else {
              phaseRef.current = 'missed';
              setPhase('missed');
              setMessage(t.bodyboardWaveRider.missed);
              playError();
            }
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [config.rocks, config.target, difficulty, onStarEarned, playError, playSuccess, t.bodyboardWaveRider.missed, t.bodyboardWaveRider.rock, t.bodyboardWaveRider.victory]);

  const paddle = () => {
    if (phase !== 'waiting') return;
    if (aligned) {
      phaseRef.current = 'riding';
      ridingWaveStartRef.current = boardWorldX;
      setRidingWaveAmplitude(waveAmplitudeAt(boardWorldX));
      setPhase('riding');
      setMessage(t.bodyboardWaveRider.caught);
      playPop();
    } else {
      phaseRef.current = 'missed';
      setPhase('missed');
      setMessage(t.bodyboardWaveRider.missed);
      playError();
    }
  };

  const steer = (event: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'riding' || config.automaticSteering || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const nextY = Math.max(0.08, Math.min(0.92, (event.clientY - rect.top) / rect.height));
    riderYRef.current = nextY;
    setRiderY(nextY);
  };

  return (
    <div className="flex-1 flex flex-col items-center gap-3 p-2 w-full max-w-lg mx-auto select-none">
      {phase === 'won' && <GameConfetti pieces={150} />}
      <div className="w-full bg-white/80 p-2 rounded-3xl border-2 border-slate-200 shadow-sm">
        <DifficultySelector selected={difficulty} options={['easy', 'medium', 'hard']} onChange={(value) => { playPop(); resetRound(); setDifficulty(value); }} disabled={phase === 'riding'} className="!w-auto" />
      </div>
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-800">{t.bodyboardWaveRider.title}</h2>
        <p className="text-sm font-extrabold text-slate-500">{t.bodyboardWaveRider.subtitle}</p>
      </div>
      <div
        ref={stageRef}
        data-testid="bodyboard-stage"
        data-wave-types="small,large"
        data-aligned={aligned}
        data-wave-kind={waveKindAt(boardWorldX)}
        data-alignment-window={config.alignmentWindow}
        data-rider-progress={rideProgress.toFixed(2)}
        data-riding-wave-amplitude={ridingWaveAmplitude.toFixed(1)}
        onPointerDown={steer}
        onPointerMove={steer}
        className="relative flex-1 min-h-[330px] w-full overflow-hidden rounded-[2.5rem] border-8 border-sky-200 shadow-inner touch-none"
        style={{ touchAction: 'none' }}
      >
        <canvas ref={canvasRef} data-testid="bodyboard-wave-canvas" className="absolute inset-0 h-full w-full" />
        {aligned && phase === 'waiting' && <div data-testid="bodyboard-alignment" className="absolute left-[24%] top-[35%] w-28 h-28 rounded-full bg-emerald-300/40 border-4 border-emerald-100 animate-pulse" />}
        <div
          data-testid="bodyboard-rider"
          className={`absolute z-10 text-4xl transition-all duration-75 ${phase === 'riding' ? 'animate-bounce' : ''}`}
          style={{
            left: `${25 + rideProgress * 62}%`,
            top: `${62 - ridingWaveAmplitude * 0.22 + (riderY - 0.5) * 58}%`,
          }}
        >
          🦦🏄
        </div>
        {config.rocks && phase === 'riding' && (
          <>
            <span className="absolute left-[52%] top-[38%] text-3xl">🪨</span>
            <span className="absolute left-[72%] top-[62%] text-3xl">🪨</span>
          </>
        )}
        <div className="absolute right-2 bottom-4 text-3xl">🦀🦀</div>
        <div className="absolute top-3 right-3 rounded-full bg-white/85 px-3 py-1 font-black text-indigo-800" data-testid="bodyboard-distance">
          {t.bodyboardWaveRider.distance}: {distance}m
        </div>
        {message && <div className="absolute inset-x-4 top-16 text-center font-black text-white drop-shadow-md">{message}</div>}
        {(phase === 'missed' || phase === 'won') && (
          <KidButton color="green" size="md" onClick={() => { playPop(); resetRound(); }} className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
            🔄 {t.bodyboardWaveRider.playAgain}
          </KidButton>
        )}
      </div>
      <p className="text-center text-xs font-extrabold text-slate-500">{t.bodyboardWaveRider.help}</p>
      {phase === 'waiting' && (
        <KidButton data-testid="bodyboard-paddle" color="blue" size="lg" onClick={paddle} className="w-full min-h-24">
          🏊‍♂️ {t.bodyboardWaveRider.paddle}
        </KidButton>
      )}
    </div>
  );
}
