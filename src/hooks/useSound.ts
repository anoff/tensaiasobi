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
  const playPop = () => {
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
  };

  const playSuccess = () => {
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
  };

  const playError = () => {
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
  };

  // A cheerful little "yip" reminiscent of a small animal noise.
  const playAnimalSound = () => {
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([20, 20, 20]);
    }
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      const playYip = (start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(500, start);
        osc.frequency.exponentialRampToValueAtTime(900, start + duration * 0.5);
        osc.frequency.exponentialRampToValueAtTime(400, start + duration);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.exponentialRampToValueAtTime(0.2, start + duration * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      playYip(now, 0.12);
      playYip(now + 0.16, 0.14);
    } catch (e) {
      console.error('Failed to play animal sound:', e);
    }
  };

  // A classic two-tone "honk honk" car horn.
  const playCarHonk = () => {
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([60, 40, 60]);
    }
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      const playHonk = (start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
        gain.gain.setValueAtTime(0.18, start + duration - 0.04);
        gain.gain.linearRampToValueAtTime(0.001, start + duration);

        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      playHonk(now, 0.18);
      playHonk(now + 0.24, 0.18);
    } catch (e) {
      console.error('Failed to play car honk sound:', e);
    }
  };

  // A gentle two-note "ding-dong" doorbell chime.
  const playDoorChime = () => {
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate([30, 30, 30]);
    }
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      const playChime = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      // "Ding" then "dong" a minor third lower.
      playChime(880, now, 0.35);
      playChime(659.25, now + 0.22, 0.4);
    } catch (e) {
      console.error('Failed to play door chime sound:', e);
    }
  };

  // A soft whooshing "wind breeze" made from filtered white noise.
  const playWindBreeze = () => {
    if (vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(15);
    }
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      const duration = 0.9;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = 0.7;

      const gain = ctx.createGain();

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      // Sweep the filter frequency up and back down to create a breeze feel.
      filter.frequency.setValueAtTime(300, now);
      filter.frequency.linearRampToValueAtTime(1200, now + duration * 0.5);
      filter.frequency.linearRampToValueAtTime(300, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + duration * 0.3);
      gain.gain.linearRampToValueAtTime(0.001, now + duration);

      noise.start(now);
      noise.stop(now + duration);
    } catch (e) {
      console.error('Failed to play wind breeze sound:', e);
    }
  };

  return { playPop, playSuccess, playError, playAnimalSound, playCarHonk, playDoorChime, playWindBreeze };
}
