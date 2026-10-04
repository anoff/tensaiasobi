import type { GameDifficulty } from '../types/game';
import { CHOICE_STARS } from '../utils/difficulty';
import { pick, type Rand } from '../utils/random';

/**
 * Animal Genie: the child thinks of an animal, the genie asks yes/no questions
 * and guesses. Fully offline: a small trait table, no learning, no network.
 *
 * Answers are scored, not used to delete animals outright: each animal counts
 * how many answers disagree with it, and only the animals with the fewest
 * disagreements are still "in the running". A child who answers one question
 * wrong therefore still gets found — it just costs the genie a wrong guess.
 */
export const TRAITS = [
  'fly', 'water', 'fur', 'fourLegs', 'big', 'farm', 'pattern', 'pet', 'feathers', 'climb',
  'blackWhite', 'hop', 'green', 'yellow', 'red', 'tiny', 'meat', 'shell', 'manyLegs',
] as const;
export type Trait = (typeof TRAITS)[number];

/** Icon shown with each question so pre-readers can follow along. */
export const TRAIT_ICONS: Record<Trait, string> = {
  fly: '🪽', water: '🌊', fur: '🧸', fourLegs: '🐾', big: '📏', farm: '🚜', pattern: '〰️',
  pet: '🏠', feathers: '🪶', climb: '🌳', blackWhite: '⚫⚪', hop: '⬆️', green: '🟢',
  yellow: '🟡', red: '🔴', tiny: '✋', meat: '🍖', shell: '🐚', manyLegs: '🦵',
};

/**
 * Traits that are true for each animal; everything else is false. Emojis match
 * the shared picture dictionary so names come translated for free.
 */
export const ANIMALS: Record<string, readonly Trait[]> = {
  '🐕': ['fur', 'fourLegs', 'pet', 'meat'],
  '🐈': ['fur', 'fourLegs', 'pet', 'meat', 'climb'],
  '🐄': ['fur', 'fourLegs', 'big', 'farm', 'pattern', 'blackWhite'],
  '🐷': ['fourLegs', 'farm'],
  '🐔': ['farm', 'feathers'],
  '🦁': ['fur', 'fourLegs', 'big', 'meat', 'yellow'],
  '🐘': ['fourLegs', 'big'],
  '🐟': ['water', 'pet', 'tiny'],
  '🐝': ['fly', 'pattern', 'tiny', 'yellow'],
  '🐸': ['water', 'fourLegs', 'hop', 'green', 'tiny'],
  '🐇': ['fur', 'fourLegs', 'pet', 'hop'],
  '🐭': ['fur', 'fourLegs', 'pet', 'tiny'],
  '🦆': ['fly', 'water', 'farm', 'feathers'],
  '🐯': ['fur', 'fourLegs', 'big', 'meat', 'pattern'],
  '🦒': ['fur', 'fourLegs', 'big', 'pattern', 'yellow'],
  '🦓': ['fur', 'fourLegs', 'big', 'pattern', 'blackWhite'],
  '🐼': ['fur', 'fourLegs', 'big', 'climb', 'blackWhite'],
  '🐒': ['fur', 'climb'],
  '🐢': ['water', 'fourLegs', 'pet', 'green', 'shell'],
  '🦉': ['fly', 'feathers', 'meat'],
  '🐻': ['fur', 'fourLegs', 'big', 'climb', 'meat'],
  '🐺': ['fur', 'fourLegs', 'meat'],
  '🐨': ['fur', 'fourLegs', 'climb'],
  '🐪': ['fur', 'fourLegs', 'big'],
  '🐙': ['water', 'meat', 'manyLegs'],
  '🦈': ['water', 'big', 'meat'],
  '🐳': ['water', 'big'],
  '🐧': ['water', 'feathers', 'blackWhite', 'meat'],
  '🦋': ['fly', 'pattern', 'tiny'],
  '🐞': ['fly', 'pattern', 'tiny', 'red'],
  '🐌': ['tiny', 'shell'],
  '🦀': ['water', 'shell', 'manyLegs', 'red'],
  '🐍': ['green', 'meat'],
};

/** Each level adds animals; easy keeps ones a preschooler knows well and that differ a lot. */
const POOLS: Record<GameDifficulty, string[]> = {
  easy: ['🐕', '🐈', '🐄', '🐷', '🐔', '🦁', '🐘', '🐟', '🐝', '🐸'],
  medium: ['🐕', '🐈', '🐄', '🐷', '🐔', '🦁', '🐘', '🐟', '🐝', '🐸',
    '🐇', '🐭', '🦆', '🐯', '🦒', '🦓', '🐼', '🐒', '🐢', '🦉'],
  hard: Object.keys(ANIMALS),
};

export const GENIE_STARS = CHOICE_STARS;
/** After this many wrong guesses the child wins. */
export const MAX_WRONG_GUESSES = 3;
/** The genie guesses at the latest after this many questions. */
export const MAX_QUESTIONS = 12;

export function geniePool(level: GameDifficulty): string[] {
  return POOLS[level];
}

export function hasTrait(animal: string, trait: Trait): boolean {
  return ANIMALS[animal].includes(trait);
}

export interface GenieState {
  pool: string[];
  /** Yes/no answers so far ("not sure" only marks the trait as asked). */
  answers: Partial<Record<Trait, boolean>>;
  asked: Trait[];
  /** Animals the genie guessed wrongly. */
  rejected: string[];
}

export function newGenie(level: GameDifficulty): GenieState {
  return { pool: geniePool(level), answers: {}, asked: [], rejected: [] };
}

/** How many answers disagree with this animal. */
export function mismatches(animal: string, answers: GenieState['answers']): number {
  return (Object.entries(answers) as Array<[Trait, boolean]>).filter(([trait, yes]) => hasTrait(animal, trait) !== yes).length;
}

/** Animals still in the running: not rejected, and with the fewest disagreements. */
export function plausible(state: GenieState): string[] {
  const left = state.pool.filter((a) => !state.rejected.includes(a));
  if (left.length === 0) return [];
  const best = Math.min(...left.map((a) => mismatches(a, state.answers)));
  return left.filter((a) => mismatches(a, state.answers) === best);
}

/** The unasked trait that splits the plausible animals most evenly, or null if none splits them. */
export function nextQuestion(state: GenieState, rand: Rand = Math.random): Trait | null {
  const candidates = plausible(state);
  if (candidates.length <= 1 || state.asked.length >= MAX_QUESTIONS) return null;
  let best: Trait[] = [];
  let bestGap = Infinity;
  for (const trait of TRAITS) {
    if (state.asked.includes(trait)) continue;
    const yes = candidates.filter((a) => hasTrait(a, trait)).length;
    if (yes === 0 || yes === candidates.length) continue;
    const gap = Math.abs(candidates.length - 2 * yes);
    if (gap < bestGap) {
      bestGap = gap;
      best = [trait];
    } else if (gap === bestGap) {
      best.push(trait);
    }
  }
  // Ties are broken randomly so the same animal isn't found by the same questions every time.
  return best.length > 0 ? pick(best, rand) : null;
}

export function answer(state: GenieState, trait: Trait, reply: boolean | null): GenieState {
  return {
    ...state,
    asked: [...state.asked, trait],
    answers: reply === null ? state.answers : { ...state.answers, [trait]: reply },
  };
}

/** The genie's guess: a random animal among the most plausible ones. */
export function guess(state: GenieState, rand: Rand = Math.random): string | null {
  const candidates = plausible(state);
  return candidates.length > 0 ? pick(candidates, rand) : null;
}

export function reject(state: GenieState, animal: string): GenieState {
  return { ...state, rejected: [...state.rejected, animal] };
}
