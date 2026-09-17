import { describe, expect, it } from 'vitest';
import { formatRemaining } from './useSessionTimer';

describe('formatRemaining', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatRemaining(0)).toBe('0:00');
    expect(formatRemaining(1000)).toBe('0:01');
    expect(formatRemaining(65_000)).toBe('1:05');
    expect(formatRemaining(10 * 60_000)).toBe('10:00');
  });
});
