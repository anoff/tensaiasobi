import type { GameDifficulty } from '../types/game';

const SNACK_EMOJIS = ['🍓', '🍪', '🍇', '🍩', '🍒', '🥕', '🧀', '🍎'];

/** Location where a snack currently sits: the shared basket, a friend's plate index, or the leftover basket. */
export type SnackLocation = 'basket' | 'leftover' | number;

export interface Snack {
  id: number;
  location: SnackLocation;
}

export interface FairShareRound {
  friends: number;
  perFriend: number;
  hasLeftover: boolean;
  leftoverCount: number;
  totalSnacks: number;
  snackEmoji: string;
}

export const STARS_BY_DIFFICULTY: Record<GameDifficulty, 1 | 2 | 3> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

function randomInt(min: number, max: number): number {
  // Inclusive of both min and max.
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Generates a round with a friend count and snack quantities appropriate for
 * the given difficulty. Every round (aside from an intentional hard-mode
 * leftover) can be shared perfectly evenly: totalSnacks = friends * perFriend
 * (+ leftoverCount for hard-mode rounds that include a leftover basket).
 */
export function generateRound(difficulty: GameDifficulty): FairShareRound {
  const snackEmoji = SNACK_EMOJIS[Math.floor(Math.random() * SNACK_EMOJIS.length)];

  if (difficulty === 'easy') {
    // Share 2-6 snacks equally between two friends.
    const friends = 2;
    const perFriend = randomInt(1, 3);
    return { friends, perFriend, hasLeftover: false, leftoverCount: 0, totalSnacks: friends * perFriend, snackEmoji };
  }

  if (difficulty === 'medium') {
    // Share up to 12 snacks equally between two or three friends.
    const friends = randomInt(2, 3);
    const maxPerFriend = Math.floor(12 / friends);
    const perFriend = randomInt(1, maxPerFriend);
    return { friends, perFriend, hasLeftover: false, leftoverCount: 0, totalSnacks: friends * perFriend, snackEmoji };
  }

  // Hard: share up to 20 snacks equally between three or four friends,
  // optionally with one explicitly labeled leftover basket.
  const friends = randomInt(3, 4);
  const hasLeftover = Math.random() < 0.4;
  const leftoverCount = hasLeftover ? randomInt(1, friends - 1) : 0;
  const maxPerFriend = Math.max(1, Math.floor((20 - leftoverCount) / friends));
  const perFriend = randomInt(1, maxPerFriend);
  const totalSnacks = friends * perFriend + leftoverCount;
  return { friends, perFriend, hasLeftover, leftoverCount, totalSnacks, snackEmoji };
}

export function createSnacks(round: FairShareRound): Snack[] {
  return Array.from({ length: round.totalSnacks }, (_, id) => ({ id, location: 'basket' as SnackLocation }));
}

/** Counts snacks per location and reports whether the round is fully (and correctly) solved. */
export function evaluate(snacks: Snack[], round: FairShareRound) {
  const inBasket = snacks.filter((s) => s.location === 'basket').length;
  const friendCounts = Array.from({ length: round.friends }, (_, i) =>
    snacks.filter((s) => s.location === i).length
  );

  if (inBasket > 0) {
    return { allPlaced: false, solved: false, pulseFriends: new Set<number>() };
  }

  const pulseFriends = new Set<number>();
  friendCounts.forEach((count, i) => {
    if (count !== round.perFriend) pulseFriends.add(i);
  });

  const solved = pulseFriends.size === 0 && round.perFriend > 0;

  return { allPlaced: true, solved, pulseFriends };
}
