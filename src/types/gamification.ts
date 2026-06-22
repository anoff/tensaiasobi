/** Shared types for the gamification system */

/** A single cell in the town grid */
export interface TownCell {
  emoji: string;
  itemId: string;
}

/** The full town grid state persisted in localStorage */
export interface TownGrid {
  cells: (TownCell | null)[][];
}

/** Categories for shop items */
export type ShopCategory = 'buildings' | 'nature' | 'vehicles' | 'animals' | 'decorations';

/** A purchasable item for the town */
export interface ShopItem {
  id: string;
  emoji: string;
  nameKey: string;
  category: ShopCategory;
  cost: number;
  /** CSS animation class applied to this item in the town grid */
  animation?: string;
}

/** A redeemable real-world voucher */
export interface Voucher {
  id: string;
  emoji: string;
  nameKey: string;
  /** Cost set by parent (defaults provided) */
  cost: number;
  /** Whether this voucher is available to the child */
  enabled: boolean;
  /** Timestamp of last redemption, or undefined if never redeemed */
  redeemedAt?: number;
}

/** Star-earn event emitted by games */
export interface StarEarnEvent {
  amount: number;
  source: string;
}

/** Default size of the town grid */
export const TOWN_GRID_SIZE = 6;

/** Create an empty town grid */
export function createEmptyGrid(): (TownCell | null)[][] {
  return Array.from({ length: TOWN_GRID_SIZE }, () =>
    Array.from({ length: TOWN_GRID_SIZE }, () => null)
  );
}
