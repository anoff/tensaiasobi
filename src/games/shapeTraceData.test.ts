import { describe, expect, it } from 'vitest';
import { SHAPES } from './shapeTraceData';

describe('shapeTraceData', () => {
  it('has unique ids and closed paths', () => {
    const ids = SHAPES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(SHAPES.length).toBeGreaterThan(3);
    for (const shape of SHAPES) {
      expect(shape.points.length).toBeGreaterThan(2);
      expect(shape.emoji.length).toBeGreaterThan(0);
    }
  });
});
