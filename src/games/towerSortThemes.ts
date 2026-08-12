export interface TowerSortTheme {
  id: string;
  nameEmoji: string;
  emojis: string[];
  bgGradient: string;
}

export const TOWER_SORT_THEMES: TowerSortTheme[] = [
  {
    id: 'animals',
    nameEmoji: '🐶',
    emojis: ['🐶', '🐱', '🐼', '🦊', '🐸', '🐰'],
    bgGradient: 'from-emerald-50 via-green-100 to-teal-50',
  },
  {
    id: 'fruits',
    nameEmoji: '🍎',
    emojis: ['🍎', '🍌', '🍇', '🍉', '🍓', '🍍'],
    bgGradient: 'from-rose-50 via-pink-100 to-orange-50',
  },
  {
    id: 'space',
    nameEmoji: '🚀',
    emojis: ['🚀', '🪐', '⭐', '☄️', '👽', '🛸'],
    bgGradient: 'from-slate-900 via-indigo-950 to-slate-900',
  },
  {
    id: 'ocean',
    nameEmoji: '🐠',
    emojis: ['🐠', '🐬', '🐙', '🦀', '🐳', '🦈'],
    bgGradient: 'from-sky-100 via-cyan-100 to-blue-200',
  },
];
