import { describe, expect, it } from 'vitest';
import { generateEdgeProfiles, generateInitialState, getJigsawPath } from './puzzleLogic';

describe('puzzleLogic', () => {
  it('makes neighboring edges complementary and outer edges flat', () => {
    const size = 3;
    const profiles = generateEdgeProfiles(size);
    expect(profiles).toHaveLength(9);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const p = profiles[r * size + c];
        if (r === 0) expect(p.top).toBe('none');
        if (c === 0) expect(p.left).toBe('none');
        if (r === size - 1) expect(p.bottom).toBe('none');
        if (c === size - 1) expect(p.right).toBe('none');
        if (r > 0) {
          const above = profiles[(r - 1) * size + c];
          if (above.bottom === 'tab') expect(p.top).toBe('blank');
          if (above.bottom === 'blank') expect(p.top).toBe('tab');
        }
        if (c > 0) {
          const left = profiles[r * size + (c - 1)];
          if (left.right === 'tab') expect(p.left).toBe('blank');
          if (left.right === 'blank') expect(p.left).toBe('tab');
        }
      }
    }
  });

  it('builds a closed SVG path for every profile', () => {
    const profiles = generateEdgeProfiles(2);
    for (const profile of profiles) {
      const path = getJigsawPath(profile);
      expect(path.startsWith('M 0,0')).toBe(true);
      expect(path.endsWith(' Z')).toBe(true);
    }
  });

  it('starts with an empty board and a permutation of piece ids in the tray', () => {
    const { initialBoard, initialTray } = generateInitialState(3);
    expect(initialBoard).toEqual(Array(9).fill(null));
    expect([...initialTray].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
