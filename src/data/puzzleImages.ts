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
  { id: 'forest', nameKey: 'forest', emoji: '🌲', src: `${base}/puzzles/forest.svg` },
  { id: 'bear', nameKey: 'bear', emoji: '🐻', src: `${base}/puzzles/bear.svg` },
  { id: 'car', nameKey: 'car', emoji: '🚗', src: `${base}/puzzles/car.svg` },
  { id: 'dollhouse', nameKey: 'dollhouse', emoji: '🏠', src: `${base}/puzzles/dollhouse.svg` },
  { id: 'kabutomushi', nameKey: 'kabutomushi', emoji: '🪲', src: `${base}/puzzles/kabutomushi.svg` },
  { id: 'kites', nameKey: 'kites', emoji: '🪁', src: `${base}/puzzles/kites.svg` },
  { id: 'mermaid', nameKey: 'mermaid', emoji: '🧜', src: `${base}/puzzles/mermaid.svg` },
  { id: 'playground', nameKey: 'playground', emoji: '🛝', src: `${base}/puzzles/playground.svg` },
  { id: 'plush', nameKey: 'plush', emoji: '🧸', src: `${base}/puzzles/plush.svg` },
  { id: 'princess', nameKey: 'princess', emoji: '👸', src: `${base}/puzzles/princess.svg` },
  { id: 'robots', nameKey: 'robots', emoji: '🤖', src: `${base}/puzzles/robots.svg` },
  { id: 'teaparty', nameKey: 'teaparty', emoji: '🫖', src: `${base}/puzzles/teaparty.svg` },
];
