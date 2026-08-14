const WAVE_LENGTH = 440;
export const BEACH_WAVE_AMPLITUDE = 30;

export function waveKindAt(worldX: number): 'small' | 'large' {
  const index = Math.floor(worldX / WAVE_LENGTH);
  return ((index % 4) + 4) % 4 === 2 ? 'large' : 'small';
}

export function waveProgressAt(worldX: number) {
  return ((worldX % WAVE_LENGTH) + WAVE_LENGTH) % WAVE_LENGTH / WAVE_LENGTH;
}

export function waveAmplitudeAt(worldX: number) {
  const maxAmplitude = waveKindAt(worldX) === 'large' ? 66 : 24;
  const progress = waveProgressAt(worldX);
  const envelope = progress < 0.72
    ? 0.35 + 0.65 * (progress / 0.72)
    : 1 - 0.6 * ((progress - 0.72) / 0.28);
  return maxAmplitude * envelope;
}

export function isWaveRideableAtBeach(worldX: number) {
  return waveKindAt(worldX) === 'large' && waveAmplitudeAt(worldX) >= BEACH_WAVE_AMPLITUDE;
}

export function isWaveAligned(worldX: number, window: number) {
  const localX = waveProgressAt(worldX) * WAVE_LENGTH;
  return waveKindAt(worldX) === 'large' && Math.abs(localX - WAVE_LENGTH / 2) <= window;
}
