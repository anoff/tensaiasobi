import { describe, expect, it } from 'vitest';
import { couponLabel, type Coupon } from './gamification';

const names = { iceCream: 'Ice Cream' };

describe('couponLabel', () => {
  it('prefers a custom name over the translation key', () => {
    const coupon: Coupon = {
      id: 'custom_1',
      emoji: '🛝',
      nameKey: '',
      customName: 'Playground time',
      isCustom: true,
      enabled: true,
      rewardSize: 'small',
      earnedCount: 0,
    };
    expect(couponLabel(coupon, names)).toBe('Playground time');
  });

  it('falls back to the locale map for built-in coupons', () => {
    const coupon: Coupon = {
      id: 'ice_cream',
      emoji: '🍦',
      nameKey: 'iceCream',
      enabled: true,
      rewardSize: 'small',
      earnedCount: 0,
    };
    expect(couponLabel(coupon, names)).toBe('Ice Cream');
  });
});
