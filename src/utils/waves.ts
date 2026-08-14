import type { GameDifficulty } from '../types/game';

export interface Wave {
  id: number;
  amplitude: number; // 0..1 relative to max wave height
  speed: number; // pixels per second
  phase: number;
  wavelength: number; // pixels
  x: number; // crest center in world pixels
}

export interface Rock {
  id: number;
  x: number; // world x
  y: number; // 0..1 normalized height on wave face
  size: number;
}

interface DifficultyConfig {
  waveSpeedBase: number;
  waveSpeedVar: number;
  wavelengthBase: number;
  wavelengthVar: number;
  amplitudeSmall: number;
  amplitudeLarge: number;
  alignmentWindow: number;
  paddleInterval: number;
  targetDistance: number;
  autoSteer: boolean;
  rocks: number;
  windStrength: number;
  undertowStrength: number;
  starsAward: number;
}

const BOARD_X = 96;
const BEACH_X = 900;
const MAX_AMPLITUDE_PX = 90;

const DIFFICULTY_CONFIG: Record<GameDifficulty, DifficultyConfig> = {
  easy: {
    waveSpeedBase: 60,
    waveSpeedVar: 10,
    wavelengthBase: 480,
    wavelengthVar: 40,
    amplitudeSmall: 0.85,
    amplitudeLarge: 1,
    alignmentWindow: 0.55,
    paddleInterval: 3.2,
    targetDistance: 20,
    autoSteer: true,
    rocks: 0,
    windStrength: 0,
    undertowStrength: 0,
    starsAward: 1,
  },
  medium: {
    waveSpeedBase: 95,
    waveSpeedVar: 25,
    wavelengthBase: 420,
    wavelengthVar: 80,
    amplitudeSmall: 0.35,
    amplitudeLarge: 1,
    alignmentWindow: 0.32,
    paddleInterval: 2.4,
    targetDistance: 45,
    autoSteer: false,
    rocks: 0,
    windStrength: 0.02,
    undertowStrength: 0.03,
    starsAward: 2,
  },
  hard: {
    waveSpeedBase: 140,
    waveSpeedVar: 55,
    wavelengthBase: 360,
    wavelengthVar: 110,
    amplitudeSmall: 0.25,
    amplitudeLarge: 1,
    alignmentWindow: 0.22,
    paddleInterval: 1.6,
    targetDistance: 75,
    autoSteer: false,
    rocks: 4,
    windStrength: 0.06,
    undertowStrength: 0.07,
    starsAward: 3,
  },
};

export function generateWaves(difficulty: GameDifficulty, count = 20, seedOffset = 0): Wave[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  const waves: Wave[] = [];
  let nextX = BOARD_X - config.wavelengthBase * 0.75 + seedOffset;

  for (let i = 0; i < count; i++) {
    const isLarge = difficulty === 'easy' ? true : Math.random() < (difficulty === 'medium' ? 0.55 : 0.45);
    const amplitude = isLarge ? config.amplitudeLarge : config.amplitudeSmall;
    const wavelength = config.wavelengthBase + (Math.random() * 2 - 1) * config.wavelengthVar;
    const speed = config.waveSpeedBase + (Math.random() * 2 - 1) * config.waveSpeedVar;
    nextX += wavelength * 0.6 + Math.random() * wavelength * 0.4;
    waves.push({
      id: i,
      amplitude,
      speed,
      phase: Math.random() * Math.PI * 2,
      wavelength,
      x: nextX,
    });
  }
  return waves;
}

export function generateRocks(difficulty: GameDifficulty): Rock[] {
  const config = DIFFICULTY_CONFIG[difficulty];
  const rocks: Rock[] = [];
  const spacing = (BEACH_X - BOARD_X) / (config.rocks + 1);
  for (let i = 0; i < config.rocks; i++) {
    rocks.push({
      id: i,
      x: BOARD_X + spacing * (i + 1) + (Math.random() - 0.5) * spacing * 0.5,
      y: 0.25 + Math.random() * 0.5,
      size: 24 + Math.random() * 16,
    });
  }
  return rocks;
}

export function getWaveHeightAt(x: number, wave: Wave, time: number, baselineY: number): number {
  const phase = wave.phase + ((x - wave.x) / wave.wavelength) * Math.PI * 2;
  const tPhase = (time * wave.speed / wave.wavelength) * Math.PI * 2;
  const raw = Math.sin(phase + tPhase);
  return baselineY - raw * wave.amplitude * MAX_AMPLITUDE_PX;
}

export function getWaveSlopeAt(x: number, wave: Wave, time: number): number {
  const phase = wave.phase + ((x - wave.x) / wave.wavelength) * Math.PI * 2;
  const tPhase = (time * wave.speed / wave.wavelength) * Math.PI * 2;
  const raw = Math.cos(phase + tPhase);
  const slope = -raw * wave.amplitude * MAX_AMPLITUDE_PX * ((Math.PI * 2) / wave.wavelength);
  return slope;
}

export function getActiveWave(waves: Wave[], boardX: number, time: number): Wave | null {
  let best: Wave | null = null;
  let bestScore = Infinity;
  for (const wave of waves) {
    const phase = wave.phase + ((boardX - wave.x) / wave.wavelength) * Math.PI * 2;
    const tPhase = (time * wave.speed / wave.wavelength) * Math.PI * 2;
    const sin = Math.sin(phase + tPhase);
    const score = Math.abs(sin - 1); // closest to crest
    if (score < bestScore) {
      bestScore = score;
      best = wave;
    }
  }
  return best;
}

export function isAligned(activeWave: Wave, time: number, boardX: number, windowFraction: number): boolean {
  const phase = activeWave.phase + ((boardX - activeWave.x) / activeWave.wavelength) * Math.PI * 2;
  const tPhase = (time * activeWave.speed / activeWave.wavelength) * Math.PI * 2;
  const sin = Math.sin(phase + tPhase);
  return sin >= 1 - windowFraction && activeWave.amplitude >= 0.85;
}

export function getDifficultyConfig(difficulty: GameDifficulty): DifficultyConfig {
  return DIFFICULTY_CONFIG[difficulty];
}
