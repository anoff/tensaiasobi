const WAVE_LENGTH = 440;

export function waveKindAt(worldX: number): 'small' | 'large' {
  const index = Math.floor(worldX / WAVE_LENGTH);
  return ((index % 4) + 4) % 4 === 2 ? 'large' : 'small';
}

export function waveAmplitudeAt(worldX: number) {
  return waveKindAt(worldX) === 'large' ? 66 : 24;
}

export function isWaveAligned(worldX: number, window: number) {
  const localX = ((worldX % WAVE_LENGTH) + WAVE_LENGTH) % WAVE_LENGTH;
  return waveKindAt(worldX) === 'large' && Math.abs(localX - WAVE_LENGTH / 2) <= window;
}
