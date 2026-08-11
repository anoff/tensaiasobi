export interface PuzzleImage {
  id: string;
  nameKey: string;
  emoji: string;
  src: string;
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export const PUZZLE_IMAGES: PuzzleImage[] = [
  { id: 'rainbow', nameKey: 'rainbow', emoji: '🌈', src: `${base}/puzzles/rainbow.svg` },
  { id: 'space', nameKey: 'space', emoji: '🚀', src: `${base}/puzzles/space.svg` },
  { id: 'dino', nameKey: 'dino', emoji: '🦕', src: `${base}/puzzles/dino.svg` },
  { id: 'ocean', nameKey: 'ocean', emoji: '🐙', src: `${base}/puzzles/ocean.svg` },
  { id: 'forest', nameKey: 'forest', emoji: '🐻', src: `${base}/puzzles/forest.svg` }
];
