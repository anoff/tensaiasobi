import { shuffle } from '../utils/shuffle';
import type { GameDifficulty } from '../types/game';

// Precomputed Dobble card index decks (one shared symbol per pair of cards)
const DECK_EASY: number[][] = [[16,17,18,19,20],[0,1,2,3,20],[4,5,6,7,20],[8,9,10,11,20],[12,13,14,15,20],[0,4,8,12,16],[1,5,9,13,16],[2,6,10,14,16],[3,7,11,15,16],[0,5,10,15,17],[1,4,11,14,17],[2,7,8,13,17],[3,6,9,12,17],[0,6,11,13,18],[1,7,10,12,18],[2,4,9,15,18],[3,5,8,14,18],[0,7,9,14,19],[1,6,8,15,19],[2,5,11,12,19],[3,4,10,13,19]];
const DECK_MEDIUM: number[][] = [[25,26,27,28,29,30],[0,1,2,3,4,30],[5,6,7,8,9,30],[10,11,12,13,14,30],[15,16,17,18,19,30],[20,21,22,23,24,30],[0,5,10,15,20,25],[1,6,11,16,21,25],[2,7,12,17,22,25],[3,8,13,18,23,25],[4,9,14,19,24,25],[0,6,12,18,24,26],[1,7,13,19,20,26],[2,8,14,15,21,26],[3,9,10,16,22,26],[4,5,11,17,23,26],[0,7,14,16,23,27],[1,8,10,17,24,27],[2,9,11,18,20,27],[3,5,12,19,21,27],[4,6,13,15,22,27],[0,8,11,19,22,28],[1,9,12,15,23,28],[2,5,13,16,24,28],[3,6,14,17,20,28],[4,7,10,18,21,28],[0,9,13,17,21,29],[1,5,14,18,22,29],[2,6,10,19,23,29],[3,7,11,15,24,29],[4,8,12,16,20,29]];
const DECK_HARD: number[][] = [[49,50,51,52,53,54,55,56],[0,1,2,3,4,5,6,56],[7,8,9,10,11,12,13,56],[14,15,16,17,18,19,20,56],[21,22,23,24,25,26,27,56],[28,29,30,31,32,33,34,56],[35,36,37,38,39,40,41,56],[42,43,44,45,46,47,48,56],[0,7,14,21,28,35,42,49],[1,8,15,22,29,36,43,49],[2,9,16,23,30,37,44,49],[3,10,17,24,31,38,45,49],[4,11,18,25,32,39,46,49],[5,12,19,26,33,40,47,49],[6,13,20,27,34,41,48,49],[0,8,16,24,32,40,48,50],[1,9,17,25,33,41,42,50],[2,10,18,26,34,35,43,50],[3,11,19,27,28,36,44,50],[4,12,20,21,29,37,45,50],[5,13,14,22,30,38,46,50],[6,7,15,23,31,39,47,50],[0,9,18,27,29,38,47,51],[1,10,19,21,30,39,48,51],[2,11,20,22,31,40,42,51],[3,12,14,23,32,41,43,51],[4,13,15,24,33,35,44,51],[5,7,16,25,34,36,45,51],[6,8,17,26,28,37,46,51],[0,10,20,23,33,36,46,52],[1,11,14,24,34,37,47,52],[2,12,15,25,28,38,48,52],[3,13,16,26,29,39,42,52],[4,7,17,27,30,40,43,52],[5,8,18,21,31,41,44,52],[6,9,19,22,32,35,45,52],[0,11,15,26,30,41,45,53],[1,12,16,27,31,35,46,53],[2,13,17,21,32,36,47,53],[3,7,18,22,33,37,48,53],[4,8,19,23,34,38,42,53],[5,9,20,24,28,39,43,53],[6,10,14,25,29,40,44,53],[0,12,17,22,34,39,44,54],[1,13,18,23,28,40,45,54],[2,7,19,24,29,41,46,54],[3,8,20,25,30,35,47,54],[4,9,14,26,31,36,48,54],[5,10,15,27,32,37,42,54],[6,11,16,21,33,38,43,54],[0,13,19,25,31,37,43,55],[1,7,20,26,32,38,44,55],[2,8,14,27,33,39,45,55],[3,9,15,21,34,40,46,55],[4,10,16,22,28,41,47,55],[5,11,17,23,29,35,48,55],[6,12,18,24,30,36,42,55]];

function generateDobbleDeck(q: number): number[][] {
  if (q === 4) return DECK_EASY;
  if (q === 5) return DECK_MEDIUM;
  return DECK_HARD;
}
// Child-friendly emojis for play
const EMOJI_POOL = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🦆', '🦉', '🐙',
  '🐝', '🐞', '🦋', '🦖', '🦕', '🐢', '🐠', '🐬', '🦄', '🍎', '🍌', '🍉', '🍇', '🍓', '🍒', '🍍', '🍑', '🍊', '🍋', '🥝',
  '🥑', '🥕', '🌽', '🍕', '🍔', '🍟', '🍩', '🍪', '🧁', '🍿', '🍦', '🚗', '🚓', '🚒', '🚜', '🚲', '🚀', '🛸', '✈️', '🚢',
  '🚂', '🚁', '🎈', '🎁', '🎨', '🎸', '👑', '🔑', '🔔', '💎', '⚽', '🏀', '🎾', '🎲', '🧩', '🧸', '🕶️', '❤️', '⭐', '🌈',
  '🔥', '⚡', '🍀', '☀️', '🌙', '☁️', '❄️', '🌲', '🌸', '🍄', '👻', '🤖'
];

export interface CardEmoji {
  emoji: string;
  x: number;      // % offset from center
  y: number;      // % offset from center
  rotation: number; // degrees
  scale: number;    // scale factor
}

export interface DobbleCard {
  id: number;
  emojis: CardEmoji[];
}

function getCardLayout(emojis: string[], q: number): CardEmoji[] {
  const layout: CardEmoji[] = [];
  const numEmojis = q + 1;


  layout.push({
    emoji: emojis[0],
    x: (Math.random() - 0.5) * 6, // slight center jitter (+/- 3%)
    y: (Math.random() - 0.5) * 6,
    rotation: Math.floor(Math.random() * 360),
    scale: q === 4 ? 0.95 + Math.random() * 0.15 : 0.85 + Math.random() * 0.35 // big glyphs on easy, capped so neighbours never cover each other
  });


  const numOuter = numEmojis - 1;
  const radius = q === 4 ? 30 : q === 5 ? 31 : 33; // base radius in %: room around the centre emoji, no overflow

  for (let i = 0; i < numOuter; i++) {
    const baseAngle = (2 * Math.PI * i) / numOuter;

    const angleJitter = (Math.random() - 0.5) * 0.22; // ~ +/- 6 degrees
    const angle = baseAngle + angleJitter;

    const radialJitter = (Math.random() - 0.5) * 4; // +/- 2%
    const r = radius + radialJitter;

    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;

    layout.push({
      emoji: emojis[i + 1],
      x,
      y,
      rotation: Math.floor(Math.random() * 360),
      scale: q === 4 ? 0.95 + Math.random() * 0.15 : 0.85 + Math.random() * 0.35 // big glyphs on easy, capped so neighbours never cover each other
    });
  }

  // Shuffle order to avoid DOM z-index bias
  return shuffle(layout);
}

export function buildShuffledDeck(q: number): DobbleCard[] {
  const indicesDeck = generateDobbleDeck(q);
  const numUniqueEmojis = q * q + q + 1;
  const chosenEmojis = shuffle(EMOJI_POOL).slice(0, numUniqueEmojis);

  const cards: DobbleCard[] = indicesDeck.map((indices, cardId) => {
    const cardEmojis = indices.map((idx) => chosenEmojis[idx]);
    return {
      id: cardId,
      emojis: getCardLayout(cardEmojis, q)
    };
  });

  return shuffle(cards);
}


export function findMatch(cardA: DobbleCard, cardB: DobbleCard): string {
  const setA = new Set(cardA.emojis.map(e => e.emoji));
  for (const item of cardB.emojis) {
    if (setA.has(item.emoji)) {
      return item.emoji;
    }
  }
  return '';
}

/** Card size per level: q + 1 emojis per card, q² + q + 1 cards in a deck. */
export function deckOrder(diff: GameDifficulty): number {
  if (diff === 'easy') return 4; // 5 emojis
  if (diff === 'medium') return 5; // 6 emojis
  return 7; // 8 emojis
}

/**
 * Next card from the draw pile. When the pile is empty it is refilled from the
 * SAME deck (minus the cards on the table): only cards of one deck are
 * guaranteed to share exactly one emoji, so building a fresh deck here would
 * deal an unsolvable card.
 */
export function drawFromPile(
  pile: DobbleCard[],
  fullDeck: DobbleCard[],
  onTable: DobbleCard[],
): { card: DobbleCard; pile: DobbleCard[] } {
  const source = pile.length > 0 ? pile : shuffle(fullDeck.filter((c) => !onTable.some((t) => t.id === c.id)));
  return { card: source[0], pile: source.slice(1) };
}
