/** Capsule award timing (ART.md §6 capsules). Pure, so the timeline is unit-testable. */

/** Knob turns and the capsule rolls out (ms). */
export const TWIST_MS = 900;
/** No tap yet: the capsule starts to wiggle as a hint (ms after the overlay opens). */
export const HINT_MS = 1500;
/** Fallback only: the capsule opens itself so the overlay never gets stuck (ms after the overlay opens). */
export const SELF_OPEN_MS = 4000;
/** Capsule split + sticker pop + butter rays, then the overlay closes. */
export const REVEAL_MS = 1400;
/** Reduced motion: how long the static reveal stays. */
export const STATIC_REVEAL_MS = 2000;

export type Phase = 'twist' | 'ready' | 'hint' | 'reveal';

/**
 * Where an untapped award is `ms` after it opened: the capsule waits for a tap, wiggles from
 * 1.5 s, and opens itself only at 4 s. Reduced motion goes straight to the static reveal (no wiggle).
 */
export function phaseAt(ms: number, reduced: boolean): Phase {
  if (reduced || ms >= SELF_OPEN_MS) return 'reveal';
  if (ms >= HINT_MS) return 'hint';
  return ms >= TWIST_MS ? 'ready' : 'twist';
}
