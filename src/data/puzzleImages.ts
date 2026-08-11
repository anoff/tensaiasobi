export interface PuzzleImage {
  id: string;
  nameKey: string;
  emoji: string;
  src: string;
}

export const PUZZLE_IMAGES: PuzzleImage[] = [
  { id: 'rainbow', nameKey: 'rainbow', emoji: '🌈', src: '/puzzles/rainbow.svg' },
  { id: 'space', nameKey: 'space', emoji: '🚀', src: '/puzzles/space.svg' },
  { id: 'dino', nameKey: 'dino', emoji: '🦕', src: '/puzzles/dino.svg' },
  { id: 'ocean', nameKey: 'ocean', emoji: '🐙', src: '/puzzles/ocean.svg' },
  { id: 'forest', nameKey: 'forest', emoji: '🐻', src: '/puzzles/forest.svg' }
];
