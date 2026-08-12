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

/** How big of a reward a coupon represents, used to suggest a fitting challenge length */
export type CouponRewardSize = 'small' | 'medium' | 'large';

/** Suggested challenge target stars for each reward size */
export const REWARD_SIZE_STAR_TARGETS: Record<CouponRewardSize, number> = {
  small: 5,
  medium: 15,
  large: 30,
};

/** A real-world coupon that can be awarded by a parent, e.g. via a Challenge */
export interface Coupon {
  id: string;
  emoji: string;
  nameKey: string;
  /** Whether this coupon is available to be selected/awarded */
  enabled: boolean;
  /** How big of a reward this coupon is, used to suggest challenge target stars */
  rewardSize: CouponRewardSize;
  /** How many times this coupon has been earned so far */
  earnedCount: number;
  /** Timestamp of the most recent time this coupon was earned, if any */
  lastEarnedAt?: number;
}

/** Default size of the town grid */
export const TOWN_GRID_SIZE = 6;

/** Create an empty town grid */
export function createEmptyGrid(): (TownCell | null)[][] {
  return Array.from({ length: TOWN_GRID_SIZE }, () =>
    Array.from({ length: TOWN_GRID_SIZE }, () => null)
  );
}
