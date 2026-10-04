import { describe, expect, it } from 'vitest';
import { en } from '../locales/en';
import { de } from '../locales/de';
import { fr } from '../locales/fr';
import { ja } from '../locales/ja';
import { ko } from '../locales/ko';
import type { GameDifficulty } from '../types/game';
import {
  ANIMALS, MAX_QUESTIONS, TRAITS, answer, geniePool, guess, hasTrait, newGenie, nextQuestion, plausible, reject, type GenieState,
} from './animalGenieLogic';

const LEVELS: GameDifficulty[] = ['easy', 'medium', 'hard'];

/** Play a whole game answering truthfully for `animal`, optionally lying once. */
function play(level: GameDifficulty, animal: string, lieOnQuestion = -1): { found: boolean; questions: number; wrongGuesses: number } {
  let state: GenieState = newGenie(level);
  let wrongGuesses = 0;
  for (;;) {
    const q = nextQuestion(state);
    if (q) {
      const truth = hasTrait(animal, q);
      state = answer(state, q, state.asked.length === lieOnQuestion ? !truth : truth);
      continue;
    }
    const g = guess(state);
    if (g === animal) return { found: true, questions: state.asked.length, wrongGuesses };
    if (!g || ++wrongGuesses >= 3) return { found: false, questions: state.asked.length, wrongGuesses };
    state = reject(state, g);
  }
}

describe('Animal Genie', () => {
  it('every animal has a unique set of traits', () => {
    const seen = new Map<string, string>();
    for (const [animal, traits] of Object.entries(ANIMALS)) {
      const key = [...traits].sort().join();
      expect(seen.get(key), `${animal} looks like ${seen.get(key)}`).toBeUndefined();
      seen.set(key, animal);
      for (const t of traits) expect(TRAITS).toContain(t);
    }
  });

  it('every animal has a translated name in every language', () => {
    for (const dict of [en, de, fr, ja, ko]) {
      for (const animal of Object.keys(ANIMALS)) {
        expect((dict.anlautGame.items as Record<string, string>)[animal], animal).toBeTruthy();
      }
    }
  });

  it('finds every animal on the first guess when the child answers truthfully', () => {
    for (const level of LEVELS) {
      for (const animal of geniePool(level)) {
        for (let run = 0; run < 5; run++) {
          const result = play(level, animal);
          expect(result.found, `${level} ${animal}`).toBe(true);
          expect(result.wrongGuesses).toBe(0);
          expect(result.questions).toBeLessThanOrEqual(MAX_QUESTIONS);
        }
      }
    }
  });

  it('usually still finds the animal when the child answers one question wrong', () => {
    let found = 0;
    let games = 0;
    for (const animal of geniePool('medium')) {
      for (let lie = 0; lie < 3; lie++) {
        games++;
        if (play('medium', animal, lie).found) found++;
      }
    }
    expect(found / games).toBeGreaterThan(0.6);
  });

  it('never asks the same question twice and only asks questions that split the field', () => {
    for (let game = 0; game < 50; game++) {
      let state = newGenie('hard');
      for (;;) {
        const q = nextQuestion(state);
        if (!q) {
          // Only stop asking when one animal is left, or nothing splits the rest.
          const field = plausible(state);
          expect(field.length === 1 || state.asked.length >= MAX_QUESTIONS || TRAITS.every((t) =>
            state.asked.includes(t) || field.every((a) => hasTrait(a, t)) || field.every((a) => !hasTrait(a, t)))).toBe(true);
          break;
        }
        expect(state.asked).not.toContain(q);
        const field = plausible(state);
        const yes = field.filter((a) => hasTrait(a, q)).length;
        expect(yes).toBeGreaterThan(0);
        expect(yes).toBeLessThan(field.length);
        state = answer(state, q, Math.random() < 0.5);
      }
    }
  });
});
