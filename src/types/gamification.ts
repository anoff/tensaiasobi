/** Shared types for the gamification system */

/** How big of a reward a coupon represents, used to suggest a fitting challenge length */
export type CouponRewardSize = 'small' | 'medium' | 'large';

/** Suggested challenge target stars for each reward size */
export const REWARD_SIZE_STAR_TARGETS: Record<CouponRewardSize, number> = {
  small: 5,
  medium: 15,
  large: 30,
};

/** A real-world coupon that can be awarded by a parent, e.g. via a Challenge */
export type CouponNameKey = 'iceCream' | 'movieNight' | 'newToy' | 'gummyBear' | 'zoo' | 'gaming';

export interface Coupon {
  id: string;
  emoji: string;
  nameKey: CouponNameKey | '';
  /** Parent-authored label; wins over `nameKey` when set */
  customName?: string;
  isCustom?: boolean;
  /** Whether this coupon is available to be selected/awarded */
  enabled: boolean;
  /** How big of a reward this coupon is, used to suggest challenge target stars */
  rewardSize: CouponRewardSize;
  /** How many times this coupon has been earned so far */
  earnedCount: number;
  /** Timestamp of the most recent time this coupon was earned, if any */
  lastEarnedAt?: number;
}

export function couponLabel(coupon: Coupon, names: Record<CouponNameKey, string>): string {
  if (coupon.customName) return coupon.customName;
  if (!coupon.nameKey) return coupon.id;
  return names[coupon.nameKey];
}
