import { useCallback } from 'react';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function useSound(soundEnabled: boolean, vibrationEnabled: boolean) {
  const playPop = useCallback(() => {
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(25);
    }
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.error('Failed to play pop sound:', e);
    }
  }, [soundEnabled, vibrationEnabled]);

  const playSuccess = useCallback(() => {
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([40, 30, 80]);
    }
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      const playNote = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      // Synthesize a quick ascending major arpeggio (C5 -> E5 -> G5 -> C6)
      playNote(523.25, now, 0.08);
      playNote(659.25, now + 0.06, 0.08);
      playNote(783.99, now + 0.12, 0.08);
      playNote(1046.50, now + 0.18, 0.16);
    } catch (e) {
      console.error('Failed to play success sound:', e);
    }
  }, [soundEnabled, vibrationEnabled]);

  const playError = useCallback(() => {
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.22);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.22);

      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {
      console.error('Failed to play error sound:', e);
    }
  }, [soundEnabled, vibrationEnabled]);

  return { playPop, playSuccess, playError };
}
