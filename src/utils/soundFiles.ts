import { Capacitor } from '@capacitor/core';

/**
 * Recorded sound effects (Audio's files under src/assets/sounds/<group>/sfx_<key>.ogg|m4a).
 * iOS gets M4A (no Ogg in WKWebView on older iOS), everything else OGG.
 */
export type SoundCue = 'capsule_twist' | 'capsule_pop' | 'shiny_sparkle';

/** Mix volumes approved by the Art Director (shiny_sparkle stays exactly 0.148, layered on the pop). */
export const CUE_VOLUME: Record<SoundCue, number> = {
  capsule_twist: 0.433,
  capsule_pop: 0.389,
  shiny_sparkle: 0.148,
};

const FILES = import.meta.glob<string>('../assets/sounds/**/*.{ogg,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const soundExt = (): 'm4a' | 'ogg' => (Capacitor.getPlatform() === 'ios' ? 'm4a' : 'ogg');

export function soundUrl(cue: SoundCue, ext = soundExt()): string | undefined {
  return Object.entries(FILES).find(([path]) => path.endsWith(`/sfx_${cue}.${ext}`))?.[1];
}

/** Plays one cue at its volume. Does nothing (not even loading) when sound is off. */
export function playSoundFile(cue: SoundCue, soundEnabled: boolean): void {
  if (!soundEnabled) return;
  const url = soundUrl(cue);
  if (!url) return;
  try {
    const audio = new Audio(url);
    audio.volume = CUE_VOLUME[cue];
    void audio.play().catch(() => {});
  } catch (e) {
    console.error(`Failed to play ${cue}:`, e);
  }
}
