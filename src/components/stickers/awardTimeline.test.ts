import { describe, expect, it } from 'vitest';
import { HINT_MS, SELF_OPEN_MS, TWIST_MS, phaseAt } from './awardTimeline';

describe('capsule award timeline (no tap)', () => {
  it('twists, then waits for a tap, wiggles from 1.5 s and opens itself only at 4 s', () => {
    expect([TWIST_MS, HINT_MS, SELF_OPEN_MS]).toEqual([900, 1500, 4000]);
    expect(phaseAt(0, false)).toBe('twist');
    expect(phaseAt(TWIST_MS, false)).toBe('ready');
    expect(phaseAt(HINT_MS - 1, false)).toBe('ready');
    expect(phaseAt(HINT_MS, false)).toBe('hint');
    expect(phaseAt(SELF_OPEN_MS - 1, false)).toBe('hint');
    expect(phaseAt(SELF_OPEN_MS, false)).toBe('reveal');
  });

  it('reduced motion: static reveal straight away, never a wiggle', () => {
    for (const ms of [0, TWIST_MS, HINT_MS, SELF_OPEN_MS]) expect(phaseAt(ms, true)).toBe('reveal');
  });
});
