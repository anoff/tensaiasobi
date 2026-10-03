import { describe, expect, it } from 'vitest';
import { buildShuffledDeck, deckOrder, drawFromPile, findMatch, type DobbleCard } from './emojiMatchDeck';
import type { GameDifficulty } from '../types/game';

describe('Emoji Match deck', () => {
  it('every two cards of a deck share exactly one emoji', () => {
    for (const level of ['easy', 'medium', 'hard'] as GameDifficulty[]) {
      const deck = buildShuffledDeck(deckOrder(level));
      for (let i = 0; i < deck.length; i++) {
        for (let j = i + 1; j < deck.length; j++) {
          const a = new Set(deck[i].emojis.map((e) => e.emoji));
          expect(deck[j].emojis.filter((e) => a.has(e.emoji))).toHaveLength(1);
        }
      }
    }
  });

  it('refills an empty pile from the same deck, so the new card still matches', () => {
    const deck = buildShuffledDeck(deckOrder('easy'));
    let pile: DobbleCard[] = deck.slice(2);
    let [a, b] = [deck[0], deck[1]];
    // Far more draws than the 21-card deck holds.
    for (let i = 0; i < 200; i++) {
      const drawn = drawFromPile(pile, deck, [a, b]);
      pile = drawn.pile;
      expect(drawn.card.id).not.toBe(a.id);
      expect(drawn.card.id).not.toBe(b.id);
      expect(findMatch(drawn.card, a)).not.toBe('');
      [a, b] = [drawn.card, a];
    }
  });
});
