import { describe, expect, it } from 'vitest';
import { generateNumberTrainRound, NUMBER_TRAIN_CONFIG, wagonSeats } from './numberTrainLogic';
import type { GameDifficulty } from '../types/game';

describe('generateNumberTrainRound', () => {
  it('always fits the passengers into one wagon and includes the answer once', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as GameDifficulty[]) {
      for (let i = 0; i < 200; i++) {
        const round = generateNumberTrainRound(difficulty);
        const config = NUMBER_TRAIN_CONFIG[difficulty];
        expect(round.passengerCount).toBeGreaterThanOrEqual(1);
        expect(round.passengerCount).toBeLessThanOrEqual(wagonSeats(difficulty));
        expect(round.targets).toHaveLength(config.targetCount);
        expect(new Set(round.targets).size).toBe(config.targetCount);
        expect(round.targets.filter((target) => target === round.answer)).toHaveLength(1);
        expect(round.targets.every((target) => target >= 1)).toBe(true);
        expect(round.answer).toBe(round.passengerCount + round.delta);
      }
    }
  });

  it('only uses the ±1 rule on hard', () => {
    for (let i = 0; i < 100; i++) {
      expect(generateNumberTrainRound('easy').delta).toBe(0);
      expect(generateNumberTrainRound('medium').delta).toBe(0);
      expect(Math.abs(generateNumberTrainRound('hard').delta)).toBe(1);
    }
  });
});
