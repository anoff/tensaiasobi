import { useState, useCallback } from 'react';
import type { Coupon } from '../types/gamification';

const STORAGE_KEY = 'gamification_coupons';


const DEFAULT_COUPONS: Coupon[] = [
  { id: 'gummy_bear',   emoji: '🍬', nameKey: 'gummyBear',  enabled: true, earnedCount: 0 },
  { id: 'ice_cream',    emoji: '🍦', nameKey: 'iceCream',   enabled: true, earnedCount: 0 },
  { id: 'movie_night',  emoji: '🎬', nameKey: 'movieNight', enabled: true, earnedCount: 0 },
  { id: 'new_toy',      emoji: '🧸', nameKey: 'newToy',     enabled: true, earnedCount: 0 },
  { id: 'gaming',       emoji: '🎮', nameKey: 'gaming',     enabled: true, earnedCount: 0 },
  { id: 'zoo',          emoji: '🦁', nameKey: 'zoo',        enabled: true, earnedCount: 0 },
];

function loadCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Coupon[];

      return DEFAULT_COUPONS.map((def) => {
        const found = saved.find((c) => c.id === def.id);
        return found
          ? { ...def, enabled: found.enabled, earnedCount: found.earnedCount ?? 0, lastEarnedAt: found.lastEarnedAt }
          : def;
      });
    }
    return DEFAULT_COUPONS.map((c) => ({ ...c }));
  } catch {
    return DEFAULT_COUPONS.map((c) => ({ ...c }));
  }
}

function saveCoupons(coupons: Coupon[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(coupons));
  } catch (e) {
    console.error('Error saving coupons', e);
  }
}

export interface UseCouponsReturn {
  coupons: Coupon[];
  toggleCoupon: (id: string) => void;
  awardCoupon: (id: string) => boolean;
  resetCoupons: () => void;
}

export function useCoupons(): UseCouponsReturn {
  const [coupons, setCoupons] = useState<Coupon[]>(loadCoupons);

  const toggleCoupon = useCallback((id: string) => {
    setCoupons((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
      saveCoupons(next);
      return next;
    });
  }, []);

  const awardCoupon = useCallback((id: string): boolean => {
    if (!id) return false;
    const coupon = coupons.find((c) => c.id === id);
    if (!coupon || !coupon.enabled) return false;

    setCoupons((prev) => {
      const next = prev.map((c) =>
        c.id === id ? { ...c, earnedCount: c.earnedCount + 1, lastEarnedAt: Date.now() } : c
      );
      saveCoupons(next);
      return next;
    });
    return true;
  }, [coupons]);

  const resetCoupons = useCallback(() => {
    const fresh = DEFAULT_COUPONS.map((c) => ({ ...c }));
    setCoupons(fresh);
    saveCoupons(fresh);
  }, []);

  return { coupons, toggleCoupon, awardCoupon, resetCoupons };
}
