import type { ShopItem } from '../types/gamification';

/** Town shop catalog organized by category */
export const TOWN_ITEMS: ShopItem[] = [
  // 🏠 Buildings (10–80⭐)
  { id: 'house',     emoji: '🏠', nameKey: 'house',     category: 'buildings', cost: 10, animation: 'town-pulse' },
  { id: 'shop',      emoji: '🏪', nameKey: 'shop',      category: 'buildings', cost: 25, animation: 'town-pulse' },
  { id: 'school',    emoji: '🏫', nameKey: 'school',    category: 'buildings', cost: 40, animation: 'town-pulse' },
  { id: 'castle',    emoji: '🏰', nameKey: 'castle',    category: 'buildings', cost: 80, animation: 'town-pulse' },

  // 🌳 Nature (5–20⭐)
  { id: 'tree',      emoji: '🌳', nameKey: 'tree',      category: 'nature', cost: 5,  animation: 'town-sway' },
  { id: 'flower',    emoji: '🌷', nameKey: 'flower',    category: 'nature', cost: 5,  animation: 'town-sway' },
  { id: 'bush',      emoji: '🌿', nameKey: 'bush',      category: 'nature', cost: 8,  animation: 'town-sway' },
  { id: 'pond',      emoji: '💧', nameKey: 'pond',      category: 'nature', cost: 15, animation: 'town-wobble' },

  // 🚗 Vehicles (15–40⭐)
  { id: 'car',       emoji: '🚗', nameKey: 'car',       category: 'vehicles', cost: 15, animation: 'town-bounce' },
  { id: 'truck',     emoji: '🚚', nameKey: 'truck',     category: 'vehicles', cost: 20, animation: 'town-bounce' },
  { id: 'bicycle',   emoji: '🚲', nameKey: 'bicycle',   category: 'vehicles', cost: 15, animation: 'town-bounce' },
  { id: 'boat',      emoji: '⛵', nameKey: 'boat',      category: 'vehicles', cost: 30, animation: 'town-wobble' },

  // 🐾 Animals (8–25⭐)
  { id: 'dog',       emoji: '🐕', nameKey: 'dog',       category: 'animals', cost: 8,  animation: 'town-bounce' },
  { id: 'cat',       emoji: '🐈', nameKey: 'cat',       category: 'animals', cost: 8,  animation: 'town-bounce' },
  { id: 'rabbit',    emoji: '🐇', nameKey: 'rabbit',    category: 'animals', cost: 12, animation: 'town-bounce' },
  { id: 'bird',      emoji: '🐦', nameKey: 'bird',      category: 'animals', cost: 15, animation: 'town-bounce' },

  // 🌟 Decorations (10–30⭐)
  { id: 'fountain',  emoji: '⛲', nameKey: 'fountain',  category: 'decorations', cost: 20, animation: 'town-wobble' },
  { id: 'lamp',      emoji: '🏮', nameKey: 'lamp',      category: 'decorations', cost: 10, animation: 'town-pulse' },
  { id: 'fence',     emoji: '🏗️', nameKey: 'fence',     category: 'decorations', cost: 12 },
  { id: 'flag',      emoji: '🚩', nameKey: 'flag',      category: 'decorations', cost: 15, animation: 'town-sway' },
];

/** Get all items for a given category */
export function getItemsByCategory(category: ShopItem['category']): ShopItem[] {
  return TOWN_ITEMS.filter((item) => item.category === category);
}

/** Look up a shop item by its id */
export function getItemById(id: string): ShopItem | undefined {
  return TOWN_ITEMS.find((item) => item.id === id);
}

/** All category metadata for the shop tabs */
export const SHOP_CATEGORIES = [
  { id: 'buildings'    as const, emoji: '🏠', nameKey: 'buildings' },
  { id: 'nature'       as const, emoji: '🌳', nameKey: 'nature' },
  { id: 'vehicles'     as const, emoji: '🚗', nameKey: 'vehicles' },
  { id: 'animals'      as const, emoji: '🐾', nameKey: 'animals' },
  { id: 'decorations'  as const, emoji: '🌟', nameKey: 'decorations' },
] as const;
