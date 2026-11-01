import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const platform = { value: 'web' };
vi.mock('@capacitor/core', () => ({ Capacitor: { getPlatform: () => platform.value } }));

import { CUE_VOLUME, playSoundFile, soundUrl } from './soundFiles';

describe('sound files', () => {
  const play = vi.fn(() => Promise.resolve());
  const created: { src: string; volume: number }[] = [];

  beforeEach(() => {
    platform.value = 'web';
    created.length = 0;
    play.mockClear();
    vi.stubGlobal(
      'Audio',
      class {
        volume = 1;
        constructor(public src: string) {
          created.push(this);
        }
        play = play;
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('plays nothing (and loads nothing) when sound is off', () => {
    playSoundFile('capsule_twist', false);
    playSoundFile('capsule_pop', false);
    playSoundFile('shiny_sparkle', false);
    expect(created).toHaveLength(0);
    expect(play).not.toHaveBeenCalled();
  });

  it('plays OGG at the approved volume on web', () => {
    playSoundFile('shiny_sparkle', true);
    expect(created).toHaveLength(1);
    expect(created[0].src).toMatch(/sfx_shiny_sparkle.*\.ogg/);
    expect(created[0].volume).toBe(0.148);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('uses M4A on iOS', () => {
    platform.value = 'ios';
    playSoundFile('capsule_pop', true);
    expect(created[0].src).toMatch(/sfx_capsule_pop.*\.m4a/);
    expect(created[0].volume).toBe(0.389);
  });

  it('has every cue in both formats with the approved volumes', () => {
    for (const cue of ['capsule_twist', 'capsule_pop', 'shiny_sparkle'] as const) {
      expect(soundUrl(cue, 'ogg'), cue).toBeTruthy();
      expect(soundUrl(cue, 'm4a'), cue).toBeTruthy();
    }
    expect(CUE_VOLUME).toEqual({ capsule_twist: 0.433, capsule_pop: 0.389, shiny_sparkle: 0.148 });
  });
});
