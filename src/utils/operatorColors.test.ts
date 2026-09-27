import { describe, expect, it } from 'vitest';
import { operationOf } from './operatorColors';

describe('operationOf', () => {
  it('maps symbols and deltas to the same operation', () => {
    expect(operationOf('+')).toBe('plus');
    expect(operationOf('-')).toBe('minus');
    expect(operationOf('−')).toBe('minus');
    expect(operationOf(1)).toBe('plus');
    expect(operationOf(-1)).toBe('minus');
  });
});
